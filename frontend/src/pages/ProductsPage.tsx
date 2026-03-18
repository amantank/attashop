import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../context/LanguageContext";
import { getProducts } from "../api/products";
import { getCategories } from "../api/categories";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { ProductCardSkeleton, EmptyState } from "../components/Loader";

export default function ProductsPage() {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") || "";

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", selectedCategory],
    queryFn: () =>
      getProducts({ category: selectedCategory || undefined, limit: 50 }),
  });

  const cats = categoriesData?.categories || [];

  const fallbackCats = [
    { categoryId: "Atta", name: "Atta", nameHi: "आटा" },
    { categoryId: "Rice", name: "Rice", nameHi: "चावल" },
    { categoryId: "Dal", name: "Dal", nameHi: "दाल" },
    { categoryId: "Spices", name: "Spices", nameHi: "मसाले" },
    { categoryId: "Oil", name: "Oil", nameHi: "तेल" },
  ];

  const displayCats = [
    { categoryId: "", name: t("allCategories"), nameHi: t("allCategories") },
    ...fallbackCats.filter(
      (c) =>
        !cats.some(
          (dbCat) => dbCat.name.toLowerCase() === c.name.toLowerCase(),
        ),
    ),
    ...cats,
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-6 border h-screen h-full border-b-[0px] border-t-[0px] ">
      {/* Header */}
      <div className="flex md:hidden flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold text-stone-900">
          {t("products")}
        </h1>
        <div>
          <SearchBar />
        </div>
      </div>

      {/* Category pills */}
      <nav className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
        {displayCats.map((cat) => (
          <button
            key={cat.categoryId}
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              if (cat.categoryId) params.set("category", cat.categoryId);
              else params.delete("category");
              setSearchParams(params);
            }}
            className={`
                flex items-center justify-center
                px-4 py-2
                rounded-full
                text-sm font-medium
                whitespace-nowrap
                transition-all duration-200 ease-in-out

              ${
                selectedCategory === cat.categoryId ||
                (!selectedCategory && !cat.categoryId)
                  ? "bg-[#E8F5E9] text-[#2E7D32] shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }
           `}
          >
            {lang === "hi" && cat.nameHi ? cat.nameHi : cat.name}
          </button>
        ))}
      </nav>

      {/* Products grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : !productsData?.products?.length ? (
        <EmptyState
          icon="🌾"
          title={lang === "hi" ? "कोई उत्पाद नहीं मिला" : "No products found"}
          description={
            lang === "hi"
              ? "इस श्रेणी में कोई उत्पाद नहीं है।"
              : "No products in this category yet."
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productsData.products.map((p) => (
            <ProductCard key={p.productId} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
