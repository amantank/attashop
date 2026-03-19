import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  CreditCard,
  Package,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { getOrdersByPhone, buildRepeatCartItems } from "../api/orders";
import { getProducts } from "../api/products";
import { useCartStore } from "../store/cartStore";
import type { Order } from "../types";
import OrderStatusBadge from "../components/OrderStatusBadge";
import toast from "react-hot-toast";

export default function OrderHistoryPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const repeatOrder = useCartStore((s) => s.repeatOrder);

  const handleSearch = async () => {
    if (phone.length < 10) {
      toast.error(
        lang === "hi" ? "वैध फोन नंबर दर्ज करें" : "Enter a valid phone number",
      );
      return;
    }
    setLoading(true);
    try {
      const data = await getOrdersByPhone(phone);
      setOrders(data.orders || []);
      setSearched(true);
    } catch {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleRepeat = async (order: Order) => {
    // Build cart items; try to fetch fresh prices
    try {
      const freshItems = buildRepeatCartItems(order);

      // Check each product still exists
      const available = await Promise.allSettled(
        order.products.map((p) => getProducts({ limit: 1 }).then(() => p)),
      );

      const validItems = freshItems.filter(
        (_, i) => available[i].status === "fulfilled",
      );
      const removedCount = freshItems.length - validItems.length;

      repeatOrder(validItems);

      if (removedCount > 0) {
        toast.success(
          `${validItems.length} items added (${removedCount} unavailable)`,
        );
      } else {
        toast.success(t("repeatSuccess"));
      }
      navigate("/cart");
    } catch {
      // Fallback: just add all
      repeatOrder(buildRepeatCartItems(order));
      toast.success(t("repeatSuccess"));
      navigate("/cart");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Title */}
      <h1 className="text-xl font-semibold text-stone-900 mb-4">
        {t("myOrders")}
      </h1>

      {/* Phone lookup */}
      <div className="bg-white rounded-2xl p-4 md:p-6 mb-5  max-w-3xl mx-auto">
        <p className="text-xs md:text-sm text-stone-500 mb-3 font-medium">
          {t("enterPhone")}
        </p>

        <div className="flex flex-col md:flex-row gap-3">
          {/* Input */}
          <div className="relative flex-1">
            <Phone
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="tel"
              maxLength={10}
              className="
              w-full pl-9 pr-3 py-2.5 md:py-3
              rounded-full bg-stone-100
              text-sm md:text-base
              outline-none
              focus:ring-2 focus:ring-green-200
            "
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="98765 43210"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          {/* Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="
            bg-green-500 text-white
            px-5 py-2.5 md:py-3
            rounded-full text-sm md:text-base
            font-medium
            hover:bg-green-600 transition
            whitespace-nowrap
          "
          >
            {loading ? "…" : t("lookupOrders")}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {searched && orders.length === 0 && (
        <div className="text-center py-10 text-stone-500">{t("noOrders")}</div>
      )}

      {!searched ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-stone-500">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Package size={28} className="text-green-600" />
          </div>

          {/* <p className="text-sm font-semibold text-stone-700">
            {t("trackYourOrders") || "Track your orders"}
          </p> */}

          <p className="text-xs text-stone-400 mt-1 max-w-xs">
            {"Enter your phone number to view your orders and track deliveries"}
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-stone-500">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <Package size={28} className="text-stone-400" />
          </div>

          <p className="text-sm font-semibold text-stone-700">
            {t("noOrders") || "No orders found"}
          </p>

          <p className="text-xs text-stone-400 mt-1">
            {"Try another phone number"}
          </p>
        </div>
      ) : null}

      {/* Orders */}
      <div
        className="
    space-y-4
    md:space-y-0 md:grid md:grid-cols-2 md:gap-5
  "
      >
        {orders.map((order) => (
          <div
            key={order.orderId}
            className="
        bg-stone-50 rounded-2xl p-4 md:p-5
        border border-stone-100
        shadow-[0_2px_6px_rgba(0,0,0,0.04)]
        flex flex-col justify-between
      "
          >
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="flex gap-3 items-start">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e"
                  className="w-12 h-12 rounded-xl object-cover"
                />

                <div>
                  <p className="text-[15px] font-semibold text-stone-800 leading-tight">
                    {order.products[0]?.productName}
                  </p>

                  <p className="text-xs text-stone-500 mt-0.5">
                    ₹{order.finalAmount.toFixed(0)} ·{" "}
                    {order.products[0]?.size || ""}
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-400 font-medium">
                #{order.orderId}
              </p>
            </div>

            {/* Middle */}
            <div className="flex justify-between items-end mt-4">
              <div>
                <p className="text-[11px] text-stone-400 flex items-center gap-1">
                  <Clock size={12} />
                  Estimated Arrival
                </p>

                <p className="text-sm font-semibold text-stone-800 mt-1">
                  {order.deliverySlot}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-stone-400">Now</p>
                <p className="text-sm font-medium text-stone-700">
                  {order.orderStatus}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                className="
            flex-1 rounded-full
            border border-stone-200
            bg-white
            py-2.5 text-sm font-medium
            text-stone-600
            hover:bg-stone-100 transition
          "
              >
                Back
              </button>

              <button
                onClick={() => handleRepeat(order)}
                className="
            flex-1 rounded-full
            bg-green-500
            py-2.5 text-sm font-semibold
            text-white
            shadow-[0_4px_10px_rgba(46,158,79,0.25)]
            hover:bg-green-600 transition
          "
              >
                Reorder
              </button>
            </div>

            {/* Expand toggle */}
            <div
              className="flex justify-center mt-3 cursor-pointer"
              onClick={() =>
                setExpandedId(
                  expandedId === order.orderId ? null : order.orderId,
                )
              }
            >
              {expandedId === order.orderId ? (
                <ChevronUp size={18} className="text-stone-400" />
              ) : (
                <ChevronDown size={18} className="text-stone-400" />
              )}
            </div>

            {/* Expanded */}
            {expandedId === order.orderId && (
              <div className="mt-4 pt-3 border-t border-stone-200 text-xs text-stone-500 space-y-2">
                {order.products.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {p.productName} ×{p.quantity}
                    </span>
                    <span className="font-semibold text-stone-800">
                      ₹{p.totalPrice.toFixed(0)}
                    </span>
                  </div>
                ))}

                <div className="pt-2 space-y-1">
                  <p className="flex items-center gap-1">
                    <Clock size={12} />
                    {order.deliveryDate} · {order.deliverySlot}
                  </p>

                  <p className="flex items-center gap-1">
                    <MapPin size={12} />
                    {order.address}, {order.pincode}
                  </p>

                  <p className="flex items-center gap-1">
                    <CreditCard size={12} />
                    {order.paymentMethod} · {order.paymentStatus}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
