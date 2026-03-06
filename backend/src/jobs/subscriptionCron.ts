import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import Subscription from '../models/Subscription';
import Order from '../models/Order';
import Product from '../models/Product';
import DeliverySlot from '../models/DeliverySlot';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function frequencyDays(freq: string): number {
  return freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30;
}

export function startSubscriptionCron(): void {
  // Runs every day at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('⏰ Running subscription cron job...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSubs = await Subscription.find({
      subscriptionStatus: 'active',
      nextDeliveryDate: { $lte: today },
    });

    console.log(`Found ${dueSubs.length} subscriptions due today`);

    for (const sub of dueSubs) {
      try {
        const product = await Product.findOne({ productId: sub.productId });
        if (!product || !product.isActive) {
          console.log(`Product ${sub.productId} unavailable for sub ${sub.subscriptionId}`);
          continue;
        }

        let unitPrice = product.finalPrice;
        if (sub.variantId) {
          const v = product.variants.find(x => x.variantId === sub.variantId);
          if (v) unitPrice = v.finalPrice;
        }

        const totalPrice = unitPrice * sub.quantity;

        // Pick first available slot
        const slot = await DeliverySlot.findOne({ isActive: true }).sort({ startTime: 1 });
        const slotLabel = slot ? slot.label : '9AM-12PM';
        const deliveryDate = today.toISOString().split('T')[0];

        const order = new Order({
          orderId: `ORD-SUB-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`,
          customerName: sub.customerName,
          phoneNumber: sub.phoneNumber,
          address: sub.address,
          pincode: sub.pincode,
          products: [{
            productId: product.productId,
            productName: product.name,
            variantId: sub.variantId,
            size: sub.size,
            quantity: sub.quantity,
            unitPrice,
            totalPrice,
          }],
          totalPrice,
          deliveryCharge: 0,
          finalAmount: totalPrice,
          paymentMethod: sub.paymentMethod,
          paymentStatus: sub.paymentMethod === 'cod' ? 'cod' : 'pending',
          orderStatus: 'placed',
          deliveryDate,
          deliverySlot: slotLabel,
          isSubscriptionOrder: true,
          subscriptionId: sub.subscriptionId,
        });

        await order.save();

        // Update nextDeliveryDate
        sub.nextDeliveryDate = addDays(today, frequencyDays(sub.frequency));
        await sub.save();

        console.log(`✅ Subscription order created: ${order.orderId}`);
      } catch (e) {
        console.error(`Failed for sub ${sub.subscriptionId}:`, e);
      }
    }
  });

  console.log('📅 Subscription cron job scheduled (daily 6AM)');
}
