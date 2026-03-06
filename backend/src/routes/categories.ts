import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Category from '../models/Category';

const router = express.Router();

// GET /api/categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ createdAt: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/categories
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, nameHi, description, image } = req.body;
    const category = new Category({ categoryId: uuidv4(), name, nameHi, description, image });
    await category.save();
    res.status(201).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const category = await Category.findOneAndUpdate(
      { categoryId: req.params.id },
      { ...req.body },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Category.findOneAndDelete({ categoryId: req.params.id });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
