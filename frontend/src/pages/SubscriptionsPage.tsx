import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Plus, Calendar, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getSubscriptionsByPhone, cancelSubscription, createSubscription } from '../api/subscriptions';
import { getProducts } from '../api/products';
import { useCartStore } from '../store/cartStore';
import type { SubscriptionFrequency, PaymentMethod } from '../types';
import { Loader, EmptyState } from '../components/Loader';
import toast from 'react-hot-toast';

export default function SubscriptionsPage() {
  const { t, lang } = useLanguage();
  const qc = useQueryClient();
  const customerInfo = useCartStore(s => s.customerInfo);
  const [phone, setPhone] = useState(customerInfo.phone || '');
  const [searched, setSearched] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscriptions', phone],
    queryFn: () => getSubscriptionsByPhone(phone),
    enabled: searched && phone.length >= 10,
  });

  const handleSearch = () => {
    if (phone.length < 10) { toast.error(lang === 'hi' ? 'वैध फोन नंबर दर्ज करें' : 'Enter a valid phone number'); return; }
    setSearched(true);
    refetch();
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSubscription(id);
      qc.invalidateQueries({ queryKey: ['subscriptions', phone] });
      toast.success(t('subscriptionCancelled'));
    } catch { toast.error(t('error')); }
  };

  const subs = data?.subscriptions || [];
  const activeSubs = subs.filter(s => s.subscriptionStatus === 'active');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-stone-900 mb-6">{t('mySubscriptions')}</h1>

      {/* Phone lookup */}
      <div className="card p-5 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="tel" maxLength={10}
              className="input pl-9" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="98765 43210"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="btn-primary px-6">{t('lookupOrders')}</button>
        </div>
      </div>

      {/* Subscriptions list */}
      {searched && isLoading && <Loader />}
      {searched && !isLoading && activeSubs.length === 0 && (
        <EmptyState
          icon="🔄"
          title={t('noSubscriptions')}
          description={lang === 'hi' ? 'उत्पाद पेज पर जाकर सब्सक्रिप्शन बनाएं।' : 'Go to a product page to create a subscription.'}
        />
      )}

      <div className="space-y-4">
        {activeSubs.map(sub => (
          <div key={sub.subscriptionId} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-stone-900">{sub.productName}</h3>
                {sub.size && <p className="text-xs text-stone-400 mt-0.5">{sub.size} · {sub.quantity} {t('pcs')}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`pill text-xs ${sub.frequency === 'weekly' ? 'pill-amber' : sub.frequency === 'biweekly' ? 'pill-blue' : sub.frequency === 'custom' ? 'pill-purple' : 'pill-green'}`}>
                    {sub.frequency === 'weekly' ? t('weekly') : sub.frequency === 'biweekly' ? t('biweekly') : sub.frequency === 'custom' ? `Every ${sub.customDays} days` : t('monthly')}
                  </span>
                  <span className="pill-gray text-xs capitalize">{sub.subscriptionStatus}</span>
                </div>
                <p className="text-xs text-stone-500 mt-2 flex items-center gap-1">
                  <Calendar size={12} />
                  {t('nextDelivery')}: {sub.nextDeliveryDate ? new Date(sub.nextDeliveryDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD'}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  💳 {sub.paymentMethod.toUpperCase()} · 📞 {sub.phoneNumber}
                </p>
              </div>
              <button
                onClick={() => handleCancel(sub.subscriptionId)}
                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Help text */}
      {searched && (
        <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-sm text-amber-700 text-center">
          <Plus size={16} className="inline mr-1" />
          {lang === 'hi'
            ? 'नई सब्सक्रिप्शन बनाने के लिए किसी उत्पाद पर जाएं और "सब्सक्राइब करें" चुनें।'
            : 'To create a new subscription, go to any product and toggle "Subscribe for regular delivery".'}
        </div>
      )}
    </div>
  );
}
