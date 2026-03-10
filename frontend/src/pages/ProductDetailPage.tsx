import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingCart, Bell, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getProduct } from '../api/products';
import { useCartStore } from '../store/cartStore';
import { Loader, ErrorMessage } from '../components/Loader';
import toast from 'react-hot-toast';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=500&fit=crop';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { addItem, addSubscribeItem, setSubFrequency, setSubCustomDays } = useCartStore();

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
  const [customDays, setCustomDays] = useState<number>(30); // Default to 30

  if (isLoading) return <Loader text={t('loading')} />;
  if (isError || !product) return <ErrorMessage message={t('error')} onRetry={() => refetch()} />;

  const name = lang === 'hi' && product.nameHi ? product.nameHi : product.name;
  const description = lang === 'hi' && product.descriptionHi ? product.descriptionHi : product.description;
  const hasVariants = product.variants.length > 0;

  const selectedVariant = hasVariants
    ? product.variants.find(v => v._id === selectedVariantId) || product.variants[0]
    : null;

  const displayPrice = (selectedVariant && selectedVariant.price > 0) ? selectedVariant.price : product.pricing.basePrice;
  const basePrice    = product.pricing.mrp > displayPrice ? product.pricing.mrp : displayPrice;
  const discount     = basePrice > displayPrice ? Math.round(((basePrice - displayPrice) / basePrice) * 100) : 0;
  const stockCount   = product.inventory.quantity;
  const isOutOfStock = product.stockStatus === 'out_of_stock' || stockCount === 0;

  const totalAmountString = selectedVariant && selectedVariant.weight > 0 
    ? `${selectedVariant.weight * quantity} ${selectedVariant.unit}` 
    : `${quantity} ${product.pricing.unit}`;

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
      unitPrice: displayPrice,
      categoryId: product.categoryId,
    });
    toast.success(`${name} ${t('addToCart')} ✓`);
    navigate('/cart');
  };

  const handleSubscribe = () => {
    if (isOutOfStock) return;
    
    // 1. Add item to cart
    addItem({
      productId: product.productId,
      productName: product.name,
      productNameHi: product.nameHi,
      imageUrl: product.images?.[0] || PLACEHOLDER,
      variantId: selectedVariant?._id,
      size: selectedVariant && selectedVariant.weight > 0 ? `${selectedVariant.weight}${selectedVariant.unit}` : `${quantity} ${product.pricing.unit}`,
      quantity,
      unitPrice: displayPrice,
      categoryId: product.categoryId,
    });

    // 2. Add it to the subscribe list within cart payload
    addSubscribeItem(product.productId);

    // 3. Set global frequency
    setSubFrequency(frequency);
    if (frequency === 'custom') {
      setSubCustomDays(customDays);
    }

    // 4. Send to Checkout explicitly
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
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="aspect-square rounded-3xl overflow-hidden bg-amber-50 shadow-lg">
          <img
            src={product.images?.[0] || PLACEHOLDER}
            alt={name}
            className="w-full h-full object-cover"
          />
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

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-stone-900">₹{displayPrice}</span>
            <span className="text-sm font-semibold text-stone-500">
              / {selectedVariant && selectedVariant.weight > 0 ? `${selectedVariant.weight}${selectedVariant.unit}` : product.pricing.unit}
            </span>
            {discount > 0 && (
              <>
                <span className="text-lg text-stone-400 line-through">₹{basePrice}</span>
                <span className="pill-amber">{discount}% {t('discount')}</span>
              </>
            )}
          </div>
          {selectedVariant && selectedVariant.weight > 0 && (
            <p className="text-xs text-stone-500 font-medium">
              Base rate: ₹{product.pricing.basePrice} / {product.pricing.unit}
            </p>
          )}

          {/* Stock */}
          <div>
            {isOutOfStock
              ? <span className="pill-red">{t('outOfStock')}</span>
              : <span className="pill-green">{t('inStock')} ({stockCount} units)</span>
            }
          </div>

          {/* Variant selector */}
          {hasVariants && (
            <div>
              <p className="label">{t('selectVariant')}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v, i) => {
                  const truePrice = v.price > 0 ? v.price : product.pricing.basePrice;
                  return (
                  <button
                    key={v._id || i}
                    onClick={() => setSelectedVariantId(v._id)}
                    disabled={isOutOfStock}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      (selectedVariantId || product.variants[0]._id) === v._id
                        ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                        : isOutOfStock
                          ? 'border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400'
                    }`}
                  >
                    <span>{v.weight > 0 ? `${v.weight}${v.unit}` : 'Loose'}</span>
                    <span className="block text-xs font-semibold opacity-80">₹{truePrice}</span>
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
                className={`btn-primary py-4 text-base ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ShoppingCart size={18} />
                {isOutOfStock ? t('outOfStock') : t('addToCart')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
