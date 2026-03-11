import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Order from '../models/Order';
import Product from '../models/Product';
import DeliveryArea from '../models/DeliveryArea';
import DeliveryCharge from '../models/DeliveryCharge';
import DeliverySlot from '../models/DeliverySlot';
import { generateInvoice } from '../services/invoiceService';
import { sendOrderNotification } from '../services/telegramService';
import { emitPaymentStatusUpdate } from '../services/socket';

const router = express.Router();

// Helper: calculate delivery charge
async function calcDeliveryCharge(pincode: string, totalPrice: number): Promise<number> {
  const config = await DeliveryCharge.findOne().sort({ createdAt: -1 });
  if (!config) return 0;
  if (totalPrice >= config.freeAboveAmount) return 0;
  if (config.type === 'pincode') {
    const rule = config.rules.find(r => r.pincode === pincode);
    return rule ? rule.charge : config.flatCharge;
  }
  return config.flatCharge;
}

// POST /api/orders – place order
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customerName, phoneNumber, address, pincode, landmark,
      products: rawProducts, paymentMethod, deliveryDate, deliverySlot,
    } = req.body;

    // Validate pincode is in delivery area (only if areas have been configured)
    const totalAreas = await DeliveryArea.countDocuments({ isActive: true });
    if (totalAreas > 0) {
      const area = await DeliveryArea.findOne({ pincode, isActive: true });
      if (!area) {
        return res.status(400).json({ success: false, message: 'Delivery not available for this pincode.' });
      }
    }

    // Validate slot capacity (only if slots have been configured)
    const slot = await DeliverySlot.findOne({ label: deliverySlot, isActive: true });
    if (slot) {
      const slotOrderCount = await Order.countDocuments({
        deliveryDate,
        deliverySlot,
        orderStatus: { $nin: ['cancelled'] },
      });
      if (slotOrderCount >= slot.maxOrders) {
        return res.status(400).json({ success: false, message: 'This delivery slot is full. Please choose another.' });
      }
    }

    // Enrich products
    let totalPrice = 0;
    const enrichedProducts = [];
    for (const item of rawProducts) {
      const product = await Product.findOne({ productId: item.productId });
      if (!product || !product.isActive) continue;

      if (product.minHomeDeliveryQuantity && item.quantity < product.minHomeDeliveryQuantity) {
        return res.status(400).json({ success: false, message: `Quantity for [${product.name}] must be at least ${product.minHomeDeliveryQuantity}kg for home delivery.` });
      }

      let unitPrice = product.pricing.basePrice;
      let variantId: string | undefined;
      let size: string | undefined;

      if (item.variantId) {
        const variant = product.variants.find(v => (v as any)._id?.toString() === item.variantId);
        if (variant) { unitPrice = variant.price; variantId = (variant as any)._id?.toString(); size = `${variant.weight}${variant.unit}`; }
      }

      const itemTotal = unitPrice * item.quantity;
      totalPrice += itemTotal;

      enrichedProducts.push({
        productId: product.productId,
        productName: product.name,
        variantId, size,
        preferences: item.preferences,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });

      // Deduct stock (global inventory)
      product.inventory.quantity = Math.max(0, product.inventory.quantity - item.quantity);
      if (product.inventory.quantity === 0) product.stockStatus = 'out_of_stock';
      else if (product.inventory.quantity <= product.inventory.lowStockThreshold) product.stockStatus = 'low_stock';
      
      await product.save();
    }

    const deliveryCharge = await calcDeliveryCharge(pincode, totalPrice);
    const finalAmount = totalPrice + deliveryCharge;
    const orderId = `ORD-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const order = new Order({
      orderId,
      customerName, phoneNumber, address, pincode, landmark,
      products: enrichedProducts,
      totalPrice,
      deliveryCharge,
      finalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'cod' : 'pending',
      orderStatus: 'placed',
      deliveryDate,
      deliverySlot,
    });

    await order.save();

    // Generate invoice
    try {
      const invoicePath = await generateInvoice(order);
      order.invoicePath = invoicePath;
      await order.save();
    } catch (e) { console.error('Invoice generation failed:', e); }

    // Send Telegram notification
    try { await sendOrderNotification(order); } catch (e) { console.error('Telegram notify failed:', e); }

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GET /api/orders – list (admin)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, date, slot, page = 1, limit = 50 } = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (status) query.orderStatus = status;
    if (date) query.deliveryDate = date;
    if (slot) query.deliverySlot = slot;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    const total = await Order.countDocuments(query);

    res.json({ success: true, orders, total });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const update: Record<string, string> = {};
    if (orderStatus) update.orderStatus = orderStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    const order = await Order.findOneAndUpdate({ orderId: req.params.id }, update, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    // Broadcast payment status real-time update
    if (paymentStatus) {
      emitPaymentStatusUpdate(order.orderId, paymentStatus);
    }
    
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GET /api/orders/slots/availability?date=YYYY-MM-DD
router.get('/slots/availability', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const slots = await DeliverySlot.find({ isActive: true });
    const availability = await Promise.all(
      slots.map(async slot => {
        const count = await Order.countDocuments({
          deliveryDate: date,
          deliverySlot: slot.label,
          orderStatus: { $nin: ['cancelled'] },
        });
        return {
          slotId: slot.slotId,
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxOrders: slot.maxOrders,
          bookedOrders: count,
          available: count < slot.maxOrders,
        };
      })
    );
    res.json({ success: true, date, slots: availability });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
