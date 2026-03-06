import express, { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';

const router = express.Router();

// GET /api/customers/:phone/orders – order history
router.get('/:phone/orders', async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ phoneNumber: req.params.phone })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/customers/repeat-order – smart reorder: validate products, return cart items
router.post('/repeat-order', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const cartItems = [];
    const warnings: string[] = [];

    for (const item of order.products) {
      const product = await Product.findOne({ productId: item.productId });
      if (!product || !product.isActive) {
        warnings.push(`"${item.productName}" is no longer available.`);
        continue;
      }

      let currentPrice = product.finalPrice;
      let stock = product.stock;
      if (item.variantId) {
        const v = product.variants.find(x => x.variantId === item.variantId);
        if (v) { currentPrice = v.finalPrice; stock = v.stock; }
      }

      if (stock === 0) {
        warnings.push(`"${item.productName}" is out of stock and will not be added.`);
        continue;
      }

      const priceChanged = currentPrice !== item.unitPrice;
      cartItems.push({
        productId: product.productId,
        productName: product.name,
        imageUrl: product.imageUrl,
        variantId: item.variantId,
        size: item.size,
        quantity: item.quantity,
        unitPrice: currentPrice,
        totalPrice: currentPrice * item.quantity,
        priceChanged,
        previousPrice: priceChanged ? item.unitPrice : undefined,
      });
    }

    res.json({ success: true, cartItems, warnings });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
