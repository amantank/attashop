import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Offer from '../models/offer';

const router = express.Router();

// ─── GET /api/offers/active — Public: currently active offers ───
router.get('/active', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ priority: -1, createdAt: -1 });

    res.json({ success: true, offers });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ─── GET /api/offers — Admin: all offers ────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const query: Record<string, any> = {};
    if (active === 'true') {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }
    const offers = await Offer.find(query).sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, offers });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ─── GET /api/offers/:id ────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findOne({ offerId: req.params.id });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ─── POST /api/offers — Create ──────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const d = req.body;
    const offer = new Offer({
      offerId: uuidv4(),
      title: d.title,
      titleHi: d.titleHi || '',
      description: d.description || '',
      descriptionHi: d.descriptionHi || '',
      type: d.type || 'flash_sale',
      discountType: d.discountType || 'percentage',
      discountValue: Number(d.discountValue),
      theme: d.theme || 'fire',
      bannerImage: d.bannerImage,
      applicableProducts: d.applicableProducts || [],
      applicableCategories: d.applicableCategories || [],
      minOrderAmount: Number(d.minOrderAmount || 0),
      maxDiscount: Number(d.maxDiscount || 0),
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      isActive: d.isActive !== false,
      priority: Number(d.priority || 0),
    });
    await offer.save();
    res.status(201).json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ─── PUT /api/offers/:id — Update ───────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const offer = await Offer.findOneAndUpdate(
      { offerId: req.params.id },
      { $set: data },
      { new: true }
    );
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ─── DELETE /api/offers/:id ─────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Offer.findOneAndDelete({ offerId: req.params.id });
    res.json({ success: true, message: 'Offer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ─── POST /api/offers/seed — Create sample offers for testing ───
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const samples = [
      {
        offerId: uuidv4(),
        title: '⚡ Flash Sale — 20% OFF on All Atta!',
        titleHi: '⚡ फ्लैश सेल — सभी आटे पर 20% छूट!',
        description: 'Limited time offer on pure wheat flour.',
        descriptionHi: 'शुद्ध गेहूं के आटे पर सीमित समय का ऑफर।',
        type: 'flash_sale' as const,
        discountType: 'percentage' as const,
        discountValue: 20,
        theme: 'fire' as const,
        applicableCategories: ['atta', 'Atta'],
        applicableProducts: [],
        startDate: now,
        endDate: tomorrow,
        isActive: true,
        priority: 10,
      },
      {
        offerId: uuidv4(),
        title: '🎉 Festival Special — Flat ₹50 OFF',
        titleHi: '🎉 त्योहार विशेष — ₹50 की फ्लैट छूट',
        description: 'On orders above ₹500. All products included!',
        descriptionHi: '₹500 से ऊपर के ऑर्डर पर। सभी उत्पाद शामिल!',
        type: 'banner' as const,
        discountType: 'flat' as const,
        discountValue: 50,
        theme: 'festival' as const,
        applicableCategories: [],
        applicableProducts: [],
        minOrderAmount: 500,
        startDate: now,
        endDate: nextWeek,
        isActive: true,
        priority: 5,
      },
      {
        offerId: uuidv4(),
        title: '🌿 Fresh Dal — 15% OFF This Week',
        titleHi: '🌿 ताज़ी दाल — इस हफ्ते 15% छूट',
        description: 'Stock up on nutritious dal at great prices.',
        descriptionHi: 'पौष्टिक दाल बेहतरीन दामों पर।',
        type: 'category_sale' as const,
        discountType: 'percentage' as const,
        discountValue: 15,
        theme: 'fresh' as const,
        applicableCategories: ['dal', 'Dal'],
        applicableProducts: [],
        startDate: now,
        endDate: nextWeek,
        isActive: true,
        priority: 3,
      },
    ];

    await Offer.insertMany(samples);
    res.json({ success: true, message: `${samples.length} sample offers created!`, count: samples.length });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;