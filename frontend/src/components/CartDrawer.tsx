// frontend/src/components/CartDrawer.tsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useLanguage } from "../context/LanguageContext";
import CartItemRow from "./CartItemRow";
import { calculateDeliveryCharge } from "../api/delivery";

export default function CartDrawer() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);

  const {
    cartDrawerOpen,
    closeCartDrawer,
    items,
    subtotal,
    deliveryCharge,
    setDeliveryCharge,
    customerInfo,
    total,
  } = useCartStore();

  const sub = subtotal();

  // Auto-calculate delivery charge when cart changes
  useEffect(() => {
    if (customerInfo.pincode) {
      calculateDeliveryCharge(customerInfo.pincode, sub).then(
        setDeliveryCharge,
      );
    }
  }, [sub, customerInfo.pincode, setDeliveryCharge]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (cartDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartDrawerOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCartDrawer();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeCartDrawer]);

  const handleCheckout = () => {
    closeCartDrawer();
    navigate("/checkout");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCartDrawer}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          cartDrawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer — slides in from the LEFT */}
      <div
        ref={drawerRef}
        className={`fixed left-0 top-0 h-full z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${cartDrawerOpen ? "translate-x-0 pb-14 md:pb-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-amber-500" />
            <h2 className="text-lg font-extrabold text-stone-900">
              {t("yourCart")}
            </h2>
          </div>
          <button
            onClick={closeCartDrawer}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-500 transition"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-3">
              <div className="text-6xl">🛒</div>
              <h3 className="text-xl font-bold text-stone-800">
                {t("emptyCart")}
              </h3>
              <p className="text-stone-400 text-sm">{t("emptyCartDesc")}</p>
              <button
                onClick={() => {
                  closeCartDrawer();
                  navigate("/products");
                }}
                className="mt-2 btn-primary text-sm px-5 py-2.5"
              >
                {t("continueShopping")}
              </button>
            </div>
          ) : (
            /* Cart items */
            <div className="space-y-1">
              {items.map((item) => (
                <CartItemRow
                  key={`${item.productId}-${item.variantId}`}
                  item={item}
                />
              ))}

              {/* Continue shopping link */}
              <button
                onClick={() => {
                  closeCartDrawer();
                  navigate("/products");
                }}
                className="inline-flex items-center gap-1 text-amber-600 text-sm font-semibold mt-3 hover:gap-2 transition-all"
              >
                ← {t("continueShopping")}
              </button>
            </div>
          )}
        </div>

        {/* Footer — Summary + Checkout (only when items exist) */}
        {items.length > 0 && (
          <div className="border-t border-stone-100 px-5 py-4 bg-white space-y-3">
            {/* Price breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-stone-500">
                <span>{t("subtotal")}</span>
                <span className="font-semibold text-stone-800">
                  ₹{sub.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>{t("deliveryCharge")}</span>
                <span
                  className={`font-semibold ${
                    deliveryCharge === 0 ? "text-green-600" : "text-stone-800"
                  }`}
                >
                  {deliveryCharge === 0 ? t("free") : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="h-px bg-stone-100" />
              <div className="flex justify-between">
                <span className="font-bold text-stone-900">{t("total")}</span>
                <span className="font-extrabold text-amber-600 text-lg">
                  ₹{total().toFixed(0)}
                </span>
              </div>
            </div>

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
            >
              {t("proceedToCheckout")} <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
