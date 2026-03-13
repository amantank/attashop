import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, Zap, Gift, Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getActiveOffers } from '../api/offers';
import { useLanguage } from '../context/LanguageContext';


/* ─── Theme Maps ─────────────────────────────────────────────── */
const GRADIENTS: Record<string, string> = {
  fire:     'from-red-500 via-orange-500 to-yellow-500',
  summer:   'from-amber-400 via-orange-400 to-red-400',
  festival: 'from-purple-500 via-pink-500 to-red-500',
  fresh:    'from-green-500 via-emerald-400 to-teal-400',
  royal:    'from-indigo-500 via-purple-500 to-pink-500',
};

const THEME_ICON: Record<string, JSX.Element> = {
  fire:     <Flame size={22} />,
  summer:   <Zap size={22} />,
  festival: <Gift size={22} />,
  fresh:    <Tag size={22} />,
  royal:    <Zap size={22} />,
};

/* ─── Countdown Timer ────────────────────────────────────────── */
export function CountdownTimer({ endDate }: { endDate: string }) {
  const [left, setLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(endDate).getTime() - Date.now());
      return {
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      };
    };
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 text-white">
      <Clock size={14} className="opacity-80" />
      {[pad(left.h), pad(left.m), pad(left.s)].map((v, i) => (
        <span key={i} className="flex items-baseline gap-0.5">
          <span className="bg-white/20 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-sm font-bold tabular-nums">
            {v}
          </span>
          {i < 2 && <span className="text-xs opacity-60 font-bold">:</span>}
        </span>
      ))}
    </div>
  );
}

/* ─── Offer utility helpers (exported for ProductCard) ───────── */
export function getProductOffer(
  productId: string,
  categoryId: string,
  offers: any[]
): any | null {
  const now = Date.now();
  return (
    offers.find((o) => {
      if (!o.isActive) return false;
      if (new Date(o.startDate).getTime() > now) return false;
      if (new Date(o.endDate).getTime() < now) return false;

      const hasProd = o.applicableProducts.length > 0;
      const hasCat = o.applicableCategories.length > 0;

      if (!hasProd && !hasCat) return true; // applies to all
      if (hasProd && o.applicableProducts.includes(productId)) return true;
      if (
        hasCat &&
        o.applicableCategories.some(
          (c:any) => c.toLowerCase() === categoryId.toLowerCase()
        )
      )
        return true;
      return false;
    }) ?? null
  );
}

export function calcOfferPrice(price: number, offer: any): number {
  if (offer.discountType === 'percentage') {
    const disc = (price * offer.discountValue) / 100;
    const capped = offer.maxDiscount > 0 ? Math.min(disc, offer.maxDiscount) : disc;
    return Math.round(price - capped);
  }
  return Math.max(0, Math.round(price - offer.discountValue));
}

/* ─── Custom hook for components ─────────────────────────────── */
export function useActiveOffers() {
  const { data } = useQuery({
    queryKey: ['active-offers'],
    queryFn: getActiveOffers,
    staleTime: 5 * 60 * 1000,     // 5 min cache
    refetchInterval: 60 * 1000,    // refresh every 60s
  });
  return data?.offers ?? [];
}

/* ─── Main Banner Component ──────────────────────────────────── */
export default function OfferBanner() {
  const { lang } = useLanguage();
  const offers = useActiveOffers();
  const bannerOffers = offers.filter((o) => o.type === 'flash_sale' || o.type === 'banner');
  const [idx, setIdx] = useState(0);

  // Auto-rotate
  useEffect(() => {
    if (bannerOffers.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % bannerOffers.length), 5000);
    return () => clearInterval(id);
  }, [bannerOffers.length]);

  if (bannerOffers.length === 0) return null;

  const offer = bannerOffers[idx % bannerOffers.length];
  const grad = GRADIENTS[offer.theme] || GRADIENTS.fire;
  const icon = THEME_ICON[offer.theme] || THEME_ICON.fire;
  const title = lang === 'hi' && offer.titleHi ? offer.titleHi : offer.title;
  const desc = lang === 'hi' && offer.descriptionHi ? offer.descriptionHi : offer.description;

  return (
    <section className="max-w-7xl mx-auto px-4 mt-6">
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${grad} p-5 md:p-7 text-white shadow-lg transition-all duration-500`}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white/5 rounded-full translate-y-1/2" />
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center offer-icon-pulse">
                {icon}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-90">
                {offer.type === 'flash_sale'
                  ? '⚡ Flash Sale'
                  : offer.type === 'category_sale'
                  ? '🏷️ Category Sale'
                  : '🎉 Special Offer'}
              </span>
            </div>

            <h3 className="text-lg md:text-2xl font-extrabold mb-1 leading-tight">{title}</h3>
            {desc && <p className="text-sm opacity-90 mb-3 line-clamp-2">{desc}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-lg font-extrabold">
                {offer.discountType === 'percentage'
                  ? `${offer.discountValue}% OFF`
                  : `₹${offer.discountValue} OFF`}
              </span>
              <CountdownTimer endDate={offer.endDate} />
            </div>
          </div>

          {/* CTA */}
          <Link
            to="/offers"
            className="shrink-0 bg-white text-stone-800 font-bold text-sm px-6 py-3 rounded-xl hover:shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            {lang === 'hi' ? 'अभी खरीदें →' : 'Shop Now →'}
          </Link>
        </div>

        {/* Dot indicators */}
        {bannerOffers.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 relative z-10">
            {bannerOffers.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === idx % bannerOffers.length
                    ? 'bg-white w-6'
                    : 'bg-white/40 w-2 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}