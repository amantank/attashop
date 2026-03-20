import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { rateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import orderRoutes from "./routes/orders";
import subscriptionRoutes from "./routes/subscriptions";
import deliveryRoutes from "./routes/delivery";
import analyticsRoutes from "./routes/analytics";
import customerRoutes from "./routes/customers";
import { startSubscriptionCron } from "./jobs/subscriptionCron";
import webhookRoutes from "./routes/webhooks";
import http from "http";
import { initializeSocket } from "./services/socket";
import offerRoutes from "./routes/offers";
import bannerRoutes from "./routes/banners";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initializeSocket(server);

// ── Middleware ─────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));

// Webhooks require raw body for signature verification, so we capture it before global json parsing
app.use("/api/webhooks", webhookRoutes);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));
app.use(rateLimiter);

// ── Static files (uploaded images, invoices) ───────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Routes ─────────────────────────────────────────────────
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/banners", bannerRoutes);

// ── Health check ───────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 AtlaShop backend running on port ${PORT}`);
    startSubscriptionCron();
  });
});
