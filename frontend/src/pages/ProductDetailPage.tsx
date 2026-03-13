import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingCart, Bell, Zap, Flame } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getProduct } from '../api/products';
import { useCartStore } from '../store/cartStore';
import { Loader, ErrorMessage } from '../components/Loader';
import {
  useActiveOffers,
  getProductOffer,
  calcOfferPrice,
  CountdownTimer,
} from '../components/OfferBanner';
import toast from 'react-hot-toast';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=500&fit=crop';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { addItem, addSubscribeItem, setSubFrequency, setSubCustomDays } = useCartStore();
  const offers = useActiveOffers();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId!),
    enabled: !!productId,
  });

  const product = data?.product;
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [subscribeMode, setSubscribeMode] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [customDays, setCustomDays] = useState<number>(30);

  if (isLoading) return <Loader text={t('loading')} />;
  if (isError || !product) return <ErrorMessage message={t('error')} onRetry={() => refetch()} />;

  const name = lang === 'hi' && product.nameHi ? product.nameHi : product.name;
  const description = lang === 'hi' && product.descriptionHi ? product.descriptionHi : product.description;
  const validVariants = product.variants?.filter(v => v.price > 0 && v.weight > 0) || [];
  const hasVariants = validVariants.length > 0;

  const selectedVariant = hasVariants
    ? validVariants.find(v => v._id === selectedVariantId) || validVariants[0]
    : null;

  const displayPrice = (selectedVariant && selectedVariant.price > 0) ? selectedVariant.price : product.pricing.basePrice;
  const mrpPrice = product.pricing.mrp > displayPrice ? product.pricing.mrp : displayPrice;

  // ─── Offer Logic ──────────────────────────────────────────
  const offer = getProductOffer(product.productId, product.categoryId, offers);
  const hasOffer = !!offer;
  const offerPrice = hasOffer ? calcOfferPrice(displayPrice, offer!) : displayPrice;
  const effectivePrice = hasOffer ? offerPrice : displayPrice;
  const strikePrice = hasOffer ? displayPrice : (mrpPrice > displayPrice ? mrpPrice : 0);
  const discountPct = strikePrice > 0 && strikePrice !== effectivePrice
    ? Math.round(((strikePrice - effectivePrice) / strikePrice) * 100)
    : (mrpPrice > displayPrice ? Math.round(((mrpPrice - displayPrice) / mrpPrice) * 100) : 0);
  // ──────────────────────────────────────────────────────────

  const stockCount = product.inventory.quantity;
  const isOutOfStock = product.stockStatus === 'out_of_stock' || stockCount === 0;

  const totalAmountString = selectedVariant && selectedVariant.weight > 0
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
      size: selectedVariant && selectedVariant.weight > 0 ? `${selectedVariant.weight}${selectedVariant.unit}` : `${quantity} ${product.pricing.unit}`,
      quantity,
      unitPrice: effectivePrice,     // ← Uses offer price!
      categoryId: product.categoryId,
    });
    toast.success(`${name} ${t('addToCart')} ✔`);
    navigate('/cart');
  };

  const handleSubscribe = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.productId,
      productName: product.name,
      productNameHi: product.nameHi,
      imageUrl: product.images?.[0] || PLACEHOLDER,
      variantId: selectedVariant?._id,
      size: selectedVariant && selectedVariant.weight > 0 ? `${selectedVariant.weight}${selectedVariant.unit}` : `${quantity} ${product.pricing.unit}`,
      quantity,
      unitPrice: effectivePrice,     // ← Uses offer price!
      categoryId: product.categoryId,
    });
    addSubscribeItem(product.productId);
    setSubFrequency(frequency);
    if (frequency === 'custom') {
      setSubCustomDays(customDays);
    }
    navigate('/checkout');
  };

  const freqOptions: { label: string; value: 'weekly' | 'biweekly' | 'monthly' | 'custom' }[] = [
    { label: t('weekly'), value: 'weekly' },
    { label: t('biweekly'), value: 'biweekly' },
    { label: t('monthly'), value: 'monthly' },
    { label: 'Custom', value: 'custom' }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ─── Offer Banner (above product) ───────────────────── */}
      {hasOffer && (
        <div className="mb-6 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl p-4 md:p-5 text-white relative overflow-hidden animate-fade-in-up">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-16 h-16 bg-white/5 rounded-full translate-y-1/2" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center offer-icon-pulse">
                <Flame size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                  {offer!.type === 'flash_sale' ? '⚡ Flash Sale' : offer!.type === 'category_sale' ? '🏷️ Category Sale' : '🎉 Special Offer'}
                </p>
                <p className="font-extrabold text-lg leading-tight">
                  {lang === 'hi' && offer!.titleHi ? offer!.titleHi : offer!.title}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-lg font-extrabold">
                {offer!.discountType === 'percentage'
                  ? `${offer!.discountValue}% OFF`
                  : `₹${offer!.discountValue} OFF`}
              </span>
              <CountdownTimer endDate={offer!.endDate} />
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className={`relative aspect-square rounded-3xl overflow-hidden bg-amber-50 shadow-lg ${hasOffer ? 'ring-2 ring-red-300 ring-offset-2' : ''}`}>
          <img
            src={product.images?.[0] || PLACEHOLDER}
            alt={name}
            className="w-full h-full object-cover"
          />
          {/* Sale badge on image */}
          {hasOffer && (
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="bg-red-500 text-white text-sm font-extrabold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 animate-offer-pulse">
                <Zap size={14} />
                {offer!.discountType === 'percentage'
                  ? `−${offer!.discountValue}%`
                  : `−₹${offer!.discountValue}`}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div>
            <span className="pill-amber text-xs mb-2 inline-block">{product.categoryId}</span>
            <h1 className="text-2xl font-extrabold text-stone-900 leading-tight">{name}</h1>
            {description && (
              <p className="text-stone-500 text-sm mt-2 leading-relaxed">{description}</p>
            )}
          </div>

          {/* ─── Price Section (offer-aware) ───────────────── */}
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className={`text-3xl font-extrabold ${hasOffer ? 'text-red-600' : 'text-stone-900'}`}>
                ₹{effectivePrice}
              </span>
              <span className="text-sm font-semibold text-stone-500">
                / {selectedVariant && selectedVariant.weight > 0 ? `${selectedVariant.weight}${selectedVariant.unit}` : product.pricing.unit}
              </span>

              {/* Strikethrough: show original price if offer, or MRP if MRP discount */}
              {strikePrice > 0 && strikePrice !== effectivePrice && (
                <span className="text-lg text-stone-400 line-through">₹{strikePrice}</span>
              )}
              {discountPct > 0 && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${hasOffer ? 'bg-red-100 text-red-700' : 'pill-amber'}`}>
                  {hasOffer && <Zap size={10} className="inline mr-0.5" />}
                  {discountPct}% {t('discount')}
                </span>
              )}
            </div>

            {/* Savings callout for offers */}
            {hasOffer && (
              <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <span className="text-green-600 text-lg">🎉</span>
                <span className="text-sm font-bold text-green-700">
                  {lang === 'hi'
                    ? `आप ₹${displayPrice - effectivePrice} बचा रहे हैं!`
                    : `You save ₹${displayPrice - effectivePrice} with this offer!`}
                </span>
              </div>
            )}

            {selectedVariant && selectedVariant.weight > 0 && (
              <p className="text-xs text-stone-500 font-medium mt-1">
                Base rate: ₹{hasOffer ? Math.round(effectivePrice / selectedVariant.weight) : product.pricing.basePrice} / {product.pricing.unit}
                {hasOffer && (
                  <span className="text-stone-400 line-through ml-2">₹{product.pricing.basePrice} / {product.pricing.unit}</span>
                )}
              </p>
            )}
          </div>

          {/* Stock */}
          <div>
            {isOutOfStock
              ? <span className="pill-red">{t('outOfStock')}</span>
              : <span className="pill-green">{t('inStock')} ({stockCount} units)</span>
            }
          </div>

          {/* ─── Variant selector (offer-aware prices) ─────── */}
          {hasVariants && (
            <div>
              <p className="label">{t('selectVariant')}</p>
              <div className="flex flex-wrap gap-2">
                {validVariants.map((v, i) => {
                  const truePrice = v.price > 0 ? v.price : product.pricing.basePrice;
                  const varOfferPrice = getVariantOfferPrice(truePrice);
                  const isSelected = (selectedVariantId || validVariants[0]._id) === v._id;

                  return (
                    <button
                      key={v._id || i}
                      onClick={() => setSelectedVariantId(v._id)}
                      disabled={isOutOfStock}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        isSelected
                          ? hasOffer
                            ? 'border-red-500 bg-red-500 text-white shadow-md'
                            : 'border-amber-500 bg-amber-500 text-white shadow-md'
                          : isOutOfStock
                            ? 'border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400'
                      }`}
                    >
                      <span>{v.weight > 0 ? `${v.weight}${v.unit}` : 'Loose'}</span>
                      <span className="block text-xs font-semibold opacity-80">
                        {hasOffer ? (
                          <>
                            <span className={isSelected ? 'text-white' : 'text-red-600'}>₹{varOfferPrice}</span>
                            <span className={`line-through ml-1 ${isSelected ? 'text-white/60' : 'text-stone-400'}`}>₹{truePrice}</span>
                          </>
                        ) : (
                          `₹${truePrice}`
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="label">{t('quantity')}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(0.5, q - 0.5))} className="stepper-btn"><Minus size={16} /></button>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="w-14 text-center font-extrabold text-lg bg-transparent border-b-2 border-stone-200 focus:border-amber-500 outline-none transition"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) setQuantity(val);
                  }}
                />
                <button onClick={() => setQuantity(q => q + 0.5)} className="stepper-btn"><Plus size={16} /></button>
              </div>
              <div className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                Total: {totalAmountString}
              </div>
            </div>

            {/* Total price with offer */}
            {hasOffer && quantity > 0 && (
              <div className="mt-2 text-sm font-bold text-red-600 flex items-center gap-1.5">
                <Zap size={14} />
                {lang === 'hi'
                  ? `ऑफर मूल्य: ₹${effectivePrice * quantity}`
                  : `Offer Total: ₹${effectivePrice * quantity}`}
                <span className="text-stone-400 line-through font-normal ml-1">
                  ₹{displayPrice * quantity}
                </span>
              </div>
            )}
          </div>

          {/* Subscribe toggle */}
          <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setSubscribeMode(m => !m)}
                className={`w-11 h-6 rounded-full relative transition-colors ${subscribeMode ? 'bg-amber-500' : 'bg-stone-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${subscribeMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="font-semibold text-stone-800 text-sm">{t('subscribeProduct')}</span>
            </label>

            {subscribeMode && (
              <div className="mt-3 animate-fade-in-up space-y-3">
                <p className="label">{t('subscriptionPlan')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {freqOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFrequency(opt.value)}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        frequency === opt.value
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {frequency === 'custom' && (
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 animate-fade-in flex items-center gap-3">
                    <span className="text-sm text-stone-600 font-medium">Deliver every</span>
                    <input
                      type="number" min="1" max="90"
                      className="input w-20 py-1.5 px-3 text-center !text-sm"
                      value={customDays || ''}
                      placeholder="e.g. 8"
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-sm text-stone-600 font-medium">days</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3 mt-2">
            {subscribeMode ? (
              <button
                onClick={handleSubscribe}
                disabled={isOutOfStock}
                className={`btn-primary py-4 text-base ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Bell size={18} />
                {t('addSubscription')}
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`py-4 text-base font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.97] ${
                  isOutOfStock
                    ? 'bg-stone-300 text-white cursor-not-allowed opacity-50'
                    : hasOffer
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 shadow-red-200'
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                }`}
              >
                <ShoppingCart size={18} />
                {isOutOfStock
                  ? t('outOfStock')
                  : hasOffer
                  ? (lang === 'hi' ? `₹${effectivePrice * quantity} में कार्ट में डालें` : `Add to Cart — ₹${effectivePrice * quantity}`)
                  : t('addToCart')}
              </button>
            )}
          </div>

          {/* Specifications */}
          {((lang === 'hi' && product.specificationsHi && Object.keys(product.specificationsHi).length > 0) ||
            (product.specifications && Object.keys(product.specifications).length > 0)) && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">{t('specifications') || (lang === 'hi' ? 'विशेष विवरण' : 'Specifications')}</h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                {Object.entries((lang === 'hi' && product.specificationsHi && Object.keys(product.specificationsHi).length > 0) ? product.specificationsHi : (product.specifications || {})).map(([key, value]) => (
                  <div key={key} className="flex flex-col bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <span className="text-stone-500 font-medium text-xs uppercase tracking-wider mb-1">{key}</span>
                    <span className="text-stone-800 font-semibold">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}