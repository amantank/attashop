import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Package, Calendar, CreditCard, Home } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getOrder } from '../api/orders';
import { Loader, ErrorMessage } from '../components/Loader';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from '../services/socket';

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { t, lang } = useLanguage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId!),
    enabled: !!orderId,
  });

  const order = data?.order;

  // React to realtime payment updates
  useEffect(() => {
    if (!orderId || !order) return;
    
    if (order.paymentStatus === 'pending' && ['upi', 'gpay', 'paytm'].includes(order.paymentMethod)) {
      socket.emit('join_order_room', orderId);

      const handlePaymentUpdate = (update: { orderId: string; status: string }) => {
        if (update.orderId === orderId && update.status === 'paid') {
          refetch();
        }
      };

      socket.on('payment_updated', handlePaymentUpdate);

      return () => {
        socket.off('payment_updated', handlePaymentUpdate);
      };
    }
  }, [orderId, order, refetch]);

  if (isLoading) return <Loader text={t('loading')} />;
  if (isError || !order) return <ErrorMessage message={t('error')} onRetry={() => refetch()} />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Success / Pending animation */}
      <div className="text-center mb-8 h-[300px] flex flex-col justify-center items-center relative">
        {order.paymentStatus === 'pending' && ['upi', 'gpay', 'paytm'].includes(order.paymentMethod) ? (
          <div className="flex flex-col items-center animate-fade-in absolute w-full inset-0">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-stone-200 inline-block mb-4 mt-2">
              <QRCodeSVG 
                value={`upi://pay?pa=${import.meta.env.VITE_UPI_ID || 'store@upi'}&pn=${import.meta.env.VITE_SHOP_NAME || 'Store'}&am=${order.finalAmount}&cu=INR`} 
                size={160}
                level="H"
              />
            </div>
            <h1 className="text-lg font-extrabold text-stone-900 mb-2">Waiting for Payment...</h1>
            <p className="text-sm text-stone-500 mb-3">
              Scan QR code to pay <strong className="text-stone-800">₹{order.finalAmount.toFixed(0)}</strong>
            </p>
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-1.5 rounded-full text-xs font-bold border border-amber-200 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Real-time sync active
            </div>
          </div>
        ) : (
          <div className="animate-bounce-in absolute w-full inset-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 size={44} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-stone-900 mb-1">{t('orderPlaced')}</h1>
            <p className="text-stone-500 text-sm hidden sm:block">{t('orderConfirmMsg')}</p>
          </div>
        )}
      </div>

      <div className="card p-6 space-y-5">
        {/* Order ID */}
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <Package size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-xs text-stone-500">{t('orderId')}</p>
            <p className="font-extrabold text-amber-700 font-mono text-sm">{order.orderId}</p>
          </div>
          <div className="ml-auto">
            <OrderStatusBadge status={order.orderStatus} />
          </div>
        </div>

        {/* Delivery info */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Calendar size={20} className="text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-stone-500">{t('deliveryOn')}</p>
            <p className="font-bold text-stone-800">{order.deliveryDate}</p>
            <p className="text-sm text-blue-700 font-semibold">⏰ {order.deliverySlot}</p>
          </div>
        </div>

        {/* Payment */}
        <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
          <CreditCard size={20} className="text-stone-500 shrink-0" />
          <div>
            <p className="text-xs text-stone-500">{t('paymentStatus')}</p>
            <p className="font-bold text-stone-800 capitalize">{order.paymentMethod.toUpperCase()}</p>
          </div>
          <div className="ml-auto">
            <span className={`pill ${order.paymentStatus === 'paid' ? 'pill-green' : order.paymentStatus === 'cod' ? 'pill-amber' : 'pill-gray'}`}>
              {order.paymentStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Products */}
        <div>
          <h3 className="font-bold text-stone-800 mb-2 text-sm">
            {lang === 'hi' ? 'ऑर्डर किए गए उत्पाद' : 'Products Ordered'}
          </h3>
          <div className="space-y-2">
            {order.products.map((p, i) => (
              <div key={i} className="flex justify-between text-sm text-stone-600 py-1.5 border-b border-stone-50 last:border-0">
                <span>{p.productName} {p.size && `(${p.size})`} ×{p.quantity}</span>
                <span className="font-bold text-stone-800">₹{p.totalPrice.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-amber-50 rounded-xl p-4 flex justify-between items-center">
          <div className="text-sm text-stone-600">
            <p>{t('subtotal')}: ₹{order.totalPrice.toFixed(0)}</p>
            <p>{t('deliveryCharge')}: {order.deliveryCharge === 0 ? t('free') : `₹${order.deliveryCharge}`}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500">{t('total')}</p>
            <p className="text-2xl font-extrabold text-amber-600">₹{order.finalAmount.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link to="/orders" className="btn-outline flex-1 justify-center py-3">
          {t('viewOrders')}
        </Link>
        <Link to="/" className="btn-primary flex-1 justify-center py-3">
          <Home size={16} /> {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
