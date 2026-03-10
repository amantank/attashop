import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.ADMIN_BOT_TOKEN || '';
const API = process.env.BACKEND_URL || 'http://backend:5000';

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 },
  },
});

// ── Wizard state ──────────────────────────────────────────
type Step = { step: string; data: Record<string, unknown> };
const wizards: Map<number, Step> = new Map();

function menu(): TelegramBot.SendMessageOptions {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '📦 List Products' }, { text: '➕ Add Product' }],
        [{ text: '✏️ Update Product' }, { text: '🗑️ Delete Product' }],
        [{ text: '💰 Update Price' }, { text: '📊 Update Stock' }],
        [{ text: '🚚 Delivery Areas' }, { text: '💸 Delivery Charge' }],
        [{ text: '⏰ Delivery Slots' }, { text: '📈 Analytics' }],
      ],
      resize_keyboard: true,
    },
  };
}

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, `👋 Welcome to *AtlaShop Admin Bot*!\n\nUse the menu below to manage your shop.`, { parse_mode: 'Markdown', ...menu() });
});

bot.onText(/\/help/, msg => {
  bot.sendMessage(msg.chat.id, [
    '*Available Commands:*',
    '/list\\_products – List all products',
    '/add\\_product – Add a new product',
    '/update\\_product \\<id\\> – Update product',
    '/delete\\_product \\<id\\> – Delete product',
    '/update\\_price \\<id\\> \\<price\\> – Update price',
    '/update\\_stock \\<id\\> \\<qty\\> – Update stock',
    '/set\\_delivery\\_area – Manage delivery pincodes',
    '/set\\_delivery\\_charge – Configure delivery charges',
    '/set\\_delivery\\_slots – Manage delivery slots',
    `/analytics – View today\'s analytics`,
  ].join('\n'), { parse_mode: 'Markdown' });
});

// ── LIST PRODUCTS ────────────────────────────────────────
bot.onText(/\/list_products|📦 List Products/, async msg => {
  try {
    const { data } = await axios.get(`${API}/api/products?limit=10`);
    if (!data.products.length) { bot.sendMessage(msg.chat.id, 'No products found.'); return; }
    const text = data.products.map((p: Record<string, unknown>) =>
      `📦 *${p.name}*\n   ID: \`${p.productId}\`\n   Price: ₹${p.finalPrice} | Stock: ${p.stock}\n   Category: ${p.categoryId}`
    ).join('\n\n');
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  } catch { bot.sendMessage(msg.chat.id, '❌ Failed to fetch products.'); }
});

// ── QUICK ADD PRODUCT (Shorthand) ────────────────────────
bot.onText(/^\/add(?:$|\s+([\s\S]*))/, async (msg, match) => {
  const input = match?.[1]?.trim();
  if (!input) {
    bot.sendMessage(msg.chat.id, `⚠️ *Quick Add Format:*\n\n/add\nName: <name>\nCategory: <category>\nPrice: <price>\nPack: <comma list>\nStock: <stock>\n<Specific>: <Value>\n...`, { parse_mode: 'Markdown' });
    return;
  }
  
  try {
    const lines = input.split('\n');
    const data: Record<string, string> = {};
    for (const line of lines) {
      if (!line.includes(':')) continue;
      const [k, ...v] = line.split(':');
      data[k.trim().toLowerCase()] = v.join(':').trim();
    }
    
    // Map to payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      name: data.name,
      categoryId: data.category,
      price: Number(data.price || 0),
      packSizes: data.pack ? data.pack.split(',').map(s=>Number(s.trim())) : [],
      stock: Number(data.stock || 0),
      specifications: {}
    };

    if (data.description) payload.description = data.description;
    
    // Assign specific properties to specifications
    const reserved = ['name', 'category', 'price', 'pack', 'stock', 'description'];
    for (const [key, val] of Object.entries(data)) {
      if (!reserved.includes(key)) {
        payload.specifications[key] = val;
      }
    }

    const res = await axios.post(`${API}/api/products`, payload);
    bot.sendMessage(msg.chat.id, `✅ *Product Quick Added!*\n\nID: \`${res.data.product.productId}\`\nName: ${res.data.product.name}`, { parse_mode: 'Markdown' });
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Failed to parse/add product: ${(e as Error).message}`);
  }
});

// ── ADD PRODUCT WIZARD ────────────────────────────────────
bot.onText(/\/add_product|➕ Add Product/, msg => {
  bot.sendMessage(msg.chat.id, '📝 *Add New Product*\n\nStep 1/11: Send product *image* (or type /skip):', { parse_mode: 'Markdown' });
});

// ── UPDATE PRODUCT ─────────────────────────────────────
bot.onText(/\/update_product (.+)/, async (msg, match) => {
  const id = match![1].trim();
  wizards.set(msg.chat.id, { step: 'update_field', data: { productId: id } });
  bot.sendMessage(msg.chat.id, `✏️ Editing product \`${id}\`\n\nWhat would you like to update?`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Name', callback_data: `upd:name:${id}` }, { text: 'Price', callback_data: `upd:price:${id}` }],
        [{ text: 'Stock', callback_data: `upd:stock:${id}` }, { text: 'Discount', callback_data: `upd:discount:${id}` }],
        [{ text: 'Description', callback_data: `upd:description:${id}` }, { text: 'Image', callback_data: `upd:image:${id}` }],
      ],
    },
  });
});

// ── DELETE PRODUCT ─────────────────────────────────────
bot.onText(/\/delete_product (.+)/, async (msg, match) => {
  const id = match![1].trim();
  bot.sendMessage(msg.chat.id, `⚠️ Delete product \`${id}\`?`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Yes, delete', callback_data: `del:${id}` },
        { text: '❌ Cancel', callback_data: 'cancel' },
      ]],
    },
  });
});

// ── UPDATE PRICE (quick) ───────────────────────────────
bot.onText(/\/update_price (.+) (\d+\.?\d*)/, async (msg, match) => {
  const id = match![1].trim();
  const price = parseFloat(match![2]);
  try {
    await axios.put(`${API}/api/products/${id}`, { price, discount: 0 });
    bot.sendMessage(msg.chat.id, `✅ Price updated to ₹${price} for \`${id}\``, { parse_mode: 'Markdown' });
  } catch { bot.sendMessage(msg.chat.id, '❌ Failed to update price.'); }
});

// ── UPDATE STOCK (quick) ───────────────────────────────
bot.onText(/\/update_stock|📊 Update Stock/, msg => {
  wizards.set(msg.chat.id, { step: 'stock_id', data: {} });
  bot.sendMessage(msg.chat.id, '📊 Enter product ID to update stock:');
});

bot.onText(/\/update_stock (.+) (\d+)/, async (msg, match) => {
  const id = match![1].trim();
  const stock = parseInt(match![2]);
  try {
    await axios.patch(`${API}/api/products/${id}/stock`, { stock });
    bot.sendMessage(msg.chat.id, `✅ Stock updated to ${stock} for \`${id}\``, { parse_mode: 'Markdown' });
  } catch { bot.sendMessage(msg.chat.id, '❌ Failed to update stock.'); }
});

// ── DELIVERY AREAS ─────────────────────────────────────
bot.onText(/\/set_delivery_area|🚚 Delivery Areas/, async msg => {
  const { data } = await axios.get(`${API}/api/delivery/areas`);
  const areas = data.areas.map((a: Record<string, string>) => `• ${a.pincode} – ${a.name || 'Area'}`).join('\n') || 'None set';
  bot.sendMessage(msg.chat.id, `📍 *Active Delivery Areas:*\n${areas}\n\nOptions:`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Add Pincode', callback_data: 'area:add' }],
        [{ text: '🗑️ Remove Pincode', callback_data: 'area:remove' }],
      ],
    },
  });
});

// ── DELIVERY CHARGE ────────────────────────────────────
bot.onText(/\/set_delivery_charge|💸 Delivery Charge/, msg => {
  wizards.set(msg.chat.id, { step: 'charge_flat', data: {} });
  bot.sendMessage(msg.chat.id, '💸 *Delivery Charge Setup*\n\nEnter flat delivery charge amount (₹):\n_(Enter 0 for free delivery)_', { parse_mode: 'Markdown' });
});

// ── DELIVERY SLOTS ─────────────────────────────────────
bot.onText(/\/set_delivery_slots|⏰ Delivery Slots/, async msg => {
  const { data } = await axios.get(`${API}/api/delivery/slots`);
  const slots = data.slots.map((s: Record<string, unknown>) => `• ${s.label} (max: ${s.maxOrders} orders)`).join('\n') || 'No slots configured';
  bot.sendMessage(msg.chat.id, `⏰ *Delivery Slots:*\n${slots}`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Add Slot', callback_data: 'slot:add' }],
        [{ text: '🗑️ Remove Slot', callback_data: 'slot:list_remove' }],
      ],
    },
  });
});

// ── ANALYTICS ─────────────────────────────────────────
bot.onText(/\/analytics|📈 Analytics/, async msg => {
  try {
    const { data } = await axios.get(`${API}/api/analytics`);
    const a = data.analytics;
    const top = a.topProducts.map((p: Record<string, unknown>, i: number) => `${i + 1}. ${p.name} – ${p.quantity} units`).join('\n');
    const msg_text = [
      '📊 *AtlaShop Analytics*',
      '',
      `📅 *Today:* ${a.today.orders} orders | ₹${a.today.revenue} revenue`,
      `📆 *This Week:* ${a.week.orders} orders | ₹${a.week.revenue} revenue`,
      '',
      `🕐 Pending: ${a.pendingOrders} | ✅ Completed: ${a.completedOrders} | Total: ${a.totalOrders}`,
      '',
      `🏆 *Top Products:*\n${top}`,
    ].join('\n');
    bot.sendMessage(msg.chat.id, msg_text, { parse_mode: 'Markdown' });
  } catch { bot.sendMessage(msg.chat.id, '❌ Failed to fetch analytics.'); }
});

// ── CALLBACK QUERY HANDLER ────────────────────────────────
bot.on('callback_query', async query => {
  const chatId = query.message!.chat.id;
  const d = query.data || '';
  bot.answerCallbackQuery(query.id);

  if (d === 'cancel') { wizards.delete(chatId); bot.sendMessage(chatId, '❌ Cancelled.', menu()); return; }

  // Delete product
  if (d.startsWith('del:')) {
    const id = d.slice(4);
    try {
      await axios.delete(`${API}/api/products/${id}`);
      bot.sendMessage(chatId, `✅ Product \`${id}\` deleted.`, { parse_mode: 'Markdown', ...menu() });
    } catch { bot.sendMessage(chatId, '❌ Delete failed.'); }
    return;
  }

  // Update field
  if (d.startsWith('upd:')) {
    const [, field, id] = d.split(':');
    wizards.set(chatId, { step: `update_value`, data: { productId: id, field } });
    bot.sendMessage(chatId, `Enter new *${field}* for product \`${id}\`:`, { parse_mode: 'Markdown' });
    return;
  }

  // Area management
  if (d === 'area:add') { wizards.set(chatId, { step: 'area_add_pin', data: {} }); bot.sendMessage(chatId, 'Enter pincode to add:'); return; }
  if (d === 'area:remove') { wizards.set(chatId, { step: 'area_remove_pin', data: {} }); bot.sendMessage(chatId, 'Enter pincode to remove:'); return; }

  // Slot management
  if (d === 'slot:add') { wizards.set(chatId, { step: 'slot_label', data: {} }); bot.sendMessage(chatId, '⏰ Enter slot label (e.g. "9AM – 12PM"):'); return; }
  if (d === 'slot:list_remove') {
    const { data } = await axios.get(`${API}/api/delivery/slots`);
    const btns = data.slots.map((s: Record<string, unknown>) => [{ text: `🗑️ ${s.label}`, callback_data: `slot:del:${s.slotId}` }]);
    bot.sendMessage(chatId, 'Select slot to remove:', { reply_markup: { inline_keyboard: btns } });
    return;
  }
  if (d.startsWith('slot:del:')) {
    const slotId = d.slice(9);
    await axios.delete(`${API}/api/delivery/slots/${slotId}`);
    bot.sendMessage(chatId, '✅ Slot removed.', menu());
    return;
  }
});

// ── MESSAGE WIZARD HANDLER ─────────────────────────────────
bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const state = wizards.get(chatId);
  if (!state) return;

  // ── ADD PRODUCT WIZARD STEPS ─────────────────────────
  if (state.step === 'add_image') {
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1];
      try {
        state.data.imageUrl = await bot.getFileLink(photo.file_id);
      } catch (e) {
        state.data.imageUrl = '';
      }
    } else {
      state.data.imageUrl = '';
    }
    state.step = 'add_name';
    bot.sendMessage(chatId, 'Step 2/11: Enter product *name* (e.g. Sharbati Wheat Aata):', { parse_mode: 'Markdown' });
  } else if (state.step === 'add_name') {
    state.data.name = text; state.step = 'add_category';
    bot.sendMessage(chatId, 'Step 3/11: Select *category*:\n1️⃣ Aata\n2️⃣ Rice\n3️⃣ Dal\n4️⃣ Spices\n5️⃣ Oil\n(Type number or name)', { parse_mode: 'Markdown' });
  } else if (state.step === 'add_category') {
    const map: Record<string, string> = { '1': 'Aata', '2': 'Rice', '3': 'Dal', '4': 'Spices', '5': 'Oil' };
    state.data.categoryId = map[text] || text;
    state.step = 'add_desc';
    bot.sendMessage(chatId, 'Step 4/11: Enter short *description*:', { parse_mode: 'Markdown' });
  } else if (state.step === 'add_desc') {
    state.data.description = text; state.step = 'add_price';
    bot.sendMessage(chatId, 'Step 5/11: Enter base *price* (₹):', { parse_mode: 'Markdown' });
  } else if (state.step === 'add_price') {
    state.data.price = parseFloat(text); state.step = 'add_packs';
    bot.sendMessage(chatId, 'Step 6/11: Enter *pack sizes* (e.g. 1,5,10) or type "Loose":', { parse_mode: 'Markdown' });
  } else if (state.step === 'add_packs') {
    state.data.packSizes = text; state.step = 'add_stock';
    bot.sendMessage(chatId, 'Step 7/11: Enter initial *stock quantity* (in kg):', { parse_mode: 'Markdown' });
  } else if (state.step === 'add_stock') {
    state.data.stock = parseInt(text);
    state.step = 'add_min_delivery';
    bot.sendMessage(chatId, 'Step 8/11: Minimum weight (kg) for Home Delivery? (Enter 0 if no limit)');
  } else if (state.step === 'add_min_delivery') {
    state.data.minHomeDeliveryQuantity = parseInt(text) || 0;
    state.step = 'add_specs';
    bot.sendMessage(chatId, 'Step 9/11: Enter *Specifications (English)* (Format: "Key: Value", new line for each) or type /skip:', { parse_mode: 'Markdown' });
  }
  
  else if (state.step === 'add_specs') {
    state.data.specs = text; state.step = 'add_specs_hi';
    bot.sendMessage(chatId, 'Step 10/11: Enter *Specifications (Hindi)* (Format: "Key: Value", new line for each) or type /skip:', { parse_mode: 'Markdown' });
  }

  else if (state.step === 'add_specs_hi') {
    state.data.specsHi = text; state.step = 'add_preview';
    bot.sendMessage(chatId, `Step 11/11: *Preview*\nName: ${state.data.name}\nPrice: ₹${state.data.price}\nPacks: ${state.data.packSizes}\nStock: ${state.data.stock}\nMin Delivery: ${state.data.minHomeDeliveryQuantity}kg\n\nType "yes" to confirm or "cancel".`, { parse_mode: 'Markdown' });
  }
  
  // Final Save
  else if (state.step === 'add_preview') {
    if (text.toLowerCase() === 'cancel') {
      wizards.delete(chatId);
      bot.sendMessage(chatId, '❌ Cancelled product addition.', menu());
      return;
    }
    
    const p = state.data.price as number;
    const cat = state.data.categoryId as string;
    
    // Build specs
    const parseMeta = (str: string) => {
      if (!str || str.toLowerCase() === '/skip') return {};
      const obj: Record<string, string> = {};
      str.split('\n').forEach(l => {
        const parts = l.split(':');
        const k = parts.shift()?.trim();
        const v = parts.join(':').trim();
        if (k && v) obj[k] = v;
      });
      return obj;
    };

    const specs = parseMeta(state.data.specs as string);
    const specsHi = parseMeta(state.data.specsHi as string);

    const payload = {
      name: state.data.name,
      description: state.data.description,
      categoryId: cat,
      price: p,
      packSizes: (state.data.packSizes as string).split(',').map(s=>Number(s.trim())),
      stock: state.data.stock,
      imageUrl: state.data.imageUrl || '',
      specifications: specs,
      specificationsHi: specsHi,
      minHomeDeliveryQuantity: state.data.minHomeDeliveryQuantity
    };
    
    try {
      const { data } = await axios.post(`${API}/api/products`, payload);
      bot.sendMessage(chatId, `✅ *Product Created!*\n\nID: \`${data.product.productId}\`\nName: ${data.product.name}\nSlug: ${data.product.slug}`, { parse_mode: 'Markdown', ...menu() });
    } catch (e) {
      bot.sendMessage(chatId, `❌ Failed to create product: ${(e as Error).message}`, menu());
    }
    wizards.delete(chatId);

  // ── UPDATE VALUE ──
  } else if (state.step === 'update_value') {
    const { productId, field } = state.data;
    const payload: Record<string, unknown> = { [field as string]: text };
    if (field === 'price') payload.price = parseFloat(text);
    try {
      await axios.put(`${API}/api/products/${productId}`, payload);
      bot.sendMessage(chatId, `✅ ${field} updated for \`${productId}\`.`, { parse_mode: 'Markdown', ...menu() });
    } catch { bot.sendMessage(chatId, '❌ Update failed.', menu()); }
    wizards.delete(chatId);

  // ── STOCK WIZARD ──
  } else if (state.step === 'stock_id') {
    state.data.productId = text; state.step = 'stock_qty';
    bot.sendMessage(chatId, 'Enter new stock quantity:');
  } else if (state.step === 'stock_qty') {
    try {
      await axios.patch(`${API}/api/products/${state.data.productId}/stock`, { stock: parseInt(text) });
      bot.sendMessage(chatId, `✅ Stock updated to ${text}.`, menu());
    } catch { bot.sendMessage(chatId, '❌ Failed.', menu()); }
    wizards.delete(chatId);

  // ── DELIVERY CHARGE ──
  } else if (state.step === 'charge_flat') {
    state.data.flatCharge = parseFloat(text); state.step = 'charge_free';
    bot.sendMessage(chatId, 'Enter minimum order amount for *FREE delivery* (₹):', { parse_mode: 'Markdown' });
  } else if (state.step === 'charge_free') {
    try {
      await axios.post(`${API}/api/delivery/charges`, {
        type: 'flat',
        flatCharge: state.data.flatCharge,
        freeAboveAmount: parseFloat(text),
      });
      bot.sendMessage(chatId, `✅ Delivery charge set: ₹${state.data.flatCharge} (free above ₹${text}).`, menu());
    } catch { bot.sendMessage(chatId, '❌ Failed.', menu()); }
    wizards.delete(chatId);

  // ── AREA WIZARD ──
  } else if (state.step === 'area_add_pin') {
    const [pincode, name = ''] = text.split(' ');
    try {
      await axios.post(`${API}/api/delivery/areas`, { pincode, name });
      bot.sendMessage(chatId, `✅ Pincode ${pincode} added to delivery areas.`, menu());
    } catch { bot.sendMessage(chatId, '❌ Failed.', menu()); }
    wizards.delete(chatId);
  } else if (state.step === 'area_remove_pin') {
    try {
      await axios.delete(`${API}/api/delivery/areas/${text.trim()}`);
      bot.sendMessage(chatId, `✅ Pincode ${text} removed.`, menu());
    } catch { bot.sendMessage(chatId, '❌ Failed.', menu()); }
    wizards.delete(chatId);

  // ── SLOT WIZARD ──
  } else if (state.step === 'slot_label') {
    state.data.label = text; state.step = 'slot_start';
    bot.sendMessage(chatId, 'Enter start time (e.g. 09:00):');
  } else if (state.step === 'slot_start') {
    state.data.startTime = text; state.step = 'slot_end';
    bot.sendMessage(chatId, 'Enter end time (e.g. 12:00):');
  } else if (state.step === 'slot_end') {
    state.data.endTime = text; state.step = 'slot_max';
    bot.sendMessage(chatId, 'Max orders for this slot:');
  } else if (state.step === 'slot_max') {
    try {
      await axios.post(`${API}/api/delivery/slots`, {
        label: state.data.label,
        startTime: state.data.startTime,
        endTime: state.data.endTime,
        maxOrders: parseInt(text),
      });
      bot.sendMessage(chatId, `✅ Slot "${state.data.label}" added.`, menu());
    } catch { bot.sendMessage(chatId, '❌ Failed.', menu()); }
    wizards.delete(chatId);
  }
});

console.log('🤖 AtlaShop Admin Bot started');
