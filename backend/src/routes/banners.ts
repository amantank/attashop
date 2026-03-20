import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Banner from "../models/Banner";

const router = express.Router();

// ── GET /api/banners/active  ← frontend uses this ──────────────────
router.get("/active", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const banners = await Banner.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ priority: -1, createdAt: -1 });

    res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ── GET /api/banners  ← admin: all banners ──────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  try {
    const banners = await Banner.find().sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ── POST /api/banners  ← admin bot calls this ───────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const d = req.body;

    if (!d.title || !d.imageUrl) {
      return res
        .status(400)
        .json({ success: false, message: "title and imageUrl are required" });
    }

    const now = new Date();
    const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const banner = new Banner({
      bannerId: uuidv4(),
      title: d.title,
      titleHi: d.titleHi || "",
      subtitle: d.subtitle || "",
      subtitleHi: d.subtitleHi || "",
      imageUrl: d.imageUrl,
      ctaText: d.ctaText || "Shop Now",
      ctaTextHi: d.ctaTextHi || "अभी खरीदें",
      ctaLink: d.ctaLink || "/products",
      bgColor: d.bgColor || "#F0FAF5",
      isActive: d.isActive !== false,
      priority: Number(d.priority || 0),
      startDate: d.startDate ? new Date(d.startDate) : now,
      endDate: d.endDate ? new Date(d.endDate) : defaultEnd,
    });

    await banner.save();
    res.status(201).json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ── PUT /api/banners/:id ────────────────────────────────────────────
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const banner = await Banner.findOneAndUpdate(
      { bannerId: req.params.id },
      { $set: data },
      { new: true },
    );
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });

    res.json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ── DELETE /api/banners/:id ─────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await Banner.findOneAndDelete({ bannerId: req.params.id });
    res.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
