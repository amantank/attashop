import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Product, { IProductVariant, IProduct } from '../models/Product';
// Using a basic slugify function
const slugify = (text: string) => text.toString().toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^\w-]+/g, '')
  .replace(/--+/g, '-')
  .replace(/^-+/, '')
  .replace(/-+$/, '');

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

// GET /api/products/:id (by productId or slug)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({
      $or: [{ productId: req.params.id }, { slug: req.params.id }],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/products – create
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Slug generation
    let slug = data.slug;
    if (!slug && data.name) slug = slugify(data.name);

    // Pricing & Variants
    const basePrice = Number(data.price || data.basePrice || 0);
    const unit = data.unit || 'kg';
    const mrp = Number(data.mrp || 0);
    
    let variants: IProductVariant[] = [];
    if (data.variants && typeof data.variants === 'string') {
      try { variants = JSON.parse(data.variants); } catch (e) { /* ignore */ }
    } else if (Array.isArray(data.variants)) {
      variants = data.variants;
    }

    if (variants.length === 0 && data.packSizes) {
      let sizes: number[] = [];
      if (typeof data.packSizes === 'string') {
        sizes = data.packSizes.split(',').map((s: string) => Number(s.trim()));
      } else if (Array.isArray(data.packSizes)) {
        sizes = data.packSizes.map(Number);
      }
      variants = sizes
        .filter((w) => !isNaN(w) && w > 0)
        .map((weight: number) => ({
          weight,
          unit,
          price: basePrice * weight
        }));
    }

    // Inventory status
    let quantity = Number(data.stock || data.quantity || 0);
    let lowStockThreshold = Number(data.lowStockThreshold || 10);
    let stockStatus = 'in_stock';
    if (quantity === 0) stockStatus = 'out_of_stock';
    else if (quantity <= lowStockThreshold) stockStatus = 'low_stock';

    // Specification mapping
    let specifications = {};
    if (data.specifications && typeof data.specifications === 'string') {
      try { specifications = JSON.parse(data.specifications); } catch (e) { /* ignore */ }
    } else if (typeof data.specifications === 'object') {
      specifications = data.specifications;
    }

    let specificationsHi = {};
    if (data.specificationsHi && typeof data.specificationsHi === 'string') {
      try { specificationsHi = JSON.parse(data.specificationsHi); } catch (e) { /* ignore */ }
    } else if (typeof data.specificationsHi === 'object') {
      specificationsHi = data.specificationsHi;
    }

    const images: string[] = [];
    if (req.file) images.push(`/uploads/products/${req.file.filename}`);
    else if (data.imageUrl) images.push(data.imageUrl);

    const product = new Product({
      productId: uuidv4(),
      name: data.name,
      slug,
      categoryId: data.categoryId,
      description: data.description || '',
      brand: data.brand || '',
      images,
      pricing: { basePrice, unit, mrp },
      variants,
      inventory: { quantity, unit, lowStockThreshold },
      minOrder: Number(data.minOrder || 1),
      minHomeDeliveryQuantity: Number(data.minHomeDeliveryQuantity || 0),
      stockStatus,
      specifications,
      specificationsHi,
      tags: data.tags ? (typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags) : [],
      isActive: data.isActive === undefined ? true : data.isActive === 'true' || data.isActive === true,
      isFeatured: data.isFeatured === 'true' || data.isFeatured === true,
      priority: Number(data.priority || 0),
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
    const product = await Product.findOne({ productId: req.params.id }) as IProduct;
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const data = req.body;

    if (data.name) {
      product.name = data.name;
      if (!data.slug) product.slug = slugify(data.name);
    }
    if (data.slug) product.slug = data.slug;
    if (data.categoryId) product.categoryId = data.categoryId;
    if (data.description !== undefined) product.description = data.description;
    if (data.brand !== undefined) product.brand = data.brand;
    
    // Updates arrays
    if (data.tags) product.tags = typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags;
    if (req.file) {
      product.images = [`/uploads/products/${req.file.filename}`]; // Replace for now, can be appended inside the model layer in a different iteration
    }

    if (data.price !== undefined || data.unit !== undefined || data.mrp !== undefined) {
      product.pricing.basePrice = Number(data.price || data.basePrice || product.pricing.basePrice);
      product.pricing.unit = data.unit || product.pricing.unit;
      product.pricing.mrp = Number(data.mrp !== undefined ? data.mrp : product.pricing.mrp);
    }

    if (data.variants) {
      product.variants = typeof data.variants === 'string' ? JSON.parse(data.variants) : data.variants;
    }

    if (data.stock !== undefined || data.quantity !== undefined || data.lowStockThreshold !== undefined) {
      product.inventory.quantity = Number(data.stock !== undefined ? data.stock : (data.quantity !== undefined ? data.quantity : product.inventory.quantity));
      product.inventory.lowStockThreshold = Number(data.lowStockThreshold !== undefined ? data.lowStockThreshold : product.inventory.lowStockThreshold);
      
      if (product.inventory.quantity === 0) product.stockStatus = 'out_of_stock';
      else if (product.inventory.quantity <= product.inventory.lowStockThreshold) product.stockStatus = 'low_stock';
      else product.stockStatus = 'in_stock';
    }

    if (data.specifications) {
      product.specifications = typeof data.specifications === 'string' ? JSON.parse(data.specifications) : data.specifications;
    }

    if (data.specificationsHi) {
      product.specificationsHi = typeof data.specificationsHi === 'string' ? JSON.parse(data.specificationsHi) : data.specificationsHi;
    }

    const simpleFields = ['isActive', 'isFeatured', 'priority'];
    simpleFields.forEach(f => {
      if (data[f] !== undefined) {
        if (f === 'priority') (product as any)[f] = Number(data[f]);
        else (product as any)[f] = (data[f] === 'true' || data[f] === true);
      }
    });

    if (data.minHomeDeliveryQuantity !== undefined) {
      product.minHomeDeliveryQuantity = Number(data.minHomeDeliveryQuantity);
    }

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
    const quantity = Number(stock);
    const product = await Product.findOne({ productId: req.params.id }) as IProduct;
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.inventory.quantity = quantity;
    if (quantity === 0) product.stockStatus = 'out_of_stock';
    else if (quantity <= product.inventory.lowStockThreshold) product.stockStatus = 'low_stock';
    else product.stockStatus = 'in_stock';

    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;

