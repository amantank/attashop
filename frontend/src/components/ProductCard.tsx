import { Link } from "react-router-dom";
import { ShoppingCart, Star, Zap } from "lucide-react";
import type { Product } from "../types";
import { useCartStore } from "../store/cartStore";
import { useLanguage } from "../context/LanguageContext";
import {
  useActiveOffers,
  getProductOffer,
  calcOfferPrice,
} from "./OfferBanner";
import toast from "react-hot-toast";

interface Props {
  product: Product;
}

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop";

export default function ProductCard({ product }: Props) {
  const { t, lang } = useLanguage();
  const addItem = useCartStore((s) => s.addItem);
  const offers = useActiveOffers();

  const name = lang === "hi" && product.nameHi ? product.nameHi : product.name;
  const validVariants =
    product.variants?.filter((v) => v.price > 0 && v.weight > 0) || [];
  const hasVariants = validVariants.length > 0;
  const defaultVariant = hasVariants ? validVariants[0] : null;
  const displayPrice =
    defaultVariant && defaultVariant.price > 0
      ? defaultVariant.price
      : product.pricing.basePrice;
  const basePrice =
    product.pricing.mrp > displayPrice ? product.pricing.mrp : displayPrice;

  // ─── Offer logic ───────────────────────────────────────
  const offer = getProductOffer(product.productId, product.categoryId, offers);
  const hasOffer = !!offer;
  const offerPrice = hasOffer
    ? calcOfferPrice(displayPrice, offer!)
    : displayPrice;
  const effectivePrice = hasOffer ? offerPrice : displayPrice;
  const strikePrice = hasOffer
    ? displayPrice
    : basePrice > displayPrice
      ? basePrice
      : 0;
  const discountPct =
    strikePrice > 0
      ? Math.round(((strikePrice - effectivePrice) / strikePrice) * 100)
      : 0;
  // ──────────────────────────────────────────────────────

  const totalStock = product.inventory.quantity;
  const isOutOfStock =
    totalStock === 0 || product.stockStatus === "out_of_stock";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    addItem({
      productId: product.productId,
      productName: product.name,
      productNameHi: product.nameHi,
      imageUrl: product.images?.[0] || PLACEHOLDER,
      variantId: defaultVariant?._id,
      size: defaultVariant
        ? defaultVariant.weight > 0
          ? `${defaultVariant.weight}${defaultVariant.unit}`
          : "Loose"
        : undefined,
      quantity: 1,
      unitPrice: effectivePrice,
      categoryId: product.categoryId,
    });
    toast.success(`${name} ${t("addToCart")} ✔`);
  };

  return (
    <Link to={`/products/${product.productId}`} className="block h-full group">
      <div
        className="h-full flex flex-col bg-white border border-gray-100 rounded-2xl 
                  overflow-hidden transition-all duration-300 hover:shadow-md"
      >
        {/* IMAGE */}
        <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-4">
          <img
            src={product.images?.[0] || PLACEHOLDER}
            alt={name}
            className="max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* SUBTLE DISCOUNT BADGE */}
          {discountPct > 0 && (
            <div
              className="absolute top-2 left-2 bg-[#E8F5E9] text-[#2E7D32] 
                        text-[10px] font-semibold px-2 py-1 rounded-full"
            >
              {discountPct}% OFF
            </div>
          )}

          {/* FEATURED */}
          {product.isFeatured && !hasOffer && (
            <div
              className="absolute top-2 right-2 w-7 h-7 bg-yellow-100 
                        rounded-full flex items-center justify-center"
            >
              <Star size={12} className="text-yellow-600" />
            </div>
          )}

          {/* OUT OF STOCK */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {t("outOfStock")}
              </span>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex flex-col flex-1 p-3">
          {/* CATEGORY */}
          <p className="text-[11px] text-gray-400 mb-1 truncate">
            {product.categoryId}
          </p>

          {/* NAME (FIXED HEIGHT) */}
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px]">
            {name}
          </h3>

          {/* VARIANTS */}
          {hasVariants && (
            <div className="flex flex-wrap gap-1 mt-1">
              {validVariants.slice(0, 2).map((v, i) => (
                <span
                  key={v._id || i}
                  className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full"
                >
                  {v.weight > 0 ? `${v.weight}${v.unit}` : "Loose"}
                </span>
              ))}
            </div>
          )}

          {/* PUSH DOWN */}
          <div className="flex-1" />

          {/* PRICE + BUTTON */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">
                ₹{effectivePrice}
              </span>

              {strikePrice > 0 && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{strikePrice}
                </span>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`
            w-9 h-9 flex items-center justify-center rounded-full
            transition-all
            ${
              isOutOfStock
                ? "bg-gray-100 text-gray-300"
                : "bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#DFF3E3] active:scale-90"
            }
          `}
            >
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
