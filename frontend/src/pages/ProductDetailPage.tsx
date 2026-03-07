import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingCart, Bell, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getProduct } from '../api/products';
import { createSubscription } from '../api/subscriptions';
import { placeOrder } from '../api/orders';
import { useCartStore } from '../store/cartStore';
import { Loader, ErrorMessage } from '../components/Loader';
import toast from 'react-hot-toast';
import type { SubscriptionFrequency, PaymentMethod } from '../types';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=500&fit=crop';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const addItem = useCartStore(s => s.addItem);
  const customerInfo = useCartStore(s => s.customerInfo);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId!),
    enabled: !!productId,
  });

  const product = data?.product;
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [subscribeMode, setSubscribeMode] = useState(false);
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('weekly');
  const [customDays, setCustomDays] = useState<number>(30); // Default to 30
  const [subName, setSubName] = useState(customerInfo.name || '');
  const [subPhone, setSubPhone] = useState(customerInfo.phone || '');
  const [subAddress, setSubAddress] = useState(customerInfo.address || '');
  const [subPincode, setSubPincode] = useState(customerInfo.pincode || '');
  const [subLoading, setSubLoading] = useState(false);

  if (isLoading) return <Loader text={t('loading')} />;
  if (isError || !product) return <ErrorMessage message={t('error')} onRetry={() => refetch()} />;

  const name = lang === 'hi' && product.nameHi ? product.nameHi : product.name;
  const description = lang === 'hi' && product.descriptionHi ? product.descriptionHi : product.description;
  const hasVariants = product.variants.length > 0;

  const selectedVariant = hasVariants
    ? product.variants.find(v => v.variantId === selectedVariantId) || product.variants[0]
    : null;

  const displayPrice = selectedVariant ? selectedVariant.finalPrice : product.finalPrice;
  const basePrice   = selectedVariant ? selectedVariant.price : product.price;
  const discount    = selectedVariant ? selectedVariant.discount : product.discount;
  const stockCount  = selectedVariant ? selectedVariant.stock : product.stock;
  const isOutOfStock = stockCount === 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.productId,
      productName: product.name,
      productNameHi: product.nameHi,
      imageUrl: product.imageUrl || PLACEHOLDER,
      variantId: selectedVariant?.variantId,
      size: selectedVariant?.size,
      quantity,
      unitPrice: displayPrice,
      categoryId: product.categoryId,
    });
    toast.success(`${name} ${t('addToCart')} ✓`);
    navigate('/cart');
  };

  const handleSubscribe = async () => {
    if (!subName.trim()) { toast.error('Please enter your name'); return; }
    if (subPhone.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    if (!subAddress.trim()) { toast.error('Please enter your address'); return; }
    if (subPincode.length !== 6) { toast.error('Enter a valid 6-digit pincode'); return; }
    setSubLoading(true);
    try {
      // Create Subscription
      await createSubscription({
        customerName: subName,
        phoneNumber: subPhone,
        address: subAddress,
        pincode: subPincode,
        productId: product.productId,
        productName: product.name,
        variantId: selectedVariant?.variantId,
        quantity,
        frequency,
        customDays: frequency === 'custom' ? customDays : undefined,
        paymentMethod: 'cod', // Hardcoded COD for native product page subscriptions for now
      });

      // Place initial Order for today
      await placeOrder({
        customerName: subName,
        phoneNumber: subPhone,
        address: subAddress,
        pincode: subPincode,
        products: [
          {
            productId: product.productId,
            variantId: selectedVariant?.variantId,
            quantity,
          }
        ],
        paymentMethod: 'cod',
        deliveryDate: new Date().toISOString().split('T')[0],
        deliverySlot: 'Anytime',
      });

      toast.success(lang === 'hi' ? 'सब्सक्रिप्शन बना दिया गया!' : 'Subscription created!');
      navigate('/subscriptions');
    } catch {
      toast.error(t('error'));
    } finally {
      setSubLoading(false);
    }
  };

  const freqOptions: { label: string; value: SubscriptionFrequency }[] = [
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
            src={product.imageUrl || PLACEHOLDER}
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
            {discount > 0 && (
              <>
                <span className="text-lg text-stone-400 line-through">₹{basePrice}</span>
                <span className="pill-amber">{discount}% {t('discount')}</span>
              </>
            )}
          </div>

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
                {product.variants.map(v => (
                  <button
                    key={v.variantId}
                    onClick={() => setSelectedVariantId(v.variantId)}
                    disabled={v.stock === 0}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      (selectedVariantId || product.variants[0].variantId) === v.variantId
                        ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                        : v.stock === 0
                          ? 'border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400'
                    }`}
                  >
                    <span>{v.size}</span>
                    <span className="block text-xs font-semibold opacity-80">₹{v.finalPrice}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="label">{t('quantity')}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="stepper-btn"><Minus size={16} /></button>
              <span className="w-10 text-center font-extrabold text-lg">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="stepper-btn"><Plus size={16} /></button>
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
                <div className="border-t border-amber-200 pt-3 space-y-2">
                  <p className="label text-xs text-stone-500">Delivery Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input text-sm" placeholder="Full Name" value={subName} onChange={e => setSubName(e.target.value)} />
                    <input className="input text-sm" placeholder="Phone (10 digits)" maxLength={10} value={subPhone} onChange={e => setSubPhone(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <input className="input text-sm" placeholder="Full Address" value={subAddress} onChange={e => setSubAddress(e.target.value)} />
                  <input className="input text-sm" placeholder="Pincode (6 digits)" maxLength={6} value={subPincode} onChange={e => setSubPincode(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3 mt-2">
            {subscribeMode ? (
              <button
                onClick={handleSubscribe}
                disabled={subLoading || isOutOfStock}
                className="btn-primary py-4 text-base"
              >
                <Bell size={18} />
                {subLoading ? t('loading') : t('addSubscription')}
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
