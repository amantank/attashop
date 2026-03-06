import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Product, { IProductVariant } from '../models/Product';

const router = express.Router();

// ── Multer setup for product images ───────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads/products');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/products – list with search, category, pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, categoryId, page = 1, limit = 20, featured } = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { isActive: true };

    if (search) {
      query.$text = { $search: search as string };
    }
    if (categoryId) query.categoryId = categoryId;
    if (featured === 'true') query.isFeatured = true;

    const products = await Product.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    const total = await Product.countDocuments(query);

    res.json({ success: true, products, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/products – create
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { name, nameHi, description, descriptionHi, price, discount, stock, categoryId, unitType, isFeatured, tags } = req.body;
    const variants: IProductVariant[] = req.body.variants ? JSON.parse(req.body.variants) : [];
    const discountNum = Number(discount) || 0;
    const priceNum = Number(price);
    const finalPrice = priceNum - (priceNum * discountNum) / 100;
    const imageUrl = req.file
      ? `/uploads/products/${req.file.filename}`
      : (req.body.imageUrl || '');

    const product = new Product({
      productId: uuidv4(),
      name, nameHi, description, descriptionHi,
      price: priceNum,
      discount: discountNum,
      finalPrice,
      imageUrl,
      stock: Number(stock) || 0,
      categoryId,
      unitType: unitType || 'kg',
      variants: variants.map(v => ({
        ...v,
        variantId: v.variantId || uuidv4(),
        finalPrice: v.price - (v.price * (v.discount || 0)) / 100,
      })),
      isFeatured: isFeatured === 'true' || isFeatured === true,
      tags: tags ? JSON.parse(tags) : [],
    });

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// PUT /api/products/:id – update
router.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const fields = ['name', 'nameHi', 'description', 'descriptionHi', 'discount', 'stock', 'categoryId', 'unitType', 'isFeatured'];
    fields.forEach(f => { if (req.body[f] !== undefined) (product as unknown as Record<string, unknown>)[f] = req.body[f]; });

    if (req.body.price) {
      product.price = Number(req.body.price);
      const disc = Number(req.body.discount ?? product.discount);
      product.finalPrice = product.price - (product.price * disc) / 100;
    }
    if (req.file) product.imageUrl = `/uploads/products/${req.file.filename}`;
    if (req.body.variants) product.variants = JSON.parse(req.body.variants);
    if (req.body.tags) product.tags = JSON.parse(req.body.tags);

    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Product.findOneAndDelete({ productId: req.params.id });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// PATCH /api/products/:id/stock
router.patch('/:id/stock', async (req: Request, res: Response) => {
  try {
    const { stock } = req.body;
    const product = await Product.findOneAndUpdate(
      { productId: req.params.id },
      { stock: Number(stock) },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
