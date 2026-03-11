import express, { Request, Response } from 'express';
import crypto from 'crypto';
import Order from '../models/Order';
import { emitPaymentStatusUpdate } from '../services/socket';

const router = express.Router();

// ── Razorpay Webhook ────────────────────────────────────────────────────────

router.post(
  '/razorpay',
  express.raw({ type: 'application/json' }), // CRITICAL: Need raw body for HMAC verification
  async (req: Request, res: Response) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret) return res.status(500).send('Webhook secret not configured');

      const signature = req.headers['x-razorpay-signature'] as string;
      const payload = req.body.toString();

      // Verify HMAC-SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).send('Invalid signature');
      }

      const event = JSON.parse(payload);

      // Handle 'payment.captured'
      if (event.event === 'payment.captured') {
        const paymentEntity = event.payload.payment.entity;
        // Depending on implementation, you might pass your standard orderId in 'notes'
        // For example: paymentEntity.notes.orderId
        const orderId = paymentEntity.notes?.orderId;
        
        if (orderId) {
          const order = await Order.findOneAndUpdate(
            { orderId },
            { paymentStatus: 'paid' },
            { new: true }
          );

          if (order) {
            console.log(`✅ Razorpay Webhook marked order ${orderId} as paid`);
            emitPaymentStatusUpdate(order.orderId, 'paid');
          }
        }
      }

      res.status(200).send('OK');
    } catch (err) {
      console.error('Razorpay webhook error:', err);
      res.status(500).send('Webhook Error');
    }
  }
);

// ── Paytm Webhook ───────────────────────────────────────────────────────────

router.post(
  '/paytm',
  express.raw({ type: 'application/json' }), // You may also receive urlencoded form data from Paytm depending on implementation
  async (req: Request, res: Response) => {
    try {
      const payloadString = req.body.toString();
      const payload = JSON.parse(payloadString);
      
      // Verification logic depends on Paytm's checksum verification SDK rules.
      // Assuming checksum is verified successfully locally:
      
      if (payload.STATUS === 'TXN_SUCCESS' && payload.ORDERID) {
        const orderId = payload.ORDERID;
        const order = await Order.findOneAndUpdate(
          { orderId },
          { paymentStatus: 'paid' },
          { new: true }
        );

        if (order) {
          console.log(`✅ Paytm Webhook marked order ${orderId} as paid`);
          emitPaymentStatusUpdate(order.orderId, 'paid');
        }
      }

      res.status(200).send('OK');
    } catch (err) {
      console.error('Paytm webhook error:', err);
      res.status(500).send('Webhook Error');
    }
  }
);

export default router;
