import React, { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import { useLanguage } from "../context/LanguageContext";
import Navbar from "./Navbar";
import { Link, useNavigate } from "react-router-dom";
import {
  Apple,
  ChevronRight,
  CookingPot,
  CreditCard,
  Leaf,
  Milk,
  Package,
  RefreshCw,
  Repeat,
  Sandwich,
  Truck,
  Wheat,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../api/categories";
import Footer from "./Footer";
import { getProducts } from "../api/products";
import { ProductCardSkeleton } from "./Loader";
import ProductCard from "./ProductCard";
import OfferBanner from "./OfferBanner";
import { buildRepeatCartItems, getOrdersByPhone } from "../api/orders";
import { useCartStore } from "../store/cartStore";
import toast from "react-hot-toast";
import ProductsPage from "../pages/ProductsPage";

const banners = [
  {
    title: "Extra 15% OFF",
    subtitle: "Superb Spreads",
    tag: "LIMITED TIME ONLY",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e",
  },
  {
    title: "Fresh Vegetables",
    subtitle: "Farm to Home",
    tag: "NEW ARRIVAL",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf",
  },
  {
    title: "Healthy Fruits",
    subtitle: "Natural Energy",
    tag: "TODAY SPECIAL",
    image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b",
  },
];

const defaultCategories = [
  { name: "Whole Wheat Flour", nameHi: "आटा", icon: Wheat },
  { name: "Gram Flour", nameHi: "बेसन", icon: CookingPot },
];

const CAT_ICONS: any = {
  vegetables: Leaf,
  fruits: Apple,
  dairy: Milk,
  bakery: Sandwich,

  default: Package,
};

export default function GroceryHome() {
  const { t, lang, toggleLang } = useLanguage();
  const repeatOrder = useCartStore((s) => s.repeatOrder);
  const navigate = useNavigate();

  const customerPhone = useCartStore((s) => s.customerInfo.phone);
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

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
    <div className="min-h-screen bg-white flex justify-center  ">
      {/* App Container */}
      <div className="w-full max-w-7xl bg-white border border-gray-200 border-[1px] shadow-3xl border-b-[0px] border-t-[0px] flex flex-col overflow-hidden">
        {/* Left Side (Main Content) */}
        <div className="flex-1 p-6 lg:p-10">
          {/* Header */}

          {/* Mobile Search */}
          <div className="md:hidden  flex gap-3">
            <SearchBar />
          </div>

          <BannerCarousel />
          {lastOrder && (
            <section className="max-w-7xl mx-auto px-4 mt-6">
              <div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 
                  bg-[#F7FAF7] border border-[#E6F4EA] 
                  rounded-2xl p-4 sm:p-5 
                  shadow-sm transition-all"
              >
                {/* LEFT CONTENT */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center 
                      bg-[#E8F5E9] rounded-xl"
                  >
                    <RefreshCw size={18} className="text-[#2E7D32]" />
                  </div>

                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      {t("reorderLastPurchase")}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lastOrder.products.length} items · ₹
                      {lastOrder.finalAmount}
                    </p>
                  </div>
                </div>

                {/* BUTTON */}
                <button
                  onClick={handleRepeatLastOrder}
                  className="
                  w-full sm:w-auto
                  bg-[#E8F5E9] text-[#2E7D32]
                  font-semibold text-sm
                  px-4 py-2
                  rounded-xl
                  hover:bg-[#DFF3E3]
                  transition-all
                  active:scale-[0.98]
                "
                >
                  {t("reorderBtn")}
                </button>
              </div>
            </section>
          )}

          {/* Categories */}
          <div className="mt-10">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">
                {lang === "hi" ? "श्रेणी के अनुसार खरीदें" : "Shop By Category"}
              </h3>
              <Link
                to="/products"
                className="text-green-600 text-sm flex items-center gap-1 hover:underline"
              >
                {lang === "hi" ? "सभी देखें" : "See All"}
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 mt-5">
              {/* Categories from database */}
              {categoriesData?.categories?.map((cat: any) => {
                const Icon = CAT_ICONS[cat.name] || CAT_ICONS.Default;

                return (
                  <Link
                    key={cat.categoryId}
                    to={`/products?category=${cat.categoryId}`}
                  >
                    <Category
                      name={lang === "hi" && cat.nameHi ? cat.nameHi : cat.name}
                      icon={Icon}
                    />
                  </Link>
                );
              })}

              {/* Fallback static categories */}
              {defaultCategories
                .filter(
                  (cat) =>
                    !(categoriesData?.categories || []).some(
                      (dbCat) =>
                        dbCat.name.toLowerCase() === cat.name.toLowerCase(),
                    ),
                )
                .map((cat) => {
                  const Icon = cat.icon;

                  return (
                    <Link key={cat.name} to={`/products?category=${cat.name}`}>
                      <Category
                        name={lang === "hi" ? cat.nameHi : cat.name}
                        icon={Icon}
                      />
                    </Link>
                  );
                })}
            </div>
          </div>
          {/* ── Featured Products ─────────────────────────────── */}
          {!productsLoading && productsData?.products?.length ? (
            <section className="mt-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-lg">
                  {t("featuredProducts")}
                </h2>
                <Link
                  to="/products"
                  className="text-amber-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  {lang === "hi" ? "सभी देखें" : "See All"}{" "}
                  <ChevronRight size={16} />
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
              </div>
            </section>
          ) : null}
          <OfferBanner />
        </div>
        <ProductsPage />
      </div>
      {/* ── Benefits strip ────────────────────────────────── */}
    </div>
  );
}

function Category({ name, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-3 bg-gray-100 px-5 py-3 rounded-xl text-sm hover:bg-gray-200 cursor-pointer transition">
      <Icon size={18} className="text-green-600" />
      <span className="font-medium text-stone-700">{name}</span>
    </div>
  );
}

export function BannerCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div
      className="mt-8 max-w-5xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Desktop stacked cards */}
      <div className="relative h-60 lg:h-72 overflow-visible mt-2 mb-2">
        {banners.map((b, i) => {
          const offset = (i - index + banners.length) % banners.length;

          return (
            <div
              key={i}
              className={`absolute w-full will-change-transform transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                offset === 0
                  ? "z-30 opacity-100 translate-x-0 scale-100"
                  : offset === 1
                    ? "z-20 opacity-80 translate-x-[20px] lg:translate-x-[40px] scale-95"
                    : "z-10 opacity-60 translate-x-[40px] lg:translate-x-[80px] scale-90"
              }`}
            >
              <BannerCard banner={b} />
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 mt-8 md:mt-0">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-green-500" : "w-2 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function BannerCard({ banner }: any) {
  return (
    <div className="bg-lime-200 rounded-3xl p-8 relative overflow-hidden flex items-center h-64">
      <div className="max-w-md">
        <p className="text-xs text-gray-600">{banner.tag}</p>

        <h2 className="text-2xl lg:text-3xl font-semibold mt-2 leading-snug">
          {banner.title}
          <br />
          {banner.subtitle}
        </h2>

        <button className="mt-5 bg-green-500 text-white px-6 py-2 rounded-full text-sm">
          Buy Now
        </button>
      </div>

      <img
        src={banner.image}
        className="absolute right-0 bottom-0 w-40 lg:w-60"
      />
    </div>
  );
}
