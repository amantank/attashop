import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useLanguage } from '../context/LanguageContext';
import { placeOrder } from '../api/orders';
import { getSlotAvailability, calculateDeliveryCharge, getDeliveryAreas } from '../api/delivery';
import { createSubscription } from '../api/subscriptions';
import DeliveryMap from '../components/DeliveryMap';
import type { LocationData } from '../components/DeliveryMap';
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
    items, subtotal, total, deliveryCharge,
    customerInfo, deliveryDate, deliverySlot, paymentMethod,
    subscribeItems, subFrequency, subCustomDays,
    setCustomerInfo, setDeliveryDate, setDeliverySlot,
    setPaymentMethod, clearCart, toggleSubscribeItem,
    setSubFrequency, setSubCustomDays, setDeliveryCharge
  } = useCartStore();

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [deliveryAreaPincodes, setDeliveryAreaPincodes] = useState<string[]>([]);
  const [mapPincode, setMapPincode] = useState('');
  const sub = subtotal();

  // Load delivery area pincodes on mount
  useEffect(() => {
    getDeliveryAreas()
      .then(({ areas }) => setDeliveryAreaPincodes(areas.map(a => a.pincode)))
      .catch(() => setDeliveryAreaPincodes([]));
  }, []);

  // Redirect if cart empty
  useEffect(() => {
    if (items.length === 0 && !placing) navigate('/cart');
  }, [items.length, navigate, placing]);

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

  // Map location callback — auto-fill address fields
  const handleLocationSelect = (data: LocationData) => {
    setMapPincode(data.pincode);
    setCustomerInfo({
      address: data.address,
      pincode: data.pincode,
      landmark: data.landmark,
      lat: data.lat,
      lng: data.lng,
    });
  };

  // Check if map-selected pincode is deliverable
  const isPincodeDeliverable =
    mapPincode && deliveryAreaPincodes.length > 0
      ? deliveryAreaPincodes.includes(mapPincode)
      : null;

  const validate = (): string | null => {
    if (!customerInfo.name.trim())
      return lang === 'hi' ? 'नाम दर्ज करें' : 'Please enter your name';
    if (customerInfo.phone.length < 10)
      return lang === 'hi' ? 'वैध फोन नंबर दर्ज करें' : 'Enter a valid phone number';
    if (!customerInfo.address.trim())
      return lang === 'hi' ? 'पता दर्ज करें' : 'Please enter your address';
    if (customerInfo.pincode.length !== 6)
      return lang === 'hi' ? 'वैध पिनकोड दर्ज करें' : 'Enter a valid 6-digit pincode';
    if (isPincodeDeliverable === false)
      return lang === 'hi'
        ? 'इस क्षेत्र में डिलीवरी उपलब्ध नहीं है'
        : 'Delivery is not available in this area. Please select a different location.';
    if (!deliveryDate)
      return lang === 'hi' ? 'डिलीवरी तारीख चुनें' : 'Select a delivery date';
    if (!deliverySlot)
      return lang === 'hi' ? 'डिलीवरी स्लॉट चुनें' : t('selectSlotFirst');
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
        lat: customerInfo.lat || undefined,
        lng: customerInfo.lng || undefined,
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
            customDays: subFrequency === 'custom' ? (subCustomDays || 30) : undefined,
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
        {/* Left — Form */}
        <div className="lg:col-span-2 space-y-5">

          {/* ★ NEW — Delivery Location Map */}
          <div className="card p-5">
            <DeliveryMap
              onLocationSelect={handleLocationSelect}
              deliveryAreaPincodes={deliveryAreaPincodes}
            />
          </div>

          {/* Customer details */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-stone-800">{t('customerDetails')}</h2>
              {mapPincode && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                  📍 Auto-filled from map
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('name')}</label>
                <input
                  className="input"
                  value={customerInfo.name}
                  onChange={e => setCustomerInfo({ name: e.target.value })}
                  placeholder={lang === 'hi' ? 'राहुल शर्मा' : 'Rahul Sharma'}
                />
              </div>
              <div>
                <label className="label">{t('phone')}</label>
                <input
                  className="input"
                  type="tel"
                  maxLength={10}
                  value={customerInfo.phone}
                  onChange={e => setCustomerInfo({ phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="98765 43210"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('address')}</label>
                <textarea
                  className="input resize-none h-20"
                  value={customerInfo.address}
                  onChange={e => setCustomerInfo({ address: e.target.value })}
                  placeholder={lang === 'hi' ? 'मकान नंबर, गली...' : 'House no, Street...'}
                />
              </div>
              <div>
                <label className="label">{t('pincode')}</label>
                <input
                  className="input"
                  maxLength={6}
                  value={customerInfo.pincode}
                  onChange={e => setCustomerInfo({ pincode: e.target.value.replace(/\D/g, '') })}
                  placeholder="110001"
                />
              </div>
              <div>
                <label className="label">{t('landmark')}</label>
                <input
                  className="input"
                  value={customerInfo.landmark}
                  onChange={e => setCustomerInfo({ landmark: e.target.value })}
                  placeholder={lang === 'hi' ? 'पास का मंदिर...' : 'Near hospital...'}
                />
              </div>
            </div>
          </div>

          {/* Delivery schedule */}
          <div className="card p-5">
            <h2 className="font-extrabold text-stone-800 mb-4">{t('deliverySchedule')}</h2>
            <div className="mb-4">
              <label className="label">{t('deliveryDate')}</label>
              <input
                type="date"
                className="input max-w-xs"
                min={minDate}
                value={deliveryDate}
                onChange={e => { setDeliveryDate(e.target.value); setDeliverySlot(''); }}
              />
            </div>
            {deliveryDate && (
              <div>
                <label className="label">{t('deliverySlot')}</label>
                {slotsLoading ? (
                  <p className="text-stone-400 text-sm">{t('loading')}</p>
                ) : slots.length === 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {['7AM — 9AM', '9AM — 12PM', '12PM — 3PM', '4PM — 7PM'].map(s => (
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
                    className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${
                      subscribeItems.includes(item.productId) ? 'bg-amber-500' : 'bg-stone-200'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                      subscribeItems.includes(item.productId) ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm font-semibold text-stone-700">
                    {item.productName} ×{item.quantity}
                  </span>
                </label>
              ))}
            </div>
            {subscribeItems.length > 0 && (
              <div className="mt-4 animate-fade-in-up">
                <p className="label mb-2">Delivery Frequency</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['weekly','biweekly','monthly','custom'] as SubscriptionFrequency[]).map(f => (
                    <button key={f} onClick={() => setSubFrequency(f)}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        subFrequency === f
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}>
                      {f === 'weekly' ? 'Weekly' : f === 'biweekly' ? 'Every 2 Weeks' : f === 'monthly' ? 'Monthly' : 'Custom'}
                    </button>
                  ))}
                </div>
                {subFrequency === 'custom' && (
                  <div className="mt-3 bg-stone-50 p-3 rounded-xl border border-stone-200 animate-fade-in flex items-center gap-3">
                    <span className="text-sm text-stone-600 font-medium">Deliver every</span>
                    <input
                      type="number" min="1" max="90"
                      className="input w-20 py-1.5 px-3 text-center !text-sm"
                      value={subCustomDays || ''}
                      placeholder="e.g. 8"
                      onChange={(e) => setSubCustomDays(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-sm text-stone-600 font-medium">days</span>
                  </div>
                )}
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

        {/* Right — Summary */}
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
              <span>{t('subtotal')}</span>
              <span className="font-bold">₹{sub.toFixed(0)}</span>
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

          {/* Delivery location mini-preview in summary */}
          {customerInfo.lat && customerInfo.lng && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-700 font-semibold">
              📍 {customerInfo.address ? customerInfo.address.substring(0, 60) + '...' : 'Location selected'}
              {customerInfo.pincode && <span className="ml-1 opacity-70">({customerInfo.pincode})</span>}
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={placing || isPincodeDeliverable === false}
            className="btn-primary w-full mt-5 py-3 text-base flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{placing ? t('placingOrder') : t('placeOrder')}</span>
            {subscribeItems.length > 0 && !placing && (
              <span className="text-[11px] opacity-90 font-medium tracking-wide">
                + Subscribe {subscribeItems.length} item{subscribeItems.length > 1 ? 's' : ''}
              </span>
            )}
          </button>

          {isPincodeDeliverable === false && (
            <p className="text-xs text-red-500 font-bold text-center mt-2">
              ❌ Delivery unavailable at selected location
            </p>
          )}
        </div>
      </div>
    </div>
  );
}