import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useLanguage } from '../context/LanguageContext';
import { placeOrder } from '../api/orders';
import { getSlotAvailability, calculateDeliveryCharge } from '../api/delivery';
import { createSubscription } from '../api/subscriptions';
import type { PaymentMethod, DeliverySlot, SubscriptionFrequency } from '../types';
import toast from 'react-hot-toast';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'upi', label: 'UPI', icon: '💳' },
  { value: 'gpay', label: 'Google Pay', icon: '🟢' },
  { value: 'paytm', label: 'Paytm', icon: '🔵' },
  { value: 'cod', label: 'Cash on Delivery', icon: '💵' },
];

export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const {
    items, subtotal, deliveryCharge, setDeliveryCharge, total,
    customerInfo, setCustomerInfo,
    deliveryDate, setDeliveryDate,
    deliverySlot, setDeliverySlot,
    paymentMethod, setPaymentMethod,
    subscribeItems, toggleSubscribeItem, subFrequency, setSubFrequency,
    clearCart,
  } = useCartStore();

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const sub = subtotal();

  // Redirect if cart empty
  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items.length, navigate]);

  // Min delivery date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Fetch slots when date changes
  useEffect(() => {
    if (!deliveryDate) return;
    setSlotsLoading(true);
    getSlotAvailability(deliveryDate)
      .then(d => setSlots(d.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [deliveryDate]);

  // Recalculate delivery charge when pincode changes
  useEffect(() => {
    if (customerInfo.pincode.length === 6) {
      calculateDeliveryCharge(customerInfo.pincode, sub).then(setDeliveryCharge);
    }
  }, [customerInfo.pincode, sub, setDeliveryCharge]);

  const validate = (): string | null => {
    if (!customerInfo.name.trim()) return lang === 'hi' ? 'नाम दर्ज करें' : 'Please enter your name';
    if (customerInfo.phone.length < 10) return lang === 'hi' ? 'वैध फोन नंबर दर्ज करें' : 'Enter a valid phone number';
    if (!customerInfo.address.trim()) return lang === 'hi' ? 'पता दर्ज करें' : 'Please enter your address';
    if (customerInfo.pincode.length !== 6) return lang === 'hi' ? 'वैध पिनकोड दर्ज करें' : 'Enter a valid 6-digit pincode';
    if (!deliveryDate) return lang === 'hi' ? 'डिलीवरी तारीख चुनें' : 'Select a delivery date';
    if (!deliverySlot) return lang === 'hi' ? 'डिलीवरी स्लॉट चुनें' : t('selectSlotFirst');
    return null;
  };

  const handlePlaceOrder = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setPlacing(true);
    try {
      const { order } = await placeOrder({
        customerName: customerInfo.name,
        phoneNumber: customerInfo.phone,
        address: customerInfo.address,
        pincode: customerInfo.pincode,
        landmark: customerInfo.landmark || undefined,
        products: items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        paymentMethod,
        deliveryDate,
        deliverySlot,
      });
      clearCart();
      // Create subscriptions for toggled items
      const subItems = items.filter(i => subscribeItems.includes(i.productId));
      for (const item of subItems) {
        try {
          await createSubscription({
            customerName: customerInfo.name,
            phoneNumber: customerInfo.phone,
            address: customerInfo.address,
            pincode: customerInfo.pincode,
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            quantity: item.quantity,
            frequency: subFrequency,
            paymentMethod,
          });
        } catch { /* silent */ }
      }
      navigate(`/order-confirmation/${order.orderId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t('error'));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-stone-900 mb-6">{t('checkout')}</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left – Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer details */}
          <div className="card p-5">
            <h2 className="font-extrabold text-stone-800 mb-4">{t('customerDetails')}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('name')}</label>
                <input className="input" value={customerInfo.name} onChange={e => setCustomerInfo({ name: e.target.value })} placeholder={lang === 'hi' ? 'राहुल शर्मा' : 'Rahul Sharma'} />
              </div>
              <div>
                <label className="label">{t('phone')}</label>
                <input className="input" type="tel" maxLength={10} value={customerInfo.phone} onChange={e => setCustomerInfo({ phone: e.target.value.replace(/\D/g, '') })} placeholder="98765 43210" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('address')}</label>
                <textarea className="input resize-none h-20" value={customerInfo.address} onChange={e => setCustomerInfo({ address: e.target.value })} placeholder={lang === 'hi' ? 'मकान नंबर, गली...' : 'House no, Street...'} />
              </div>
              <div>
                <label className="label">{t('pincode')}</label>
                <input className="input" maxLength={6} value={customerInfo.pincode} onChange={e => setCustomerInfo({ pincode: e.target.value.replace(/\D/g, '') })} placeholder="110001" />
              </div>
              <div>
                <label className="label">{t('landmark')}</label>
                <input className="input" value={customerInfo.landmark} onChange={e => setCustomerInfo({ landmark: e.target.value })} placeholder={lang === 'hi' ? 'पास का मंदिर...' : 'Near hospital...'} />
              </div>
            </div>
          </div>

          {/* Delivery schedule */}
          <div className="card p-5">
            <h2 className="font-extrabold text-stone-800 mb-4">{t('deliverySchedule')}</h2>
            <div className="mb-4">
              <label className="label">{t('deliveryDate')}</label>
              <input type="date" className="input max-w-xs" min={minDate} value={deliveryDate} onChange={e => { setDeliveryDate(e.target.value); setDeliverySlot(''); }} />
            </div>
            {deliveryDate && (
              <div>
                <label className="label">{t('deliverySlot')}</label>
                {slotsLoading ? (
                  <p className="text-stone-400 text-sm">{t('loading')}</p>
                ) : slots.length === 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      '7AM – 9AM', '9AM – 12PM', '12PM – 3PM', '4PM – 7PM',
                    ].map(s => (
                      <button
                        key={s}
                        onClick={() => setDeliverySlot(s)}
                        className={deliverySlot === s ? 'slot-active' : 'slot-inactive'}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.slotId}
                        disabled={!slot.available}
                        onClick={() => slot.available && setDeliverySlot(slot.label)}
                        className={
                          !slot.available ? 'slot-full' :
                          deliverySlot === slot.label ? 'slot-active' : 'slot-inactive'
                        }
                      >
                        <span className="block">{slot.label}</span>
                        {!slot.available && <span className="text-[10px]">{t('slotFull')}</span>}
                        {slot.available && (
                          <span className="text-[10px] opacity-60">
                            {slot.maxOrders - slot.bookedOrders} left
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subscription */}
          <div className="card p-5">
            <h2 className="font-extrabold text-stone-800 mb-1">🔁 Subscribe for Regular Delivery</h2>
            <p className="text-xs text-stone-400 mb-4">Auto-deliver any item on a schedule — cancel anytime.</p>
            <div className="space-y-3">
              {items.map(item => (
                <label key={item.productId} className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => toggleSubscribeItem(item.productId)}
                    className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${subscribeItems.includes(item.productId) ? 'bg-amber-500' : 'bg-stone-200'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${subscribeItems.includes(item.productId) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-semibold text-stone-700">{item.productName} ×{item.quantity}</span>
                </label>
              ))}
            </div>
            {subscribeItems.length > 0 && (
              <div className="mt-4">
                <p className="label mb-2">Delivery Frequency</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['weekly','biweekly','monthly'] as SubscriptionFrequency[]).map(f => (
                    <button key={f} onClick={() => setSubFrequency(f)}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        subFrequency === f ? 'border-amber-500 bg-amber-500 text-white' : 'border-stone-200 bg-white text-stone-600'
                      }`}>
                      {f === 'weekly' ? 'Weekly' : f === 'biweekly' ? 'Every 2 Weeks' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="card p-5">
            <h2 className="font-extrabold text-stone-800 mb-4">{t('paymentMethod')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-semibold text-sm ${
                    paymentMethod === opt.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-amber-300'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  {lang === 'hi' ? t(opt.value as Parameters<typeof t>[0]) : opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right – Summary */}
        <div className="card p-5 h-fit lg:sticky lg:top-24">
          <h2 className="font-extrabold text-stone-900 mb-4">{t('orderSummary')}</h2>
          <div className="space-y-2 mb-4">
            {items.map(item => (
              <div key={`${item.productId}-${item.variantId}`} className="flex justify-between text-sm text-stone-600">
                <span className="truncate pr-2">
                  {item.productName} {item.size && `(${item.size})`} ×{item.quantity}
                  {subscribeItems.includes(item.productId) && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      🔁 {subFrequency}
                    </span>
                  )}
                </span>
                <span className="font-bold text-stone-800 shrink-0">₹{(item.unitPrice * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-stone-100 mb-3" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>{t('subtotal')}</span><span className="font-bold">₹{sub.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>{t('deliveryCharge')}</span>
              <span className={`font-bold ${deliveryCharge === 0 ? 'text-green-600' : ''}`}>
                {deliveryCharge === 0 ? t('free') : `₹${deliveryCharge}`}
              </span>
            </div>
            <div className="h-px bg-stone-100" />
            <div className="flex justify-between">
              <span className="font-extrabold text-stone-900">{t('total')}</span>
              <span className="font-extrabold text-amber-600 text-xl">₹{total().toFixed(0)}</span>
            </div>
          </div>

          {deliveryDate && deliverySlot && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700 font-semibold">
              📅 {deliveryDate}<br />⏰ {deliverySlot}
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="btn-primary w-full mt-5 py-3 text-base flex flex-col items-center justify-center gap-0.5"
          >
            <span>{placing ? t('placingOrder') : t('placeOrder')}</span>
            {subscribeItems.length > 0 && !placing && (
              <span className="text-[11px] opacity-90 font-medium tracking-wide">
                + Subscribe {subscribeItems.length} item{subscribeItems.length > 1 ? 's' : ''}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
