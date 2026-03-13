import React, { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import { useLanguage } from "../context/LanguageContext";
import Navbar from "./Navbar";
import { Link } from "react-router-dom";
import {
  Apple,
  CookingPot,
  CreditCard,
  Leaf,
  Milk,
  Package,
  Repeat,
  Sandwich,
  Truck,
  Wheat,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../api/categories";
import Footer from "./Footer";

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
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center  ">
      {/* App Container */}
      <div className="w-full max-w-7xl bg-white border border-gray-200 border-[1px] shadow-3xl flex overflow-hidden">
        {/* Left Side (Main Content) */}
        <div className="flex-1 p-6 lg:p-10">
          {/* Header */}
          <Navbar />
          {/* Mobile Search */}
          <div className="md:hidden mt-4 flex gap-3">
            <SearchBar />
          </div>

          <BannerCarousel />

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

          {/* Products */}
          <div className="mt-10">
            <h3 className="font-semibold text-lg">Popular Products</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
              <Product />
            </div>
          </div>
          <section className="py-10">
            <div className="max-w-2xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ">
                {[
                  {
                    icon: Wheat,
                    title: lang === "hi" ? "ताज़ा आटा" : "Fresh Atta",
                    sub: lang === "hi" ? "ऑर्डर पर पिसा" : "Ground on Order",
                  },
                  {
                    icon: Truck,
                    title: lang === "hi" ? "घर डिलीवरी" : "Home Delivery",
                    sub: lang === "hi" ? "सीधे आपके घर" : "Straight to Door",
                  },
                  {
                    icon: Repeat,
                    title: lang === "hi" ? "सब्सक्रिप्शन" : "Subscription",
                    sub:
                      lang === "hi" ? "साप्ताहिक • मासिक" : "Weekly • Monthly",
                  },
                  {
                    icon: CreditCard,
                    title: lang === "hi" ? "आसान भुगतान" : "Easy Pay",
                    sub: "UPI • GPay • COD",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="bg-white rounded-2xl p-4 flex flex-col items-center text-center"
                    >
                      <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center mb-2">
                        <Icon size={20} className="text-green-600" />
                      </div>

                      <p className="font-semibold text-sm text-stone-800">
                        {item.title}
                      </p>

                      <p className="text-xs text-stone-400 mt-1">{item.sub}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <Footer />
        </div>

        {/* Right Sidebar */}
        {/* Desktop Sidebar Overlay */}

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 flex justify-center">
          <div className="w-full max-w-md bg-green-500 rounded-t-3xl px-8 py-4 flex justify-between text-white">
            <NavItem label="Home" active />
            <NavItem label="Wishlist" />
            <NavItem label="Orders" />
            <NavItem label="Profile" />
          </div>
        </div>
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

function Product() {
  return (
    <div className="bg-lime-100 rounded-2xl p-4 hover:shadow-md transition">
      <img
        src="https://images.unsplash.com/photo-1587049352851-8d4e89133924"
        className="w-full h-28 object-contain"
      />

      <h4 className="font-medium text-sm mt-3">Coconut Clarity</h4>
      <p className="text-xs text-gray-500">13.5 oz can</p>

      <div className="flex items-center gap-1 mt-2 text-sm">
        ⭐ <span>4.8</span>
      </div>
    </div>
  );
}

function NavItem({ label, active }: any) {
  return (
    <div
      className={`px-4 py-2 rounded-full text-sm ${
        active ? "bg-yellow-300 text-black" : ""
      }`}
    >
      {label}
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
