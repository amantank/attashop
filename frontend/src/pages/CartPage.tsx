import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useLanguage } from '../context/LanguageContext';
import CartItemRow from '../components/CartItemRow';
import { calculateDeliveryCharge } from '../api/delivery';

export default function CartPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, subtotal, deliveryCharge, setDeliveryCharge, customerInfo, total } = useCartStore();
  const sub = subtotal();

  // Auto-calculate delivery charge when cart changes
  useEffect(() => {
    if (customerInfo.pincode) {
      calculateDeliveryCharge(customerInfo.pincode, sub).then(setDeliveryCharge);
    }
  }, [sub, customerInfo.pincode, setDeliveryCharge]);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-7xl mb-4">🛒</div>
        <h2 className="text-2xl font-extrabold text-stone-800 mb-2">{t('emptyCart')}</h2>
        <p className="text-stone-500 mb-6">{t('emptyCartDesc')}</p>
        <Link to="/products" className="btn-primary">{t('continueShopping')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-stone-900 mb-6 flex items-center gap-2">
        <ShoppingBag size={26} className="text-amber-500" />
        {t('yourCart')}
      </h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 card p-4">
          {items.map(item => (
            <CartItemRow key={`${item.productId}-${item.variantId}`} item={item} />
          ))}
          <Link to="/products" className="inline-flex items-center gap-1 text-amber-600 text-sm font-semibold mt-4 hover:gap-2 transition-all">
            ← {t('continueShopping')}
          </Link>
        </div>

        {/* Summary */}
        <div className="card p-5 h-fit">
          <h2 className="font-extrabold text-stone-900 text-lg mb-4">{t('orderSummary')}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>{t('subtotal')}</span><span className="font-bold text-stone-900">₹{sub.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>{t('deliveryCharge')}</span>
              <span className={`font-bold ${deliveryCharge === 0 ? 'text-green-600' : 'text-stone-900'}`}>
                {deliveryCharge === 0 ? t('free') : `₹${deliveryCharge}`}
              </span>
            </div>
            <div className="h-px bg-stone-100 my-2" />
            <div className="flex justify-between">
              <span className="font-bold text-stone-900 text-base">{t('total')}</span>
              <span className="font-extrabold text-amber-600 text-xl">₹{total().toFixed(0)}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="btn-primary w-full mt-5 py-3.5 text-base"
          >
            {t('proceedToCheckout')} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
