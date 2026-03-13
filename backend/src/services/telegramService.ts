import axios from 'axios';
import { IOrder } from '../models/Order';

const BOT_TOKEN = process.env.ORDER_BOT_TOKEN || '';
const CHAT_ID = process.env.ADMIN_CHAT_ID || '';

function getStatusEmoji(status: string): string {
  const map: Record<string, string> = {
    placed: '🆕', confirmed: '✅', out_for_delivery: '🚚', delivered: '🎉', cancelled: '❌',
    upi: '📲', gpay: '📱', paytm: '💳', cod: '💵', razorpay: '💳',
    pending: '⏳', paid: '✅', failed: '❌',
  };
  return map[status] || '📦';
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\\$1');
}

export async function sendOrderNotification(order: IOrder): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const productList = order.products
    .map(p => `  • ${p.productName}${p.size ? ` (${p.size})` : ''} ×${p.quantity} — ₹${p.totalPrice}`)
    .join('\n');

  // Build location section
  let locationSection = '';
  if (order.lat && order.lng) {
    const mapsUrl = `https://www.google.com/maps?q=${order.lat},${order.lng}`;
    locationSection = `\n🗺️ *GPS:* \`${order.lat.toFixed(6)}, ${order.lng.toFixed(6)}\`\n📌 [Open in Google Maps](${mapsUrl})`;
  }

  const message = `
🛒 *New Order Received\\!*

📋 *Order ID:* \`${order.orderId}\`
👤 *Customer:* ${escapeMarkdown(order.customerName)}
📞 *Phone:* ${order.phoneNumber}

📍 *Delivery Address:*
${escapeMarkdown(order.address)}
📮 Pincode: ${order.pincode}${order.landmark ? `\n🏠 Landmark: ${escapeMarkdown(order.landmark)}` : ''}${locationSection}

📅 *Delivery Date:* ${order.deliveryDate}
⏰ *Delivery Slot:* ${escapeMarkdown(order.deliverySlot)}

🛍️ *Products Ordered:*
${productList}

💰 *Price Summary:*
   Subtotal: ₹${order.totalPrice}
   Delivery: ₹${order.deliveryCharge}
   *TOTAL: ₹${order.finalAmount}*

${getStatusEmoji(order.paymentMethod)} *Payment:* ${order.paymentMethod.toUpperCase()}
${getStatusEmoji(order.paymentStatus)} *Status:* ${order.paymentStatus.toUpperCase()}
`.trim();

  try {
    // Send text notification with Maps link
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
    });

    // Also send actual Telegram location pin (shows mini-map in chat)
    if (order.lat && order.lng) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendLocation`, {
        chat_id: CHAT_ID,
        latitude: order.lat,
        longitude: order.lng,
      });
    }
  } catch (err) {
    // Fallback: try with basic Markdown if MarkdownV2 fails
    console.error('Telegram MarkdownV2 failed, trying plain Markdown:', (err as any)?.response?.data);
    try {
      const fallbackMsg = `
🛒 *New Order Received!*

📋 *Order ID:* \`${order.orderId}\`
👤 *Customer:* ${order.customerName}
📞 *Phone:* ${order.phoneNumber}

📍 *Delivery Address:*
${order.address}
📮 Pincode: ${order.pincode}${order.landmark ? `\n🏠 Landmark: ${order.landmark}` : ''}${order.lat && order.lng ? `\n🗺️ GPS: ${order.lat.toFixed(6)}, ${order.lng.toFixed(6)}\n📌 Maps: https://www.google.com/maps?q=${order.lat},${order.lng}` : ''}

📅 *Delivery Date:* ${order.deliveryDate}
⏰ *Delivery Slot:* ${order.deliverySlot}

🛍️ *Products Ordered:*
${productList}

💰 *Price Summary:*
   Subtotal: ₹${order.totalPrice}
   Delivery: ₹${order.deliveryCharge}
   *TOTAL: ₹${order.finalAmount}*

${getStatusEmoji(order.paymentMethod)} *Payment:* ${order.paymentMethod.toUpperCase()}
${getStatusEmoji(order.paymentStatus)} *Status:* ${order.paymentStatus.toUpperCase()}
`.trim();

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: fallbackMsg,
        parse_mode: 'Markdown',
      });

      if (order.lat && order.lng) {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendLocation`, {
          chat_id: CHAT_ID,
          latitude: order.lat,
          longitude: order.lng,
        });
      }
    } catch (fallbackErr) {
      console.error('Telegram fallback also failed:', (fallbackErr as any)?.response?.data);
    }
  }
}

export async function sendLowStockAlert(productName: string, stock: number): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  const msg = `⚠️ *Low Stock Alert!*\n\nProduct: *${productName}*\nRemaining Stock: *${stock} units*\n\nPlease update stock using /update_stock`;
  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown',
  });
}