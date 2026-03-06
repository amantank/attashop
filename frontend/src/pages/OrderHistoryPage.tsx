import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getOrdersByPhone, buildRepeatCartItems } from '../api/orders';
import { getProducts } from '../api/products';
import { useCartStore } from '../store/cartStore';
import type { Order } from '../types';
import OrderStatusBadge from '../components/OrderStatusBadge';
import toast from 'react-hot-toast';

export default function OrderHistoryPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const repeatOrder = useCartStore(s => s.repeatOrder);

  const handleSearch = async () => {
    if (phone.length < 10) { toast.error(lang === 'hi' ? 'वैध फोन नंबर दर्ज करें' : 'Enter a valid phone number'); return; }
    setLoading(true);
    try {
      const data = await getOrdersByPhone(phone);
      setOrders(data.orders || []);
      setSearched(true);
    } catch { toast.error(t('error')); }
    finally { setLoading(false); }
  };

  const handleRepeat = async (order: Order) => {
    // Build cart items; try to fetch fresh prices
    try {
      const freshItems = buildRepeatCartItems(order);

      // Check each product still exists
      const available = await Promise.allSettled(
        order.products.map(p => getProducts({ limit: 1 }).then(() => p))
      );

      const validItems = freshItems.filter((_, i) => available[i].status === 'fulfilled');
      const removedCount = freshItems.length - validItems.length;

      repeatOrder(validItems);

      if (removedCount > 0) {
        toast.success(`${validItems.length} items added (${removedCount} unavailable)`);
      } else {
        toast.success(t('repeatSuccess'));
      }
      navigate('/cart');
    } catch {
      // Fallback: just add all
      repeatOrder(buildRepeatCartItems(order));
      toast.success(t('repeatSuccess'));
      navigate('/cart');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-stone-900 mb-6">{t('myOrders')}</h1>

      {/* Phone lookup */}
      <div className="card p-5 mb-6">
        <p className="text-sm text-stone-600 mb-3 font-medium">{t('enterPhone')}</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="tel"
              maxLength={10}
              className="input pl-9"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="98765 43210"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} disabled={loading} className="btn-primary px-6">
            {loading ? '…' : t('lookupOrders')}
          </button>
        </div>
      </div>

      {/* Results */}
      {searched && orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">📦</p>
          <p className="text-stone-500 font-medium">{t('noOrders')}</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.orderId} className="card overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition"
              onClick={() => setExpandedId(expandedId === order.orderId ? null : order.orderId)}
            >
              <div>
                <p className="font-bold text-stone-900 font-mono text-sm">{order.orderId}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('orderDate')}: {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="font-extrabold text-stone-900">₹{order.finalAmount.toFixed(0)}</p>
                  <p className="text-xs text-stone-400">{order.products.length} items</p>
                </div>
                <OrderStatusBadge status={order.orderStatus} size="sm" />
                {expandedId === order.orderId ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === order.orderId && (
              <div className="border-t border-stone-100 p-4 bg-stone-50 animate-fade-in-up">
                {/* Products */}
                <div className="space-y-2 mb-4">
                  {order.products.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm text-stone-600">
                      <span>{p.productName} {p.size && `(${p.size})`} ×{p.quantity}</span>
                      <span className="font-bold text-stone-800">₹{p.totalPrice.toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Delivery */}
                <div className="text-xs text-stone-500 mb-4 space-y-0.5">
                  <p>📅 {order.deliveryDate} · ⏰ {order.deliverySlot}</p>
                  <p>📍 {order.address}, {order.pincode}</p>
                  <p>💳 {order.paymentMethod.toUpperCase()} · {order.paymentStatus.toUpperCase()}</p>
                </div>

                {/* Repeat button */}
                <button
                  onClick={() => handleRepeat(order)}
                  className="btn-primary w-full sm:w-auto"
                >
                  <RefreshCw size={16} /> {t('repeatOrder')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
