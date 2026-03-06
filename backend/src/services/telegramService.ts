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

export async function sendOrderNotification(order: IOrder): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const productList = order.products
    .map(p => `  • ${p.productName}${p.size ? ` (${p.size})` : ''} ×${p.quantity} — ₹${p.totalPrice}`)
    .join('\n');

  const message = `
🛒 *New Order Received!*

📋 *Order ID:* \`${order.orderId}\`
👤 *Customer:* ${order.customerName}
📞 *Phone:* ${order.phoneNumber}

📍 *Delivery Address:*
${order.address}
📮 Pincode: ${order.pincode}${order.landmark ? `\n🏠 Landmark: ${order.landmark}` : ''}

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
    text: message,
    parse_mode: 'Markdown',
  });
}

export async function sendLowStockAlert(productName: string, stock: number): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  const msg = `⚠️ *Low Stock Alert!*\n\nProduct: *${productName}*\nRemaining Stock: *${stock} units*\n\nPlease update stock using /update_stock`;
  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown',
  });
}
