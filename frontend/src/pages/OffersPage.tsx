import { useQuery } from '@tanstack/react-query';
import { Flame, Tag, Clock } from 'lucide-react';
import { getActiveOffers } from '../api/offers';
import { getProducts } from '../api/products';
import { useLanguage } from '../context/LanguageContext';
import {
  getProductOffer,
  CountdownTimer,
  useActiveOffers,
} from '../components/OfferBanner';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Loader';

const GRADIENTS: Record<string, string> = {
  fire:     'from-red-500 via-orange-500 to-yellow-500',
  summer:   'from-amber-400 via-orange-400 to-red-400',
  festival: 'from-purple-500 via-pink-500 to-red-500',
  fresh:    'from-green-500 via-emerald-400 to-teal-400',
  royal:    'from-indigo-500 via-purple-500 to-pink-500',
};

export default function OffersPage() {
  const { t, lang } = useLanguage();
  const offers = useActiveOffers();

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['all-products-offers'],
    queryFn: () => getProducts({ limit: 100 }),
  });

  const allProducts = productsData?.products ?? [];

  // Group products by offer
  const offerGroups = offers.map((offer) => {
    const matchedProducts = allProducts.filter((p) => {
      const hasProd = offer.applicableProducts.length > 0;
      const hasCat = offer.applicableCategories.length > 0;

      if (!hasProd && !hasCat) return true;
      if (hasProd && offer.applicableProducts.includes(p.productId)) return true;
      if (
        hasCat &&
        offer.applicableCategories.some(
          (c:any) => c.toLowerCase() === p.categoryId.toLowerCase()
        )
      )
        return true;
      return false;
    });

    return { offer, products: matchedProducts };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Flame size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">
            {lang === 'hi' ? '🔥 ऑफर्स और सेल' : '🔥 Offers & Sales'}
          </h1>
          <p className="text-sm text-stone-500">
            {lang === 'hi'
              ? `${offers.length} ऑफर अभी चल रहे हैं`
              : `${offers.length} active offer${offers.length !== 1 ? 's' : ''} right now`}
          </p>
        </div>
      </div>

      {/* No offers state */}
      {offers.length === 0 && (
        <div className="text-center py-20">
          <span className="text-6xl block mb-4">🏷️</span>
          <h2 className="text-xl font-bold text-stone-700 mb-2">
            {lang === 'hi' ? 'अभी कोई ऑफर नहीं' : 'No Active Offers'}
          </h2>
          <p className="text-stone-400">
            {lang === 'hi'
              ? 'नए ऑफर जल्द आ रहे हैं! बने रहें।'
              : 'New offers coming soon! Stay tuned.'}
          </p>
        </div>
      )}

      {/* Offer Sections */}
      <div className="space-y-10">
        {offerGroups.map(({ offer, products }) => {
          const grad = GRADIENTS[offer.theme] || GRADIENTS.fire;
          const title =
            lang === 'hi' && offer.titleHi ? offer.titleHi : offer.title;
          const desc =
            lang === 'hi' && offer.descriptionHi
              ? offer.descriptionHi
              : offer.description;

          return (
            <section key={offer.offerId}>
              {/* Offer Header Card */}
              <div
                className={`bg-gradient-to-r ${grad} rounded-2xl p-5 md:p-6 text-white mb-5 relative overflow-hidden`}
              >
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Tag size={16} />
                      <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                        {offer.type === 'flash_sale'
                          ? '⚡ Flash Sale'
                          : offer.type === 'category_sale'
                          ? '🏷️ Category Sale'
                          : '🎉 Special Offer'}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-extrabold leading-tight">
                      {title}
                    </h2>
                    {desc && (
                      <p className="text-sm opacity-90 mt-1">{desc}</p>
                    )}
                    {offer.minOrderAmount > 0 && (
                      <p className="text-xs opacity-75 mt-1">
                        {lang === 'hi'
                          ? `₹${offer.minOrderAmount} से ऊपर के ऑर्डर पर`
                          : `On orders above ₹${offer.minOrderAmount}`}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-lg font-extrabold">
                      {offer.discountType === 'percentage'
                        ? `${offer.discountValue}% OFF`
                        : `₹${offer.discountValue} OFF`}
                    </span>
                    <CountdownTimer endDate={offer.endDate} />
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.productId} product={p} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-400 text-sm">
                  {lang === 'hi'
                    ? 'इस ऑफर के लिए उत्पाद जल्द आ रहे हैं'
                    : 'Products for this offer coming soon'}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}