import express, { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';

const router = express.Router();

// GET /api/analytics
router.get('/', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Today's orders
    const todayOrders = await Order.find({ createdAt: { $gte: today } });
    const todayRevenue = todayOrders.reduce((s, o) => s + o.finalAmount, 0);

    // This week
    const weekOrders = await Order.find({ createdAt: { $gte: weekAgo } });
    const weekRevenue = weekOrders.reduce((s, o) => s + o.finalAmount, 0);

    // Status counts
    const pendingOrders = await Order.countDocuments({ orderStatus: 'placed' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'delivered' });
    const totalOrders = await Order.countDocuments();

    // Top selling products
    const all = await Order.find();
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    all.forEach(o => {
      o.products.forEach(p => {
        if (!productSales[p.productId]) {
          productSales[p.productId] = { name: p.productName, quantity: 0, revenue: 0 };
        }
        productSales[p.productId].quantity += p.quantity;
        productSales[p.productId].revenue += p.totalPrice;
      });
    });
    const topProducts = Object.entries(productSales)
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Low stock products
    const lowStock = await Product.find({ 'inventory.stockStatus': { $in: ['low_stock', 'out_of_stock'] }, isActive: true });

    // Orders by slot (today)
    const ordersBySlot = await Order.aggregate([
      { $match: { deliveryDate: today.toISOString().split('T')[0] } },
      { $group: { _id: { date: '$deliveryDate', slot: '$deliverySlot' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      analytics: {
        today: { orders: todayOrders.length, revenue: todayRevenue },
        week: { orders: weekOrders.length, revenue: weekRevenue },
        pendingOrders,
        completedOrders,
        totalOrders,
        topProducts,
        lowStock: lowStock.map(p => ({ productId: p.productId, name: p.name, stock: p.inventory.quantity })),
        ordersBySlot,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
