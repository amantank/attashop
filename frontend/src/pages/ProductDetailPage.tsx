import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart, Bell, Zap, Flame } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { getProduct } from "../api/products";
import { useCartStore } from "../store/cartStore";
import { Loader, ErrorMessage } from "../components/Loader";
import {
  useActiveOffers,
  getProductOffer,
  calcOfferPrice,
  CountdownTimer,
} from "../components/OfferBanner";
import toast from "react-hot-toast";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=500&fit=crop";

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { addItem, addSubscribeItem, setSubFrequency, setSubCustomDays } =
    useCartStore();
  const offers = useActiveOffers();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId!),
    enabled: !!productId,
  });

  const product = data?.product;
  const [selectedVariantId, setSelectedVariantId] = useState<
    string | undefined
  >();
  const [quantity, setQuantity] = useState(1);
  const [subscribeMode, setSubscribeMode] = useState(false);
  const [frequency, setFrequency] = useState<
    "weekly" | "biweekly" | "monthly" | "custom"
  >("weekly");
  const [customDays, setCustomDays] = useState<number>(30);

  if (isLoading) return <Loader text={t("loading")} />;
  if (isError || !product)
    return <ErrorMessage message={t("error")} onRetry={() => refetch()} />;

  const name = lang === "hi" && product.nameHi ? product.nameHi : product.name;
  const description =
    lang === "hi" && product.descriptionHi
      ? product.descriptionHi
      : product.description;
  const validVariants =
    product.variants?.filter((v) => v.price > 0 && v.weight > 0) || [];
  const hasVariants = validVariants.length > 0;

  const selectedVariant = hasVariants
    ? validVariants.find((v) => v._id === selectedVariantId) || validVariants[0]
    : null;

  const displayPrice =
    selectedVariant && selectedVariant.price > 0
      ? selectedVariant.price
      : product.pricing.basePrice;
  const mrpPrice =
    product.pricing.mrp > displayPrice ? product.pricing.mrp : displayPrice;

  // ─── Offer Logic ──────────────────────────────────────────
  const offer = getProductOffer(product.productId, product.categoryId, offers);
  const hasOffer = !!offer;
  const offerPrice = hasOffer
    ? calcOfferPrice(displayPrice, offer!)
    : displayPrice;
  const effectivePrice = hasOffer ? offerPrice : displayPrice;
  const strikePrice = hasOffer
    ? displayPrice
    : mrpPrice > displayPrice
      ? mrpPrice
      : 0;
  const discountPct =
    strikePrice > 0 && strikePrice !== effectivePrice
      ? Math.round(((strikePrice - effectivePrice) / strikePrice) * 100)
      : mrpPrice > displayPrice
        ? Math.round(((mrpPrice - displayPrice) / mrpPrice) * 100)
        : 0;
  // ──────────────────────────────────────────────────────────

  const stockCount = product.inventory.quantity;
  const isOutOfStock =
    product.stockStatus === "out_of_stock" || stockCount === 0;

  const totalAmountString =
    selectedVariant && selectedVariant.weight > 0
      ? `${selectedVariant.weight * quantity} ${selectedVariant.unit}`
      : `${quantity} ${product.pricing.unit}`;

  // Helper: calc offer price for any variant
  const getVariantOfferPrice = (variantPrice: number) => {
    if (!hasOffer) return variantPrice;
    return calcOfferPrice(variantPrice, offer!);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.productId,
      productName: product.name,
      productNameHi: product.nameHi,
      imageUrl: product.images?.[0] || PLACEHOLDER,
      variantId: selectedVariant?._id,
      size:
        selectedVariant && selectedVariant.weight > 0
          ? `${selectedVariant.weight}${selectedVariant.unit}`
          : `${quantity} ${product.pricing.unit}`,
      quantity,
      unitPrice: effectivePrice, // ← Uses offer price!
      categoryId: product.categoryId,
    });
    toast.success(`${name} ${t("addToCart")} ✔`);
    navigate("/cart");
  };

  const handleSubscribe = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.productId,
      productName: product.name,
      productNameHi: product.nameHi,
      imageUrl: product.images?.[0] || PLACEHOLDER,
      variantId: selectedVariant?._id,
      size:
        selectedVariant && selectedVariant.weight > 0
          ? `${selectedVariant.weight}${selectedVariant.unit}`
          : `${quantity} ${product.pricing.unit}`,
      quantity,
      unitPrice: effectivePrice, // ← Uses offer price!
      categoryId: product.categoryId,
    });
    addSubscribeItem(product.productId);
    setSubFrequency(frequency);
    if (frequency === "custom") {
      setSubCustomDays(customDays);
    }
    navigate("/checkout");
  };

  const freqOptions: {
    label: string;
    value: "weekly" | "biweekly" | "monthly" | "custom";
  }[] = [
    { label: t("weekly"), value: "weekly" },
    { label: t("biweekly"), value: "biweekly" },
    { label: t("monthly"), value: "monthly" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ─── Offer Banner (above product) ───────────────────── */}
      {hasOffer && (
        <div
          className="mb-4 flex items-center justify-between gap-3 
            bg-orange-50 border border-orange-200 
            rounded-xl px-3 py-2 shadow-sm"
        >
          {/* Left */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
              <Flame size={14} />
            </div>

            <div className="truncate">
              <p className="text-[11px] font-semibold text-orange-500 leading-none">
                {offer!.type === "flash_sale"
                  ? "Flash Sale"
                  : offer!.type === "category_sale"
                    ? "Category Sale"
                    : "Special Offer"}
              </p>

              <p className="text-sm font-semibold text-gray-900 truncate">
                {lang === "hi" && offer!.titleHi
                  ? offer!.titleHi
                  : offer!.title}
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
              {offer!.discountType === "percentage"
                ? `${offer!.discountValue}%`
                : `₹${offer!.discountValue}`}
            </span>

            <div className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
              <CountdownTimer endDate={offer!.endDate} />
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div
          className={`relative aspect-square rounded-3xl overflow-hidden 
  bg-gradient-to-br from-green-50 to-amber-50 shadow-md 
  ${hasOffer ? "shadow-lg" : ""}`}
        >
          <img
            src={product.images?.[0] || PLACEHOLDER}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />

          {/* Subtle Offer Badge */}
          {hasOffer && (
            <div className="absolute top-4 left-4">
              <span
                className="
        backdrop-blur-md bg-white/70 
        text-green-700 text-xs font-semibold 
        px-3 py-1 rounded-full 
        shadow-sm border border-white/40
        flex items-center gap-1
      "
              >
                <Zap size={12} className="text-green-600" />
                {offer!.discountType === "percentage"
                  ? `${offer!.discountValue}% OFF`
                  : `₹${offer!.discountValue} OFF`}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div className="w-full max-w-2xl lg:max-w-3xl space-y-1.5 lg:space-y-2">
            {/* Category */}
            <span
              className="inline-block px-3 py-1 rounded-full 
    bg-amber-100 text-amber-700 text-[11px] font-medium tracking-wide"
            >
              {product.categoryId}
            </span>

            {/* Title + Price */}
            <div className="flex items-start justify-between gap-4">
              <h1
                className="text-[18px] sm:text-[20px] lg:text-[22px] 
      font-semibold text-stone-900 leading-snug"
              >
                {name}
              </h1>

              {/* Price */}
              <div className="text-right shrink-0">
                <div className="flex items-baseline justify-end gap-1.5">
                  <span
                    className={`text-[18px] sm:text-[20px] font-semibold 
          ${hasOffer ? "text-green-600" : "text-stone-900"}`}
                  >
                    {selectedVariant && selectedVariant.weight > 0 && (
                      <p>
                        ₹
                        {hasOffer
                          ? Math.round(effectivePrice / selectedVariant.weight)
                          : product.pricing.basePrice}{" "}
                        / {product.pricing.unit}
                        {hasOffer && (
                          <span className="text-stone-400 line-through ml-2">
                            ₹{product.pricing.basePrice} /{" "}
                            <span className="text-[18px] text-stone-400 font-medium">
                              {product.pricing.unit}
                            </span>
                          </span>
                        )}
                      </p>
                    )}
                  </span>
                </div>

                {/* Strike + Discount */}
                {(strikePrice > 0 && strikePrice !== effectivePrice) ||
                discountPct > 0 ? (
                  <div className="flex items-center justify-end gap-2 mt-0.5">
                    {strikePrice > 0 && strikePrice !== effectivePrice && (
                      <span className="text-[12px] text-stone-400 line-through">
                        ₹{strikePrice}
                      </span>
                    )}

                    {discountPct > 0 && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full 
              bg-green-100 text-green-700"
                      >
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Description */}
            {description && (
              <p
                className="text-stone-500 text-[13px] sm:text-[14px] 
      leading-relaxed max-w-prose"
              >
                {description}
              </p>
            )}
          </div>

          {/* Specifications */}
          {((lang === "hi" &&
            product.specificationsHi &&
            Object.keys(product.specificationsHi).length > 0) ||
            (product.specifications &&
              Object.keys(product.specifications).length > 0)) && (
            <div className="mt-6 pt-5 border-t border-stone-100">
              {/* Heading */}
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-stone-900 mb-3">
                {t("specifications") ||
                  (lang === "hi" ? "विशेष विवरण" : "Specifications")}
              </h3>

              {/* Specs */}
              <div className="divide-y divide-stone-100">
                {Object.entries(
                  lang === "hi" &&
                    product.specificationsHi &&
                    Object.keys(product.specificationsHi).length > 0
                    ? product.specificationsHi
                    : product.specifications || {},
                ).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between py-2.5 gap-4"
                  >
                    {/* Key */}
                    <span className="text-[12px] sm:text-[13px] text-stone-500 font-medium">
                      {key}
                    </span>

                    {/* Value */}
                    <span className="text-[13px] sm:text-[14px] text-stone-800 font-medium text-right">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Price Section (offer-aware) ───────────────── */}
          <div>
            {/* Savings callout for offers */}
            {hasOffer && (
              <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <span className="text-green-600 text-lg">🎉</span>
                <span className="text-sm font-bold text-green-700">
                  {lang === "hi"
                    ? `आप ₹${displayPrice - effectivePrice} बचा रहे हैं!`
                    : `You save ₹${displayPrice - effectivePrice} with this offer!`}
                </span>
              </div>
            )}

            {selectedVariant && selectedVariant.weight > 0 && (
              <p className="text-xs text-stone-500 font-medium mt-1">
                Base rate: ₹
                {hasOffer
                  ? Math.round(effectivePrice / selectedVariant.weight)
                  : product.pricing.basePrice}{" "}
                / {product.pricing.unit}
                {hasOffer && (
                  <span className="text-stone-400 line-through ml-2">
                    ₹{product.pricing.basePrice} / {product.pricing.unit}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center">
            {isOutOfStock ? (
              <span
                className="inline-flex items-center gap-1.5 
      px-2.5 py-1 rounded-full 
      bg-red-50 text-red-600 
      text-[11px] sm:text-xs font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {t("outOfStock")}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 
      px-2.5 py-1 rounded-full 
      bg-green-50 text-green-600 
      text-[11px] sm:text-xs font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {t("inStock")}
                <span className="text-stone-400 font-normal">
                  ({stockCount})
                </span>
              </span>
            )}
          </div>

          {/* ─── Variant selector (offer-aware prices) ─────── */}
          {hasVariants && (
            <div className="mt-4">
              {/* Label */}
              <p className="text-[13px] font-medium text-stone-600 mb-2">
                {t("selectVariant")}
              </p>

              {/* Variants */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {validVariants.map((v, i) => {
                  const truePrice =
                    v.price > 0 ? v.price : product.pricing.basePrice;
                  const varOfferPrice = getVariantOfferPrice(truePrice);
                  const isSelected =
                    (selectedVariantId || validVariants[0]._id) === v._id;

                  return (
                    <button
                      key={v._id || i}
                      onClick={() => setSelectedVariantId(v._id)}
                      disabled={isOutOfStock}
                      className={`
              flex flex-col items-start justify-center
              px-3 py-2 rounded-xl 
              border transition-all duration-200
              min-w-[110px]

              ${
                isSelected
                  ? "bg-green-50 border-green-400 shadow-sm"
                  : isOutOfStock
                    ? "bg-stone-50 border-stone-200 text-stone-300 cursor-not-allowed"
                    : "bg-white border-stone-200 hover:border-green-300 hover:bg-green-50/40"
              }
            `}
                    >
                      {/* Weight */}
                      <span
                        className={`text-[13px] font-medium ${
                          isSelected ? "text-green-700" : "text-stone-800"
                        }`}
                      >
                        {v.weight > 0 ? `${v.weight}${v.unit}` : "Loose"}
                      </span>

                      {/* Price */}
                      <div className="flex items-center gap-1 mt-0.5">
                        {hasOffer ? (
                          <>
                            <span
                              className={`text-[13px] font-semibold ${
                                isSelected ? "text-green-700" : "text-green-600"
                              }`}
                            >
                              ₹{varOfferPrice}
                            </span>

                            <span className="text-[11px] text-stone-400 line-through">
                              ₹{truePrice}
                            </span>
                          </>
                        ) : (
                          <span className="text-[13px] font-semibold text-stone-800">
                            ₹{truePrice}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className="
  fixed bottom-0 left-0 right-0 z-50
  px-4 py-6 pb-16 md:pb-6

  border-stone-200
border md:shadow-md
  bg-white 

  w-full md:max-w-2xl
   md:left-1/2 md:right-auto md:-translate-x-1/2
  md:rounded-t-3xl
"
          >
            <div>
              <div className="space-y-3">
                {/* Subscribe Toggle */}
                <div className="flex md:hidden items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
                  <span className="text-sm text-stone-700 font-medium">
                    {t("subscribeProduct")}
                  </span>

                  <div
                    onClick={() => setSubscribeMode((m) => !m)}
                    className={`w-10 h-5 rounded-full relative cursor-pointer transition ${
                      subscribeMode ? "bg-green-500" : "bg-stone-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition ${
                        subscribeMode ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </div>

                {/* Subscription Options */}
                {subscribeMode && (
                  <div className="space-y-2 md:hidden">
                    <div className="grid grid-cols-3 gap-2">
                      {freqOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFrequency(opt.value)}
                          className={`py-1.5 rounded-lg text-[11px] font-medium transition ${
                            frequency === opt.value
                              ? "bg-green-500 text-white"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {frequency === "custom" && (
                      <div className="flex items-center gap-2 text-xs text-stone-600">
                        Every
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={customDays || ""}
                          onChange={(e) =>
                            setCustomDays(parseInt(e.target.value) || 0)
                          }
                          className="w-14 text-center bg-white border border-stone-200 rounded-md py-1"
                        />
                        days
                      </div>
                    )}
                  </div>
                )}
                {/* Quantity + CTA (SAME ROW) */}
                <div className="flex items-center gap-3">
                  {/* Quantity */}
                  <div className="flex items-center gap-2 bg-stone-100 s rounded-full px-2 py-1.5">
                    <button
                      onClick={() => setQuantity((q) => Math.max(0.5, q - 0.5))}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95"
                    >
                      <Minus size={14} />
                    </button>

                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) setQuantity(val);
                      }}
                      className="w-10 text-center text-sm font-medium bg-transparent outline-none"
                    />

                    <button
                      onClick={() => setQuantity((q) => q + 0.5)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* CTA BUTTON */}
                  <button
                    onClick={subscribeMode ? handleSubscribe : handleAddToCart}
                    disabled={isOutOfStock}
                    className={`
                      flex-1 py-3 rounded-3xl text-sm font-semibold 
                      flex items-center justify-center gap-2 
                      transition-all duration-200 

                      ${
                        isOutOfStock
                          ? "bg-stone-300 text-white opacity-50"
                          : subscribeMode
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-green-500 text-white hover:bg-green-600"
                      }
                    `}
                  >
                    {subscribeMode ? (
                      <Bell size={16} />
                    ) : (
                      <ShoppingCart size={16} />
                    )}

                    {isOutOfStock
                      ? t("outOfStock")
                      : subscribeMode
                        ? t("addSubscription")
                        : `Add — ₹${effectivePrice * quantity} | ${totalAmountString}`}
                  </button>
                  <div>
                    <div className="flex md:block hidden items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
                      <span className="text-sm text-stone-700 font-medium">
                        {t("subscribeProduct")}
                      </span>

                      <div
                        onClick={() => setSubscribeMode((m) => !m)}
                        className={`w-10 h-5 rounded-full relative cursor-pointer transition ${
                          subscribeMode ? "bg-green-500" : "bg-stone-300"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition ${
                            subscribeMode ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Subscription Options */}
                    {subscribeMode && (
                      <div className="space-y-2 md:block hidden">
                        <div className="grid grid-cols-3 gap-2">
                          {freqOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setFrequency(opt.value)}
                              className={`py-1.5 rounded-lg text-[11px] font-medium transition ${
                                frequency === opt.value
                                  ? "bg-green-500 text-white"
                                  : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {frequency === "custom" && (
                          <div className="flex items-center gap-2 text-xs text-stone-600">
                            Every
                            <input
                              type="number"
                              min="1"
                              max="90"
                              value={customDays || ""}
                              onChange={(e) =>
                                setCustomDays(parseInt(e.target.value) || 0)
                              }
                              className="w-14 text-center bg-white border border-stone-200 rounded-md py-1"
                            />
                            days
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
