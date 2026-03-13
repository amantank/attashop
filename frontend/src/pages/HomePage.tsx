import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../context/LanguageContext";
import { getProducts } from "../api/products";
import { getCategories } from "../api/categories";
import { getOrdersByPhone } from "../api/orders";
import { useCartStore } from "../store/cartStore";
import { buildRepeatCartItems } from "../api/orders";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { ProductCardSkeleton } from "../components/Loader";
import OfferBanner from "../components/OfferBanner";
import toast from "react-hot-toast";
import GroceryHome from "../components/GroceryHome";

// Category icons mapping
const CAT_ICONS: Record<string, string> = {
  Atta: "🌾",
  Rice: "🍚",
  Dal: "🫘",
  Spices: "🌶️",
  Oil: "🫙",
  Flour: "🌾",
  Sugar: "🍬",
  Salt: "🧂",
  Default: "🛒",
};

export default function HomePage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const repeatOrder = useCartStore((s) => s.repeatOrder);
  const customerPhone = useCartStore((s) => s.customerInfo.phone);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => getProducts({ featured: true, limit: 8 }),
  });

  const { data: lastOrderData } = useQuery({
    queryKey: ["last-order", customerPhone],
    queryFn: () => getOrdersByPhone(customerPhone),
    enabled: !!customerPhone,
  });

  const lastOrder = lastOrderData?.orders?.[0];

  const handleRepeatLastOrder = () => {
    if (!lastOrder) return;
    const items = buildRepeatCartItems(lastOrder);
    repeatOrder(items);
    toast.success(t("repeatSuccess"));
    navigate("/cart");
  };

  return (
    <div>
      <GroceryHome />
      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="hero-bg relative overflow-hidden grain">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left z-10">
            <span className="pill-amber inline-flex mb-4 gap-1.5">
              <Sparkles size={12} /> Fresh & Pure
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 leading-tight mb-2">
              {t("heroTitle")}
            </h1>

            <p className="text-stone-600 mb-8 text-base md:text-lg">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link to="/products" className="btn-primary px-8 py-3 text-base">
                {t("shopNow")} <ArrowRight size={18} />
              </Link>
              <Link
                to="/subscriptions"
                className="btn-outline px-8 py-3 text-base"
              >
                {t("subscribe")}
              </Link>
            </div>
          </div>
          {/* Decorative grain illustration */}
          <div className="flex-1 flex justify-center">
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              <div className="absolute inset-0 bg-amber-300/30 rounded-full blur-3xl" />
              <img
                src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=600&fit=crop"
                alt="Fresh flour"
                className="relative w-full h-full object-cover rounded-3xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <OfferBanner />
      {/* ── Reorder Banner ───────────────────────────────── */}
      {lastOrder && (
        <section className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-lg animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <RefreshCw size={20} className="text-white" />
              </div>
              <div className="text-white">
                <p className="font-bold text-sm">{t("reorderLastPurchase")}</p>
                <p className="text-xs text-amber-100">
                  {lastOrder.products.length} items · ₹{lastOrder.finalAmount}
                </p>
              </div>
            </div>
            <button
              onClick={handleRepeatLastOrder}
              className="bg-white text-amber-600 font-bold text-sm px-4 py-2 rounded-xl hover:shadow-md transition shrink-0"
            >
              {t("reorderBtn")}
            </button>
          </div>
        </section>
      )}

      {/* ── Featured Products ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 mt-10 mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-stone-900">
            {t("featuredProducts")}
          </h2>
          <Link
            to="/products"
            className="text-amber-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
          >
            {lang === "hi" ? "सभी देखें" : "See All"} <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))
            : productsData?.products?.map((p) => (
                <ProductCard key={p.productId} product={p} />
              ))}
          {!productsLoading && !productsData?.products?.length && (
            <div className="col-span-full text-center py-12 text-stone-400">
              <p className="text-lg">🌾</p>
              <p className="mt-2 text-sm">Products coming soon!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
