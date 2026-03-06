import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import DeliveryArea from '../models/DeliveryArea';
import DeliveryCharge from '../models/DeliveryCharge';
import DeliverySlot from '../models/DeliverySlot';

const router = express.Router();

// ── Delivery Areas ─────────────────────────────────────────
router.get('/areas', async (_req, res: Response) => {
  const areas = await DeliveryArea.find({ isActive: true });
  res.json({ success: true, areas });
});

router.post('/areas', async (req: Request, res: Response) => {
  try {
    const { pincode, name } = req.body;
    const area = await DeliveryArea.findOneAndUpdate(
      { pincode },
      { pincode, name, isActive: true },
      { upsert: true, new: true }
    );
    res.json({ success: true, area });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

router.delete('/areas/:pincode', async (req: Request, res: Response) => {
  await DeliveryArea.findOneAndUpdate({ pincode: req.params.pincode }, { isActive: false });
  res.json({ success: true, message: 'Area removed' });
});

// Check pincode availability
router.get('/areas/check/:pincode', async (req: Request, res: Response) => {
  const area = await DeliveryArea.findOne({ pincode: req.params.pincode, isActive: true });
  res.json({ success: true, available: !!area });
});

// ── Delivery Charges ───────────────────────────────────────
router.get('/charges', async (_req, res: Response) => {
  const config = await DeliveryCharge.findOne().sort({ createdAt: -1 });
  res.json({ success: true, config });
});

router.post('/charges', async (req: Request, res: Response) => {
  try {
    const config = new DeliveryCharge(req.body);
    await config.save();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ── Delivery Slots ─────────────────────────────────────────
router.get('/slots', async (_req, res: Response) => {
  const slots = await DeliverySlot.find({ isActive: true }).sort({ startTime: 1 });
  res.json({ success: true, slots });
});

router.post('/slots', async (req: Request, res: Response) => {
  try {
    const { label, startTime, endTime, maxOrders } = req.body;
    const slot = new DeliverySlot({
      slotId: uuidv4(),
      label, startTime, endTime,
      maxOrders: Number(maxOrders) || 30,
    });
    await slot.save();
    res.status(201).json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

router.delete('/slots/:id', async (req: Request, res: Response) => {
  await DeliverySlot.findOneAndUpdate({ slotId: req.params.id }, { isActive: false });
  res.json({ success: true, message: 'Slot removed' });
});

export default router;
