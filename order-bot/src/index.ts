/**
 * Order Notification Bot
 * This bot runs alongside the backend and automatically
 * sends order status updates to the Telegram admin chat.
 * 
 * The backend's telegramService.ts sends notifications directly via
 * the Telegram Bot API using ORDER_BOT_TOKEN.
 * 
 * This bot also provides a polling interface so the admin can 
 * query order status and receive proactive messages.
 */
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.ORDER_BOT_TOKEN || '';
const API = process.env.BACKEND_URL || 'http://backend:5000';

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 },
  },
});

// ── Health check server (for Docker networking) ───────────
const app = express();
app.use(express.json());

// Inbound webhook: backend posts a message to forward to Telegram
// This allows backend to call /notify endpoint to trigger Telegram messages
app.post('/notify', async (req, res) => {
  const { chatId, message } = req.body;
  if (chatId && message) {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.listen(5001, () => console.log('Order bot webhook server on :5001'));

// ── Bot commands ───────────────────────────────────────────
bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, `🔔 *AtlaShop Order Bot*\n\nThis bot will notify you of all new orders.\n\nCommands:\n/orders \n/confirm [order_id] \n/delivered [order_id]– List recent orders\n/order [order_id] \\<id\\> – Get order details`, { parse_mode: 'Markdown' });
});

bot.onText(/\/orders/, async msg => {
  try {
    const { data } = await axios.get(`${API}/api/orders?limit=5`);
    if (!data.orders.length) { bot.sendMessage(msg.chat.id, 'No recent orders.'); return; }
    const text = data.orders.map((o: Record<string, unknown>) =>
      `🛒 \`${o.orderId}\` – ${o.customerName}\n   ₹${o.finalAmount} | ${o.paymentMethod} | *${o.orderStatus}*`
    ).join('\n\n');
    bot.sendMessage(msg.chat.id, `📋 *Recent Orders:*\n\n${text}`, { parse_mode: 'Markdown' });
  } catch { bot.sendMessage(msg.chat.id, '❌ Failed to fetch orders.'); }
});

bot.onText(/\/order (.+)/, async (msg, match) => {
  const orderId = match![1].trim();
  try {
    const { data } = await axios.get(`${API}/api/orders/${orderId}`);
    const o = data.order;
    const products = o.products.map((p: Record<string, unknown>) =>
      `  • ${p.productName} ×${p.quantity} — ₹${p.totalPrice}`).join('\n');

    // Build location line
    let locationLine = '';
    if (o.lat && o.lng) {
      locationLine = `\n🗺️ GPS: ${o.lat.toFixed(6)}, ${o.lng.toFixed(6)}\n📌 Maps: https://www.google.com/maps?q=${o.lat},${o.lng}`;
    }

    bot.sendMessage(msg.chat.id, [
      `📦 *Order: ${o.orderId}*`,
      `👤 ${o.customerName} | 📞 ${o.phoneNumber}`,
      `📍 ${o.address}, ${o.pincode}${o.landmark ? ` (${o.landmark})` : ''}${locationLine}`,
      `📅 ${o.deliveryDate} | ⏰ ${o.deliverySlot}`,
      ``,
      `*Products:*\n${products}`,
      ``,
      `💰 Total: ₹${o.finalAmount} | 🚚 Delivery: ₹${o.deliveryCharge}`,
      `💳 ${o.paymentMethod.toUpperCase()} — ${o.paymentStatus.toUpperCase()}`,
      `📊 Status: *${o.orderStatus}*`,
    ].join('\n'), { parse_mode: 'Markdown' });

    // Send location pin if available
    if (o.lat && o.lng) {
      bot.sendLocation(msg.chat.id, o.lat, o.lng);
    }
  } catch { bot.sendMessage(msg.chat.id, '❌ Order not found.'); }
});

// Mark order as confirmed
bot.onText(/\/confirm (.+)/, async (msg, match) => {
  const orderId = match![1].trim();
  try {
    await axios.patch(`${API}/api/orders/${orderId}/status`, { orderStatus: 'confirmed' });
    bot.sendMessage(msg.chat.id, `✅ Order \`${orderId}\` confirmed.`, { parse_mode: 'Markdown' });
  } catch { bot.sendMessage(msg.chat.id, '❌ Failed to confirm order.'); }
});

// Mark as delivered
bot.onText(/\/delivered (.+)/, async (msg, match) => {
  const orderId = match![1].trim();
  try {
    await axios.patch(`${API}/api/orders/${orderId}/status`, { orderStatus: 'delivered', paymentStatus: 'paid' });
    bot.sendMessage(msg.chat.id, `🎉 Order \`${orderId}\` marked as delivered!`, { parse_mode: 'Markdown' });
  } catch { bot.sendMessage(msg.chat.id, '❌ Failed.'); }
});

console.log('🔔 AtlaShop Order Bot started');
