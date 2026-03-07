import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Subscription from '../models/Subscription';

const router = express.Router();

// POST /api/subscriptions
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customerName, phoneNumber, address, pincode,
      productId, productName, variantId, size, quantity,
      frequency, paymentMethod,
    } = req.body;

    // Calculate first delivery date based on frequency
    const next = new Date();
    const freqDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;
    next.setDate(next.getDate() + freqDays);

    const sub = new Subscription({
      subscriptionId: `SUB-${uuidv4().slice(0, 8).toUpperCase()}`,
      customerName, phoneNumber, address, pincode,
      productId, productName, variantId, size,
      quantity: Number(quantity),
      frequency,
      nextDeliveryDate: next,
      paymentMethod,
      subscriptionStatus: 'active',
    });

    await sub.save();
    res.status(201).json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GET /api/subscriptions – by phone or all
router.get('/', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.query;
    const query = phoneNumber ? { phoneNumber } : {};
    const subscriptions = await Subscription.find(query).sort({ createdAt: -1 });
    res.json({ success: true, subscriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// PATCH /api/subscriptions/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { subscriptionStatus } = req.body;
    const sub = await Subscription.findOneAndUpdate(
      { subscriptionId: req.params.id },
      { subscriptionStatus },
      { new: true }
    );
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Subscription.findOneAndDelete({ subscriptionId: req.params.id });
    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
