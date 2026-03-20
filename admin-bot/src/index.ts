import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import FormData from "form-data";
import https from "https";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.ADMIN_BOT_TOKEN || "";
const API = process.env.BACKEND_URL || "http://backend:5000";

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 },
  },
});

// ── Wizard state ──────────────────────────────────────────────
type Step = { step: string; data: Record<string, unknown> };
const wizards: Map<number, Step> = new Map();

function menu(): TelegramBot.SendMessageOptions {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "📪 List Products" }, { text: "➕ Add Product" }],
        [{ text: "✏️ Update Product" }, { text: "🗑️ Delete Product" }],
        [{ text: "💰 Update Price" }, { text: "📈 Update Stock" }],
        [{ text: "🚚 Delivery Areas" }, { text: "💸 Delivery Charge" }],
        [{ text: "⏰ Delivery Slots" }, { text: "📊 Analytics" }],
        [{ text: "🏷️ List Offers" }, { text: "🔥 New Offer" }],
        [{ text: "🖼️ List Banners" }, { text: "➕ New Banner" }],
      ],
      resize_keyboard: true,
    },
  };
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Welcome to *AtlaShop Admin Bot*!\n\nUse the menu below to manage your shop.`,
    { parse_mode: "Markdown", ...menu() },
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    [
      "*Available Commands:*",
      "",
      "*Products:*",
      "/list\\_products – List all products",
      "/add\\_product – Add a new product",
      "/update\\_product \\<id\\> – Update product",
      "/delete\\_product \\<id\\> – Delete product",
      "/update\\_price \\<id\\> \\<price\\> – Update price",
      "/update\\_stock \\<id\\> \\<qty\\> – Update stock",
      "",
      "*Delivery:*",
      "/set\\_delivery\\_area – Manage delivery pincodes",
      "/set\\_delivery\\_charge – Configure delivery charges",
      "/set\\_delivery\\_slots – Manage delivery slots",
      "",
      "*Offers:*",
      "/offers – List active offers",
      "/newoffer – Create new offer (wizard)",
      "/quickoffer – Quick create offer",
      "/endoffer – End an offer early",
      "",
      "*Analytics:*",
      `/analytics – View today\'s analytics`,
    ].join("\n"),
    { parse_mode: "Markdown" },
  );
});

// ══════════════════════════════════════════════════════════════
//  LIST PRODUCTS
// ══════════════════════════════════════════════════════════════
bot.onText(/\/list_products|📪 List Products/, async (msg) => {
  try {
    const { data } = await axios.get(`${API}/api/products?limit=10`);
    if (!data.products.length) {
      bot.sendMessage(msg.chat.id, "No products found.");
      return;
    }
    const text = data.products
      .map(
        (p: Record<string, unknown>) =>
          `📪 *${p.name}*\n   ID: \`${p.productId}\`\n   Price: ₹${(p.pricing as any)?.basePrice || 0} | Stock: ${(p.inventory as any)?.quantity || 0}\n   Category: ${p.categoryId}`,
      )
      .join("\n\n");
    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to fetch products.");
  }
});

// ══════════════════════════════════════════════════════════════
//  QUICK ADD PRODUCT (Shorthand)
// ══════════════════════════════════════════════════════════════
bot.onText(/^\/add(?:$|\s+([\s\S]*))/, async (msg, match) => {
  const input = match?.[1]?.trim();
  if (!input) {
    bot.sendMessage(
      msg.chat.id,
      `⚠️ *Quick Add Format:*\n\n/add\nName: <name>\nCategory: <category>\nPrice: <price>\nPack: <comma list>\nStock: <stock>\n<Specific>: <Value>\n...`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  try {
    const lines = input.split("\n");
    const data: Record<string, string> = {};
    for (const line of lines) {
      if (!line.includes(":")) continue;
      const [k, ...v] = line.split(":");
      data[k.trim().toLowerCase()] = v.join(":").trim();
    }

    const payload: any = {
      name: data.name,
      categoryId: data.category,
      price: Number(data.price || 0),
      packSizes: data.pack
        ? data.pack.split(",").map((s) => Number(s.trim()))
        : [],
      stock: Number(data.stock || 0),
      specifications: {},
    };

    if (data.description) payload.description = data.description;

    const reserved = [
      "name",
      "category",
      "price",
      "pack",
      "stock",
      "description",
    ];
    for (const [key, val] of Object.entries(data)) {
      if (!reserved.includes(key)) {
        payload.specifications[key] = val;
      }
    }

    const res = await axios.post(`${API}/api/products`, payload);
    bot.sendMessage(
      msg.chat.id,
      `✅ *Product Quick Added!*\n\nID: \`${res.data.product.productId}\`\nName: ${res.data.product.name}`,
      { parse_mode: "Markdown" },
    );
  } catch (e) {
    bot.sendMessage(
      msg.chat.id,
      `❌ Failed to parse/add product: ${(e as Error).message}`,
    );
  }
});

// ══════════════════════════════════════════════════════════════
//  ADD PRODUCT WIZARD
// ══════════════════════════════════════════════════════════════
bot.onText(/\/add_product|➕ Add Product/, (msg) => {
  wizards.set(msg.chat.id, { step: "add_image", data: {} });
  bot.sendMessage(
    msg.chat.id,
    "📥 *Add New Product*\n\nStep 1/11: Send product *image* (or type /skip):",
    { parse_mode: "Markdown" },
  );
});

// ══════════════════════════════════════════════════════════════
//  UPDATE PRODUCT
// ══════════════════════════════════════════════════════════════
bot.onText(/\/update_product (.+)/, async (msg, match) => {
  const id = match![1].trim();
  wizards.set(msg.chat.id, { step: "update_field", data: { productId: id } });
  bot.sendMessage(
    msg.chat.id,
    `✏️ Editing product \`${id}\`\n\nWhat would you like to update?`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Name", callback_data: `upd:name:${id}` },
            { text: "Price", callback_data: `upd:price:${id}` },
          ],
          [
            { text: "Stock", callback_data: `upd:stock:${id}` },
            { text: "MRP", callback_data: `upd:mrp:${id}` },
          ],
          [
            { text: "Description", callback_data: `upd:description:${id}` },
            { text: "Category", callback_data: `upd:categoryId:${id}` },
          ],
          [
            { text: "Image", callback_data: `upd:image:${id}` },
            { text: "Brand", callback_data: `upd:brand:${id}` },
          ],
          [
            {
              text: "Min Delivery Qty",
              callback_data: `upd:minHomeDeliveryQuantity:${id}`,
            },
            {
              text: "Is Active (true/false)",
              callback_data: `upd:isActive:${id}`,
            },
          ],
        ],
      },
    },
  );
});

// ══════════════════════════════════════════════════════════════
//  DELETE PRODUCT
// ══════════════════════════════════════════════════════════════
bot.onText(/\/delete_product (.+)/, async (msg, match) => {
  const id = match![1].trim();
  bot.sendMessage(msg.chat.id, `⚠️ Delete product \`${id}\`?`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Yes, delete", callback_data: `del:${id}` },
          { text: "❌ Cancel", callback_data: "cancel" },
        ],
      ],
    },
  });
});

// ══════════════════════════════════════════════════════════════
//  UPDATE PRICE (quick)
// ══════════════════════════════════════════════════════════════
bot.onText(/\/update_price (.+) (\d+\.?\d*)/, async (msg, match) => {
  const id = match![1].trim();
  const price = parseFloat(match![2]);
  try {
    await axios.put(`${API}/api/products/${id}`, { price, discount: 0 });
    bot.sendMessage(
      msg.chat.id,
      `✅ Price updated to ₹${price} for \`${id}\``,
      { parse_mode: "Markdown" },
    );
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to update price.");
  }
});

// ══════════════════════════════════════════════════════════════
//  UPDATE STOCK (quick)
// ══════════════════════════════════════════════════════════════
bot.onText(/\/update_stock|📈 Update Stock/, (msg) => {
  wizards.set(msg.chat.id, { step: "stock_id", data: {} });
  bot.sendMessage(msg.chat.id, "📈 Enter product ID to update stock:");
});

bot.onText(/\/update_stock (.+) (\d+)/, async (msg, match) => {
  const id = match![1].trim();
  const stock = parseInt(match![2]);
  try {
    await axios.patch(`${API}/api/products/${id}/stock`, { stock });
    bot.sendMessage(msg.chat.id, `✅ Stock updated to ${stock} for \`${id}\``, {
      parse_mode: "Markdown",
    });
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to update stock.");
  }
});

// ══════════════════════════════════════════════════════════════
//  DELIVERY AREAS
// ══════════════════════════════════════════════════════════════
bot.onText(/\/set_delivery_area|🚚 Delivery Areas/, async (msg) => {
  try {
    const { data } = await axios.get(`${API}/api/delivery/areas`);
    const areas =
      data.areas
        .map(
          (a: Record<string, string>) => `• ${a.pincode} – ${a.name || "Area"}`,
        )
        .join("\n") || "None set";
    bot.sendMessage(
      msg.chat.id,
      `📌 *Active Delivery Areas:*\n${areas}\n\nOptions:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Add Pincode", callback_data: "area:add" }],
            [{ text: "🗑️ Remove Pincode", callback_data: "area:remove" }],
          ],
        },
      },
    );
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to fetch areas.");
  }
});

// ══════════════════════════════════════════════════════════════
//  DELIVERY CHARGE
// ══════════════════════════════════════════════════════════════
bot.onText(/\/set_delivery_charge|💸 Delivery Charge/, (msg) => {
  wizards.set(msg.chat.id, { step: "charge_flat", data: {} });
  bot.sendMessage(
    msg.chat.id,
    "💸 *Delivery Charge Setup*\n\nEnter flat delivery charge amount (₹):\n_(Enter 0 for free delivery)_",
    { parse_mode: "Markdown" },
  );
});

// ══════════════════════════════════════════════════════════════
//  DELIVERY SLOTS
// ══════════════════════════════════════════════════════════════
bot.onText(/\/set_delivery_slots|⏰ Delivery Slots/, async (msg) => {
  try {
    const { data } = await axios.get(`${API}/api/delivery/slots`);
    const slots =
      data.slots
        .map(
          (s: Record<string, unknown>) =>
            `• ${s.label} (max: ${s.maxOrders} orders)`,
        )
        .join("\n") || "No slots configured";
    bot.sendMessage(msg.chat.id, `⏰ *Delivery Slots:*\n${slots}`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Add Slot", callback_data: "slot:add" }],
          [{ text: "🗑️ Remove Slot", callback_data: "slot:list_remove" }],
        ],
      },
    });
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to fetch slots.");
  }
});

// ══════════════════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════════════════
bot.onText(/\/analytics|📊 Analytics/, async (msg) => {
  try {
    const { data } = await axios.get(`${API}/api/analytics`);
    const a = data.analytics;
    const top = a.topProducts
      .map(
        (p: Record<string, unknown>, i: number) =>
          `${i + 1}. ${p.name} – ${p.quantity} units`,
      )
      .join("\n");
    const msg_text = [
      "📈 *AtlaShop Analytics*",
      "",
      `📅 *Today:* ${a.today.orders} orders | ₹${a.today.revenue} revenue`,
      `📆 *This Week:* ${a.week.orders} orders | ₹${a.week.revenue} revenue`,
      "",
      `👉 Pending: ${a.pendingOrders} | ✅ Completed: ${a.completedOrders} | Total: ${a.totalOrders}`,
      "",
      `🏆 *Top Products:*\n${top}`,
    ].join("\n");
    bot.sendMessage(msg.chat.id, msg_text, { parse_mode: "Markdown" });
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to fetch analytics.");
  }
});

// ══════════════════════════════════════════════════════════════
//  🏷️ LIST OFFERS
// ══════════════════════════════════════════════════════════════
bot.onText(/\/offers|🏷️ List Offers/, async (msg) => {
  try {
    const { data } = await axios.get(`${API}/api/offers/active`);
    const offers = data.offers;

    if (!offers || offers.length === 0) {
      bot.sendMessage(
        msg.chat.id,
        '🏷️ *No active offers right now.*\n\nUse /newoffer or "🔥 New Offer" to create one.',
        { parse_mode: "Markdown" },
      );
      return;
    }

    const TYPE_EMOJI: Record<string, string> = {
      flash_sale: "⚡",
      banner: "🎉",
      category_sale: "🏷️",
    };
    const THEME_EMOJI: Record<string, string> = {
      fire: "🔥",
      summer: "☀️",
      festival: "🎊",
      fresh: "🌿",
      royal: "👑",
    };

    const lines = offers.map((o: any, i: number) => {
      const timeLeft = Math.max(0, new Date(o.endDate).getTime() - Date.now());
      const hoursLeft = Math.floor(timeLeft / 3_600_000);
      const minsLeft = Math.floor((timeLeft % 3_600_000) / 60_000);

      const discountStr =
        o.discountType === "percentage"
          ? `${o.discountValue}%`
          : `₹${o.discountValue}`;
      const cats = o.applicableCategories?.length
        ? o.applicableCategories.join(", ")
        : "All";
      const prods = o.applicableProducts?.length
        ? `${o.applicableProducts.length} products`
        : "";

      return [
        `${i + 1}. ${TYPE_EMOJI[o.type] || "🏷️"} *${o.title}*`,
        `   ${THEME_EMOJI[o.theme] || ""} Discount: *${discountStr} OFF*`,
        `   📂 Applies to: ${cats}${prods ? " | " + prods : ""}`,
        `   ⏱ Ends in: ${hoursLeft}h ${minsLeft}m`,
        `   🆔 \`${o.offerId}\``,
      ].join("\n");
    });

    const text = `🏷️ *Active Offers (${offers.length}):*\n\n${lines.join("\n\n")}`;

    // Build inline buttons for each offer (end / delete)
    const buttons = offers.map((o: any) => [
      {
        text: `⏹ End: ${o.title.slice(0, 20)}`,
        callback_data: `offer:end:${o.offerId}`,
      },
      { text: `🗑️ Del`, callback_data: `offer:del:${o.offerId}` },
    ]);

    bot.sendMessage(msg.chat.id, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (e) {
    bot.sendMessage(
      msg.chat.id,
      `❌ Failed to fetch offers: ${(e as Error).message}`,
    );
  }
});

// ══════════════════════════════════════════════════════════════
//  🔥 NEW OFFER WIZARD
// ══════════════════════════════════════════════════════════════
bot.onText(/\/newoffer|🔥 New Offer/, (msg) => {
  wizards.set(msg.chat.id, { step: "offer_title", data: {} });
  bot.sendMessage(
    msg.chat.id,
    [
      "🔥 *Create New Offer*",
      "",
      "Step 1/7: Enter offer *title*",
      "",
      "_Example: Flash Sale - 20% OFF on Atta!_",
    ].join("\n"),
    { parse_mode: "Markdown" },
  );
});

// ══════════════════════════════════════════════════════════════
//  ⚡ QUICK OFFER (one-shot)
// ══════════════════════════════════════════════════════════════
bot.onText(/^\/quickoffer(?:$|\s+([\s\S]*))/, async (msg, match) => {
  const input = match?.[1]?.trim();
  if (!input) {
    bot.sendMessage(
      msg.chat.id,
      [
        "⚡ *Quick Offer Format:*",
        "",
        "```",
        "/quickoffer",
        "Title: Flash Sale - 20% OFF",
        "Discount: 20%",
        "Categories: Atta, Dal",
        "Duration: 24",
        "Theme: fire",
        "```",
        "",
        '*Discount:* "20%" or "₹50" or "50flat"',
        '*Categories:* comma-separated or "all"',
        "*Duration:* hours (default 24)",
        "*Theme:* fire / summer / festival / fresh / royal",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
    return;
  }

  try {
    const lines = input.split("\n");
    const d: Record<string, string> = {};
    for (const line of lines) {
      if (!line.includes(":")) continue;
      const [k, ...v] = line.split(":");
      d[k.trim().toLowerCase()] = v.join(":").trim();
    }

    if (!d.title || !d.discount) {
      bot.sendMessage(
        msg.chat.id,
        "❌ Title and Discount are required. Use /quickoffer to see format.",
      );
      return;
    }

    // Parse discount
    let discountType = "percentage";
    let discountValue = 0;
    const disc = d.discount.trim();
    if (disc.endsWith("%")) {
      discountType = "percentage";
      discountValue = parseFloat(disc.replace("%", ""));
    } else if (disc.startsWith("₹") || disc.toLowerCase().endsWith("flat")) {
      discountType = "flat";
      discountValue = parseFloat(disc.replace(/[₹flat]/gi, "").trim());
    } else {
      discountValue = parseFloat(disc);
    }

    // Parse categories
    const cats =
      d.categories?.toLowerCase() === "all" || !d.categories
        ? []
        : d.categories.split(",").map((c) => c.trim());

    // Parse duration
    const hours = parseInt(d.duration || "24") || 24;
    const now = new Date();
    const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const theme = d.theme || "fire";
    const type = cats.length > 0 ? "category_sale" : "flash_sale";

    const payload = {
      title: d.title,
      titleHi: d.titlehi || d["title hi"] || "",
      description: d.description || "",
      descriptionHi: d.descriptionhi || d["description hi"] || "",
      type,
      discountType,
      discountValue,
      theme,
      applicableProducts: [],
      applicableCategories: cats,
      minOrderAmount: parseFloat(d.min || "0") || 0,
      maxDiscount: parseFloat(d.maxdiscount || d["max discount"] || "0") || 0,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      priority: parseInt(d.priority || "5") || 5,
    };

    const res = await axios.post(`${API}/api/offers`, payload);
    const o = res.data.offer;

    bot.sendMessage(
      msg.chat.id,
      [
        "✅ *Offer Created!*",
        "",
        `🏷️ *${o.title}*`,
        `💰 Discount: ${o.discountType === "percentage" ? `${o.discountValue}%` : `₹${o.discountValue}`} OFF`,
        `📂 Categories: ${o.applicableCategories.length ? o.applicableCategories.join(", ") : "All products"}`,
        `⏱ Duration: ${hours} hours`,
        `🎨 Theme: ${o.theme}`,
        `🆔 \`${o.offerId}\``,
      ].join("\n"),
      { parse_mode: "Markdown", ...menu() },
    );
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Failed: ${(e as Error).message}`);
  }
});

// ══════════════════════════════════════════════════════════════
//  END / DELETE OFFER (by command)
// ══════════════════════════════════════════════════════════════
bot.onText(/\/endoffer(?:\s+(.+))?/, async (msg, match) => {
  const offerId = match?.[1]?.trim();
  if (!offerId) {
    // Show list to pick
    try {
      const { data } = await axios.get(`${API}/api/offers/active`);
      if (!data.offers?.length) {
        bot.sendMessage(msg.chat.id, "🏷️ No active offers to end.");
        return;
      }
      const btns = data.offers.map((o: any) => [
        {
          text: `⏹ ${o.title.slice(0, 35)}`,
          callback_data: `offer:end:${o.offerId}`,
        },
      ]);
      bot.sendMessage(msg.chat.id, "⏹ *Select offer to end:*", {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: btns },
      });
    } catch {
      bot.sendMessage(msg.chat.id, "❌ Failed to fetch offers.");
    }
    return;
  }
  try {
    await axios.put(`${API}/api/offers/${offerId}`, { isActive: false });
    bot.sendMessage(msg.chat.id, `✅ Offer \`${offerId}\` ended.`, {
      parse_mode: "Markdown",
      ...menu(),
    });
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to end offer.");
  }
});

bot.onText(/\/deloffer(?:\s+(.+))?/, async (msg, match) => {
  const offerId = match?.[1]?.trim();
  if (!offerId) {
    try {
      const { data } = await axios.get(`${API}/api/offers`);
      if (!data.offers?.length) {
        bot.sendMessage(msg.chat.id, "🏷️ No offers to delete.");
        return;
      }
      const btns = data.offers.slice(0, 10).map((o: any) => [
        {
          text: `🗑️ ${o.title.slice(0, 35)}`,
          callback_data: `offer:confirmdel:${o.offerId}`,
        },
      ]);
      bot.sendMessage(msg.chat.id, "🗑️ *Select offer to delete:*", {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: btns },
      });
    } catch {
      bot.sendMessage(msg.chat.id, "❌ Failed to fetch offers.");
    }
    return;
  }
  try {
    await axios.delete(`${API}/api/offers/${offerId}`);
    bot.sendMessage(msg.chat.id, `✅ Offer \`${offerId}\` deleted.`, {
      parse_mode: "Markdown",
      ...menu(),
    });
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to delete offer.");
  }
});

// ═══════════════════════════════════════════════════════════════════
//  🖼️ LIST BANNERS
// ═══════════════════════════════════════════════════════════════════
bot.onText(/\/banners|🖼️ List Banners/, async (msg) => {
  try {
    const { data } = await axios.get(`${API}/api/banners`);
    const banners = data.banners;

    if (!banners || banners.length === 0) {
      bot.sendMessage(
        msg.chat.id,
        '🖼️ *No banners yet.*\n\nUse "➕ New Banner" to create one.',
        { parse_mode: "Markdown" },
      );
      return;
    }

    const now = Date.now();

    const lines = banners.map((b: any, i: number) => {
      const isLive =
        b.isActive &&
        new Date(b.startDate).getTime() <= now &&
        new Date(b.endDate).getTime() >= now;

      const status = isLive
        ? "🟢 Live"
        : b.isActive
          ? "🟡 Scheduled"
          : "🔴 Off";
      const endIn = Math.max(0, new Date(b.endDate).getTime() - now);
      const daysLeft = Math.floor(endIn / 86_400_000);
      const hrsLeft = Math.floor((endIn % 86_400_000) / 3_600_000);

      return [
        `${i + 1}. ${status} *${b.title}*`,
        `   🔗 Link: ${b.ctaLink}`,
        `   ⏱ Ends in: ${daysLeft}d ${hrsLeft}h`,
        `   🆔 \`${b.bannerId}\``,
      ].join("\n");
    });

    const buttons = banners.map((b: any) => [
      {
        text: `⏹ End: ${b.title.slice(0, 22)}`,
        callback_data: `banner:end:${b.bannerId}`,
      },
      { text: `🗑️ Del`, callback_data: `banner:del:${b.bannerId}` },
    ]);

    bot.sendMessage(
      msg.chat.id,
      `🖼️ *All Banners (${banners.length}):*\n\n${lines.join("\n\n")}`,
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons },
      },
    );
  } catch (e) {
    bot.sendMessage(
      msg.chat.id,
      `❌ Failed to fetch banners: ${(e as Error).message}`,
    );
  }
});

// ═══════════════════════════════════════════════════════════════════
//  ➕ NEW BANNER WIZARD  (7 steps)
// ═══════════════════════════════════════════════════════════════════
bot.onText(/\/newbanner|➕ New Banner/, (msg) => {
  wizards.set(msg.chat.id, { step: "banner_title", data: {} });
  bot.sendMessage(
    msg.chat.id,
    [
      "🖼️ *Create New Banner*",
      "",
      "Step 1/7: Enter banner *title* (shown on the banner)",
      "",
      "_Example: Fresh Atta — Farm to Table_",
    ].join("\n"),
    { parse_mode: "Markdown" },
  );
});

// ═══════════════════════════════════════════════════════════════════
//  ⚡ QUICK BANNER (one-shot command)
// ═══════════════════════════════════════════════════════════════════
bot.onText(/^\/quickbanner(?:$|\s+([\s\S]*))/, async (msg, match) => {
  const input = match?.[1]?.trim();
  if (!input) {
    bot.sendMessage(
      msg.chat.id,
      [
        "⚡ *Quick Banner Format:*",
        "",
        "```",
        "/quickbanner",
        "Title: Fresh Atta Sale",
        "Subtitle: Limited Time",
        "Image: https://example.com/banner.jpg",
        "Link: /products",
        "Duration: 7",
        "BgColor: #F0FAF5",
        "```",
        "",
        "*Image* — must be a direct image URL (jpg/png/webp)",
        "*Link* — page path e.g. /products /offers",
        "*Duration* — days (default 7)",
        "*BgColor* — hex fallback color (default #F0FAF5)",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
    return;
  }

  try {
    const lines = input.split("\n");
    const d: Record<string, string> = {};
    for (const line of lines) {
      if (!line.includes(":")) continue;
      const [k, ...v] = line.split(":");
      d[k.trim().toLowerCase()] = v.join(":").trim();
    }

    if (!d.title || !d.image) {
      bot.sendMessage(
        msg.chat.id,
        "❌ *Title* and *Image* are required. Use /quickbanner to see format.",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const days = parseInt(d.duration || "7") || 7;
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const payload = {
      title: d.title,
      subtitle: d.subtitle || "",
      imageUrl: d.image,
      ctaLink: d.link || "/products",
      bgColor: d.bgcolor || d["bg color"] || "#F0FAF5",
      startDate: now.toISOString(),
      endDate: end.toISOString(),
      isActive: true,
      priority: parseInt(d.priority || "0") || 0,
    };

    const res = await axios.post(`${API}/api/banners`, payload);
    const b = res.data.banner;

    bot.sendMessage(
      msg.chat.id,
      [
        "✅ *Banner Created!*",
        "",
        `🖼️ *${b.title}*`,
        `🔗 Link: ${b.ctaLink}`,
        `📅 Duration: ${days} days`,
        `🆔 \`${b.bannerId}\``,
        "",
        "🌐 _Banner is now live on the website!_",
      ].join("\n"),
      { parse_mode: "Markdown", ...menu() },
    );
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Failed: ${(e as Error).message}`);
  }
});

// ── End / Delete banner by command ──────────────────────────────────
bot.onText(/\/endbanner(?:\s+(.+))?/, async (msg, match) => {
  const id = match?.[1]?.trim();
  if (!id) {
    try {
      const { data } = await axios.get(`${API}/api/banners`);
      if (!data.banners?.length) {
        bot.sendMessage(msg.chat.id, "🖼️ No banners to end.");
        return;
      }
      const btns = data.banners.map((b: any) => [
        {
          text: `⏹ ${b.title.slice(0, 35)}`,
          callback_data: `banner:end:${b.bannerId}`,
        },
      ]);
      bot.sendMessage(msg.chat.id, "⏹ *Select banner to end:*", {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: btns },
      });
    } catch {
      bot.sendMessage(msg.chat.id, "❌ Failed to fetch banners.");
    }
    return;
  }
  try {
    await axios.put(`${API}/api/banners/${id}`, { isActive: false });
    bot.sendMessage(msg.chat.id, `✅ Banner \`${id}\` ended.`, {
      parse_mode: "Markdown",
      ...menu(),
    });
  } catch {
    bot.sendMessage(msg.chat.id, "❌ Failed to end banner.");
  }
});

// ══════════════════════════════════════════════════════════════
//  CALLBACK QUERY HANDLER
// ══════════════════════════════════════════════════════════════
bot.on("callback_query", async (query) => {
  const chatId = query.message!.chat.id;
  const d = query.data || "";
  bot.answerCallbackQuery(query.id);

  if (d === "cancel") {
    wizards.delete(chatId);
    bot.sendMessage(chatId, "❌ Cancelled.", menu());
    return;
  }

  // ── Delete product ──
  if (d.startsWith("del:")) {
    const id = d.slice(4);
    try {
      await axios.delete(`${API}/api/products/${id}`);
      bot.sendMessage(chatId, `✅ Product \`${id}\` deleted.`, {
        parse_mode: "Markdown",
        ...menu(),
      });
    } catch {
      bot.sendMessage(chatId, "❌ Delete failed.");
    }
    return;
  }

  // ── Update field ──
  if (d.startsWith("upd:")) {
    const [, field, id] = d.split(":");
    wizards.set(chatId, {
      step: `update_value`,
      data: { productId: id, field },
    });
    bot.sendMessage(chatId, `Enter new *${field}* for product \`${id}\`:`, {
      parse_mode: "Markdown",
    });
    return;
  }

  // ── Area management ──
  if (d === "area:add") {
    wizards.set(chatId, { step: "area_add_pin", data: {} });
    bot.sendMessage(chatId, "Enter pincode to add:");
    return;
  }
  if (d === "area:remove") {
    wizards.set(chatId, { step: "area_remove_pin", data: {} });
    bot.sendMessage(chatId, "Enter pincode to remove:");
    return;
  }

  // ── Slot management ──
  if (d === "slot:add") {
    wizards.set(chatId, { step: "slot_label", data: {} });
    bot.sendMessage(chatId, '⏰ Enter slot label (e.g. "9AM – 12PM"):');
    return;
  }
  if (d === "slot:list_remove") {
    try {
      const { data } = await axios.get(`${API}/api/delivery/slots`);
      const btns = data.slots.map((s: Record<string, unknown>) => [
        { text: `🗑️ ${s.label}`, callback_data: `slot:del:${s.slotId}` },
      ]);
      bot.sendMessage(chatId, "Select slot to remove:", {
        reply_markup: { inline_keyboard: btns },
      });
    } catch {
      bot.sendMessage(chatId, "❌ Failed.");
    }
    return;
  }
  if (d.startsWith("slot:del:")) {
    const slotId = d.slice(9);
    try {
      await axios.delete(`${API}/api/delivery/slots/${slotId}`);
      bot.sendMessage(chatId, "✅ Slot removed.", menu());
    } catch {
      bot.sendMessage(chatId, "❌ Failed.");
    }
    return;
  }

  // ══════════════════════════════════════════════════════════
  //  OFFER CALLBACKS
  // ══════════════════════════════════════════════════════════

  // End offer (deactivate)
  if (d.startsWith("offer:end:")) {
    const offerId = d.slice(10);
    try {
      await axios.put(`${API}/api/offers/${offerId}`, { isActive: false });
      bot.sendMessage(chatId, `✅ Offer \`${offerId}\` has been *ended*.`, {
        parse_mode: "Markdown",
        ...menu(),
      });
    } catch {
      bot.sendMessage(chatId, "❌ Failed to end offer.");
    }
    return;
  }

  // Delete offer (with confirmation)
  if (d.startsWith("offer:confirmdel:")) {
    const offerId = d.slice(17);
    bot.sendMessage(
      chatId,
      `⚠️ *Delete this offer permanently?*\n\nOffer ID: \`${offerId}\``,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Yes, delete", callback_data: `offer:del:${offerId}` },
              { text: "❌ Cancel", callback_data: "cancel" },
            ],
          ],
        },
      },
    );
    return;
  }

  if (d.startsWith("offer:del:")) {
    const offerId = d.slice(10);
    try {
      await axios.delete(`${API}/api/offers/${offerId}`);
      bot.sendMessage(chatId, `✅ Offer \`${offerId}\` *deleted*.`, {
        parse_mode: "Markdown",
        ...menu(),
      });
    } catch {
      bot.sendMessage(chatId, "❌ Failed to delete offer.");
    }
    return;
  }

  // ── Offer wizard: type selection ──
  if (d.startsWith("offertype:")) {
    const state = wizards.get(chatId);
    if (!state) return;
    state.data.type = d.slice(10);
    state.step = "offer_discount";
    bot.sendMessage(
      chatId,
      [
        "Step 3/7: Enter *discount value*",
        "",
        "_Examples:_",
        "`20` → 20% off",
        "`50flat` → ₹50 flat off",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
    return;
  }

  // ── Offer wizard: theme selection ──
  if (d.startsWith("offertheme:")) {
    const state = wizards.get(chatId);
    if (!state) return;
    state.data.theme = d.slice(11);
    state.step = "offer_preview";

    // Build preview
    const o = state.data;
    const discStr =
      o.discountType === "flat"
        ? `₹${o.discountValue} OFF`
        : `${o.discountValue}% OFF`;
    const cats = (o.categories as string) || "All products";
    const THEME_EMOJI: Record<string, string> = {
      fire: "🔥",
      summer: "☀️",
      festival: "🎊",
      fresh: "🌿",
      royal: "👑",
    };

    bot.sendMessage(
      chatId,
      [
        "Step 7/7: *Preview Your Offer*",
        "",
        `${THEME_EMOJI[o.theme as string] || "🏷️"} *${o.title}*`,
        o.titleHi ? `   Hindi: ${o.titleHi}` : "",
        `💰 Discount: *${discStr}*`,
        `📂 Type: ${o.type}`,
        `📂 Categories: ${cats}`,
        `⏱ Duration: ${o.duration}h`,
        `🎨 Theme: ${o.theme}`,
        "",
        "Type *yes* to create or *cancel* to abort.",
      ]
        .filter(Boolean)
        .join("\n"),
      { parse_mode: "Markdown" },
    );
    return;
  }

  // ── Banner: end (deactivate) ───────────────────────────────────────
  if (d.startsWith("banner:end:")) {
    const bannerId = d.slice(11);
    try {
      await axios.put(`${API}/api/banners/${bannerId}`, { isActive: false });
      bot.sendMessage(chatId, `✅ Banner \`${bannerId}\` ended.`, {
        parse_mode: "Markdown",
        ...menu(),
      });
    } catch {
      bot.sendMessage(chatId, "❌ Failed to end banner.");
    }
    return;
  }

  // ── Banner: confirm delete ─────────────────────────────────────────
  if (d.startsWith("banner:confirmdel:")) {
    const bannerId = d.slice(18);
    bot.sendMessage(
      chatId,
      `⚠️ *Delete this banner permanently?*\n\n\`${bannerId}\``,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Yes, delete",
                callback_data: `banner:del:${bannerId}`,
              },
              { text: "❌ Cancel", callback_data: "cancel" },
            ],
          ],
        },
      },
    );
    return;
  }

  // ── Banner: delete ─────────────────────────────────────────────────
  if (d.startsWith("banner:del:")) {
    const bannerId = d.slice(11);
    try {
      await axios.delete(`${API}/api/banners/${bannerId}`);
      bot.sendMessage(chatId, `✅ Banner \`${bannerId}\` deleted.`, {
        parse_mode: "Markdown",
        ...menu(),
      });
    } catch {
      bot.sendMessage(chatId, "❌ Failed to delete banner.");
    }
    return;
  }
});

// ══════════════════════════════════════════════════════════════
//  MESSAGE WIZARD HANDLER
// ══════════════════════════════════════════════════════════════
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const state = wizards.get(chatId);
  if (!state) return;

  // ══════════════════════════════════════════════════════════
  //  ADD PRODUCT WIZARD STEPS
  // ══════════════════════════════════════════════════════════
  if (state.step === "add_image") {
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1];
      try {
        state.data.imageUrl = await bot.getFileLink(photo.file_id);
      } catch {
        state.data.imageUrl = "";
      }
    } else {
      state.data.imageUrl = "";
    }
    state.step = "add_name";
    bot.sendMessage(
      chatId,
      "Step 2/11: Enter product *name* (e.g. Sharbati Wheat Aata):",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "add_name") {
    state.data.name = text;
    state.step = "add_category";
    bot.sendMessage(
      chatId,
      "Step 3/11: Select *category*:\n1️⃣ Aata\n2️⃣ Rice\n3️⃣ Dal\n4️⃣ Spices\n5️⃣ Oil\n(Type number or name)",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "add_category") {
    const map: Record<string, string> = {
      "1": "Aata",
      "2": "Rice",
      "3": "Dal",
      "4": "Spices",
      "5": "Oil",
    };
    state.data.categoryId = map[text] || text;
    state.step = "add_desc";
    bot.sendMessage(chatId, "Step 4/11: Enter short *description*:", {
      parse_mode: "Markdown",
    });
  } else if (state.step === "add_desc") {
    state.data.description = text;
    state.step = "add_price";
    bot.sendMessage(chatId, "Step 5/11: Enter base *price* (₹):", {
      parse_mode: "Markdown",
    });
  } else if (state.step === "add_price") {
    state.data.price = parseFloat(text);
    state.step = "add_packs";
    bot.sendMessage(
      chatId,
      'Step 6/11: Enter *pack sizes* (e.g. 1,5,10) or type "Loose":',
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "add_packs") {
    state.data.packSizes = text;
    state.step = "add_stock";
    bot.sendMessage(
      chatId,
      "Step 7/11: Enter initial *stock quantity* (in kg):",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "add_stock") {
    state.data.stock = parseInt(text);
    state.step = "add_min_delivery";
    bot.sendMessage(
      chatId,
      "Step 8/11: Minimum weight (kg) for Home Delivery? (Enter 0 if no limit)",
    );
  } else if (state.step === "add_min_delivery") {
    state.data.minHomeDeliveryQuantity = parseInt(text) || 0;
    state.step = "add_specs";
    bot.sendMessage(
      chatId,
      'Step 9/11: Enter *Specifications (English)* (Format: "Key: Value", new line for each) or type /skip:',
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "add_specs") {
    state.data.specs = text;
    state.step = "add_specs_hi";
    bot.sendMessage(
      chatId,
      'Step 10/11: Enter *Specifications (Hindi)* (Format: "Key: Value", new line for each) or type /skip:',
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "add_specs_hi") {
    state.data.specsHi = text;
    state.step = "add_preview";
    bot.sendMessage(
      chatId,
      `Step 11/11: *Preview*\nName: ${state.data.name}\nPrice: ₹${state.data.price}\nPacks: ${state.data.packSizes}\nStock: ${state.data.stock}\nMin Delivery: ${state.data.minHomeDeliveryQuantity}kg\n\nType "yes" to confirm or "cancel".`,
      { parse_mode: "Markdown" },
    );
  }

  // Final Save — Product
  else if (state.step === "add_preview") {
    if (text.toLowerCase() === "cancel") {
      wizards.delete(chatId);
      bot.sendMessage(chatId, "❌ Cancelled product addition.", menu());
      return;
    }

    const parseMeta = (str: string) => {
      if (!str || str.toLowerCase() === "/skip") return {};
      const obj: Record<string, string> = {};
      str.split("\n").forEach((l) => {
        const parts = l.split(":");
        const k = parts.shift()?.trim();
        const v = parts.join(":").trim();
        if (k && v) obj[k] = v;
      });
      return obj;
    };

    const payload = {
      name: state.data.name,
      description: state.data.description,
      categoryId: state.data.categoryId,
      price: state.data.price,
      packSizes: (state.data.packSizes as string)
        .split(",")
        .map((s) => Number(s.trim())),
      stock: state.data.stock,
      imageUrl: state.data.imageUrl || "",
      specifications: parseMeta(state.data.specs as string),
      specificationsHi: parseMeta(state.data.specsHi as string),
      minHomeDeliveryQuantity: state.data.minHomeDeliveryQuantity,
    };

    try {
      const { data } = await axios.post(`${API}/api/products`, payload);
      bot.sendMessage(
        chatId,
        `✅ *Product Created!*\n\nID: \`${data.product.productId}\`\nName: ${data.product.name}\nSlug: ${data.product.slug}`,
        { parse_mode: "Markdown", ...menu() },
      );
    } catch (e) {
      bot.sendMessage(
        chatId,
        `❌ Failed to create product: ${(e as Error).message}`,
        menu(),
      );
    }
    wizards.delete(chatId);

    // ══════════════════════════════════════════════════════════
    //  OFFER WIZARD STEPS
    // ══════════════════════════════════════════════════════════
  } else if (state.step === "offer_title") {
    state.data.title = text;
    state.step = "offer_title_hi";
    bot.sendMessage(
      chatId,
      "Step 2/7: Enter offer title in *Hindi* (or /skip):",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "offer_title_hi") {
    state.data.titleHi = text === "/skip" ? "" : text;
    state.step = "offer_type_select";
    bot.sendMessage(chatId, "Step 3/7: Select offer *type*:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "⚡ Flash Sale", callback_data: "offertype:flash_sale" }],
          [
            {
              text: "🎉 Banner (all products)",
              callback_data: "offertype:banner",
            },
          ],
          [
            {
              text: "🏷️ Category Sale",
              callback_data: "offertype:category_sale",
            },
          ],
        ],
      },
    });
  } else if (state.step === "offer_discount") {
    const input = text.trim();
    if (input.toLowerCase().includes("flat") || input.startsWith("₹")) {
      state.data.discountType = "flat";
      state.data.discountValue = parseFloat(
        input.replace(/[₹flat]/gi, "").trim(),
      );
    } else {
      state.data.discountType = "percentage";
      state.data.discountValue = parseFloat(input.replace("%", ""));
    }
    state.step = "offer_categories";
    bot.sendMessage(
      chatId,
      [
        "Step 4/7: Which *categories* does this apply to?",
        "",
        '_Type category names comma-separated, or "all" for all products._',
        "",
        "_Examples:_",
        "`Atta, Dal`",
        "`all`",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "offer_categories") {
    state.data.categories =
      text.toLowerCase() === "all" ? "All products" : text;
    state.data.applicableCategories =
      text.toLowerCase() === "all"
        ? []
        : text.split(",").map((c: string) => c.trim());
    state.step = "offer_duration";
    bot.sendMessage(
      chatId,
      [
        "Step 5/7: Enter offer *duration* in hours.",
        "",
        "_Examples:_",
        "`6` → 6 hours",
        "`24` → 1 day",
        "`168` → 1 week",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "offer_duration") {
    state.data.duration = parseInt(text) || 24;
    state.step = "offer_theme_select";
    bot.sendMessage(chatId, "Step 6/7: Select *banner theme*:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔥 Fire", callback_data: "offertheme:fire" },
            { text: "☀️ Summer", callback_data: "offertheme:summer" },
          ],
          [
            { text: "🎊 Festival", callback_data: "offertheme:festival" },
            { text: "🌿 Fresh", callback_data: "offertheme:fresh" },
          ],
          [{ text: "👑 Royal", callback_data: "offertheme:royal" }],
        ],
      },
    });
  } else if (state.step === "offer_preview") {
    if (text.toLowerCase() === "cancel") {
      wizards.delete(chatId);
      bot.sendMessage(chatId, "❌ Offer creation cancelled.", menu());
      return;
    }

    // Create the offer!
    const now = new Date();
    const hours = (state.data.duration as number) || 24;
    const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const payload = {
      title: state.data.title,
      titleHi: state.data.titleHi || "",
      description: "",
      descriptionHi: "",
      type: state.data.type || "flash_sale",
      discountType: state.data.discountType || "percentage",
      discountValue: state.data.discountValue || 10,
      theme: state.data.theme || "fire",
      applicableProducts: [],
      applicableCategories: state.data.applicableCategories || [],
      minOrderAmount: 0,
      maxDiscount: 0,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      priority: 5,
    };

    try {
      const { data } = await axios.post(`${API}/api/offers`, payload);
      const o = data.offer;
      const discStr =
        o.discountType === "percentage"
          ? `${o.discountValue}%`
          : `₹${o.discountValue}`;

      bot.sendMessage(
        chatId,
        [
          "✅ *Offer Created Successfully!*",
          "",
          `🏷️ *${o.title}*`,
          `💰 Discount: *${discStr} OFF*`,
          `📂 Categories: ${o.applicableCategories.length ? o.applicableCategories.join(", ") : "All products"}`,
          `⏱ Duration: ${hours} hours`,
          `🎨 Theme: ${o.theme}`,
          "",
          `🆔 \`${o.offerId}\``,
          "",
          "🌐 _The offer is now live on the website!_",
        ].join("\n"),
        { parse_mode: "Markdown", ...menu() },
      );
    } catch (e) {
      bot.sendMessage(
        chatId,
        `❌ Failed to create offer: ${(e as Error).message}`,
        menu(),
      );
    }
    wizards.delete(chatId);

    // ══════════════════════════════════════════════════════════
    //  OTHER EXISTING WIZARDS
    // ══════════════════════════════════════════════════════════
  } else if (state.step === "update_value") {
    const { productId, field } = state.data;
    const payload: Record<string, unknown> = { [field as string]: text };
    if (
      ["price", "mrp", "stock", "minHomeDeliveryQuantity"].includes(
        field as string,
      )
    )
      payload[field as string] = parseFloat(text);
    if (field === "isActive")
      payload[field as string] = text.toLowerCase() === "true";
    try {
      await axios.put(`${API}/api/products/${productId}`, payload);
      bot.sendMessage(chatId, `✅ ${field} updated for \`${productId}\`.`, {
        parse_mode: "Markdown",
        ...menu(),
      });
    } catch {
      bot.sendMessage(chatId, "❌ Update failed.", menu());
    }
    wizards.delete(chatId);
  } else if (state.step === "stock_id") {
    state.data.productId = text;
    state.step = "stock_qty";
    bot.sendMessage(chatId, "Enter new stock quantity:");
  } else if (state.step === "stock_qty") {
    try {
      await axios.patch(`${API}/api/products/${state.data.productId}/stock`, {
        stock: parseInt(text),
      });
      bot.sendMessage(chatId, `✅ Stock updated to ${text}.`, menu());
    } catch {
      bot.sendMessage(chatId, "❌ Failed.", menu());
    }
    wizards.delete(chatId);
  } else if (state.step === "charge_flat") {
    state.data.flatCharge = parseFloat(text);
    state.step = "charge_free";
    bot.sendMessage(
      chatId,
      "Enter minimum order amount for *FREE delivery* (₹):",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "charge_free") {
    try {
      await axios.post(`${API}/api/delivery/charges`, {
        type: "flat",
        flatCharge: state.data.flatCharge,
        freeAboveAmount: parseFloat(text),
      });
      bot.sendMessage(
        chatId,
        `✅ Delivery charge set: ₹${state.data.flatCharge} (free above ₹${text}).`,
        menu(),
      );
    } catch {
      bot.sendMessage(chatId, "❌ Failed.", menu());
    }
    wizards.delete(chatId);
  } else if (state.step === "area_add_pin") {
    const [pincode, name = ""] = text.split(" ");
    try {
      await axios.post(`${API}/api/delivery/areas`, { pincode, name });
      bot.sendMessage(chatId, `✅ Pincode ${pincode} added.`, menu());
    } catch {
      bot.sendMessage(chatId, "❌ Failed.", menu());
    }
    wizards.delete(chatId);
  } else if (state.step === "area_remove_pin") {
    try {
      await axios.delete(`${API}/api/delivery/areas/${text.trim()}`);
      bot.sendMessage(chatId, `✅ Pincode ${text} removed.`, menu());
    } catch {
      bot.sendMessage(chatId, "❌ Failed.", menu());
    }
    wizards.delete(chatId);
  } else if (state.step === "slot_label") {
    state.data.label = text;
    state.step = "slot_start";
    bot.sendMessage(chatId, "Enter start time (e.g. 09:00):");
  } else if (state.step === "slot_start") {
    state.data.startTime = text;
    state.step = "slot_end";
    bot.sendMessage(chatId, "Enter end time (e.g. 12:00):");
  } else if (state.step === "slot_end") {
    state.data.endTime = text;
    state.step = "slot_max";
    bot.sendMessage(chatId, "Max orders for this slot:");
  } else if (state.step === "slot_max") {
    try {
      await axios.post(`${API}/api/delivery/slots`, {
        label: state.data.label,
        startTime: state.data.startTime,
        endTime: state.data.endTime,
        maxOrders: parseInt(text),
      });
      bot.sendMessage(chatId, `✅ Slot "${state.data.label}" added.`, menu());
    } catch {
      bot.sendMessage(chatId, "❌ Failed.", menu());
    }
    wizards.delete(chatId);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BANNER WIZARD STEPS
  // ═══════════════════════════════════════════════════════════════════
  else if (state.step === "banner_title") {
    state.data.title = text;
    state.step = "banner_title_hi";
    bot.sendMessage(chatId, "Step 2/7: Enter title in *Hindi* (or /skip):", {
      parse_mode: "Markdown",
    });
  } else if (state.step === "banner_title_hi") {
    state.data.titleHi = text === "/skip" ? "" : text;
    state.step = "banner_subtitle";
    bot.sendMessage(
      chatId,
      [
        "Step 3/7: Enter a *subtitle* (small text above the title, or /skip)",
        "",
        "_Example: Limited Time Offer_",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "banner_subtitle") {
    state.data.subtitle = text === "/skip" ? "" : text;
    state.step = "banner_image";
    bot.sendMessage(
      chatId,
      [
        "Step 4/7: Send the *image URL* for the banner",
        "",
        "⚠️ Must be a direct link ending in .jpg / .png / .webp",
        "",
        "_Example:_",
        "`https://i.imgur.com/abc123.jpg`",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "banner_image") {
    // Only accept text URLs — no Telegram file uploads
    if (!text.startsWith("http")) {
      bot.sendMessage(
        chatId,
        "❌ Please send a *direct image URL* starting with http:// or https://",
        { parse_mode: "Markdown" },
      );
      return;
    }
    state.data.imageUrl = text;
    state.step = "banner_link";
    bot.sendMessage(
      chatId,
      [
        "Step 5/7: Where should the CTA button go? Enter a *page path*:",
        "",
        "`/products` — Products page",
        "`/offers`   — Offers page",
        "`/`         — Home page",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "banner_link") {
    state.data.ctaLink = text.startsWith("/") ? text : `/${text}`;
    state.step = "banner_duration";
    bot.sendMessage(
      chatId,
      [
        "Step 6/7: How many *days* should this banner stay live?",
        "",
        "`7`  → 1 week",
        "`14` → 2 weeks",
        "`30` → 1 month",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "banner_duration") {
    state.data.durationDays = parseInt(text) || 7;
    state.step = "banner_bgcolor";
    bot.sendMessage(
      chatId,
      [
        "Step 7/7: Enter a *background colour* (hex) shown if the image fails to load, or /skip for default:",
        "",
        "_Examples:_",
        "`#FFF4F0` — warm pink",
        "`#F0FAF5` — fresh green",
        "`#F3F1FE` — soft purple",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "banner_bgcolor") {
    state.data.bgColor = text === "/skip" ? "#F0FAF5" : text;
    state.step = "banner_preview";

    const days = state.data.durationDays as number;
    bot.sendMessage(
      chatId,
      [
        "📋 *Preview Your Banner*",
        "",
        `🖼️ *${state.data.title}*`,
        state.data.titleHi ? `   Hindi: ${state.data.titleHi}` : "",
        state.data.subtitle ? `   Subtitle: ${state.data.subtitle}` : "",
        `🔗 Link: ${state.data.ctaLink}`,
        `🌅 Image: ${state.data.imageUrl}`,
        `📅 Duration: ${days} day${days !== 1 ? "s" : ""}`,
        `🎨 BgColor: ${state.data.bgColor}`,
        "",
        "Type *yes* to create or *cancel* to abort.",
      ]
        .filter(Boolean)
        .join("\n"),
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "banner_preview") {
    if (text.toLowerCase() === "cancel") {
      wizards.delete(chatId);
      bot.sendMessage(chatId, "❌ Banner creation cancelled.", menu());
      return;
    }

    if (text.toLowerCase() !== "yes") {
      bot.sendMessage(chatId, "Type *yes* to confirm or *cancel* to abort.", {
        parse_mode: "Markdown",
      });
      return;
    }

    // ── Save to backend ──────────────────────────────────────────────
    const days = (state.data.durationDays as number) || 7;
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const payload = {
      title: state.data.title,
      titleHi: state.data.titleHi || "",
      subtitle: state.data.subtitle || "",
      imageUrl: state.data.imageUrl,
      ctaLink: state.data.ctaLink || "/products",
      bgColor: state.data.bgColor || "#F0FAF5",
      startDate: now.toISOString(),
      endDate: end.toISOString(),
      isActive: true,
      priority: 0,
    };

    try {
      const { data } = await axios.post(`${API}/api/banners`, payload);
      const b = data.banner;
      bot.sendMessage(
        chatId,
        [
          "✅ *Banner Created Successfully!*",
          "",
          `🖼️ *${b.title}*`,
          `🔗 Link: ${b.ctaLink}`,
          `📅 Duration: ${days} days`,
          `🆔 \`${b.bannerId}\``,
          "",
          "🌐 _Banner is now live on the website!_",
        ].join("\n"),
        { parse_mode: "Markdown", ...menu() },
      );
    } catch (e) {
      bot.sendMessage(
        chatId,
        `❌ Failed to create banner: ${(e as Error).message}`,
        menu(),
      );
    }
    wizards.delete(chatId);
  }
});

console.log("🤖 AtlaShop Admin Bot started");
