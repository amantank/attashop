import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getActiveOffers } from "../api/offers";
import { useLanguage } from "../context/LanguageContext";

/* ─── Theme Maps ─────────────────────────────────────────────── */
// Subtle background / border / accent per theme
const THEME_PALETTE: Record<
  string,
  {
    bg: string;
    border: string;
    tag: string;
    tagText: string;
    disc: string;
    title: string;
    timerBg: string;
    timerText: string;
    cta: string;
    ctaText: string;
    progBg: string;
    progFill: string;
  }
> = {
  fire: {
    bg: "bg-[#FFF4F0]",
    border: "border-[#FDDDD4]",
    tag: "bg-[#FFE4DA]",
    tagText: "text-[#C0441A]",
    disc: "text-[#C0441A]",
    title: "text-[#7A2810]",
    timerBg: "bg-[#FFE4DA]",
    timerText: "text-[#C0441A]",
    cta: "bg-[#C0441A]",
    ctaText: "text-white",
    progBg: "bg-[#FDDDD4]",
    progFill: "bg-[#C0441A]",
  },
  summer: {
    bg: "bg-[#FFFBF0]",
    border: "border-[#FAE8B0]",
    tag: "bg-[#FDEFC0]",
    tagText: "text-[#8A6000]",
    disc: "text-[#8A6000]",
    title: "text-[#5A3E00]",
    timerBg: "bg-[#FDEFC0]",
    timerText: "text-[#8A6000]",
    cta: "bg-[#8A6000]",
    ctaText: "text-white",
    progBg: "bg-[#FAE8B0]",
    progFill: "bg-[#8A6000]",
  },
  festival: {
    bg: "bg-[#F3F1FE]",
    border: "border-[#D5CFFA]",
    tag: "bg-[#E4DFFD]",
    tagText: "text-[#4B3BB5]",
    disc: "text-[#4B3BB5]",
    title: "text-[#2D2370]",
    timerBg: "bg-[#E4DFFD]",
    timerText: "text-[#4B3BB5]",
    cta: "bg-[#4B3BB5]",
    ctaText: "text-white",
    progBg: "bg-[#D5CFFA]",
    progFill: "bg-[#4B3BB5]",
  },
  fresh: {
    bg: "bg-[#F0FAF5]",
    border: "border-[#C6EDD9]",
    tag: "bg-[#D6F5E5]",
    tagText: "text-[#15693E]",
    disc: "text-[#15693E]",
    title: "text-[#0D4027]",
    timerBg: "bg-[#D6F5E5]",
    timerText: "text-[#15693E]",
    cta: "bg-[#15693E]",
    ctaText: "text-white",
    progBg: "bg-[#C6EDD9]",
    progFill: "bg-[#15693E]",
  },
  royal: {
    bg: "bg-[#F4F2FF]",
    border: "border-[#DDD8FB]",
    tag: "bg-[#E8E4FD]",
    tagText: "text-[#3B2FA0]",
    disc: "text-[#3B2FA0]",
    title: "text-[#241D6A]",
    timerBg: "bg-[#E8E4FD]",
    timerText: "text-[#3B2FA0]",
    cta: "bg-[#3B2FA0]",
    ctaText: "text-white",
    progBg: "bg-[#DDD8FB]",
    progFill: "bg-[#3B2FA0]",
  },
};

const FALLBACK_PALETTE = THEME_PALETTE.fire;

const TYPE_LABEL: Record<string, string> = {
  flash_sale: "Flash sale",
  banner: "Special offer",
  category_sale: "Category deal",
  bogo: "Bundle offer",
  membership: "Members only",
  referral: "Referral",
};

/* ─── Countdown Timer ────────────────────────────────────────── */
export function CountdownTimer({
  endDate,
  timerBg,
  timerText,
}: {
  endDate: string;
  timerBg?: string;
  timerText?: string;
}) {
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

  const pad = (n: number) => String(n).padStart(2, "0");
  const units = [
    { v: pad(left.h), l: "hrs" },
    { v: pad(left.m), l: "min" },
    { v: pad(left.s), l: "sec" },
  ];

  return (
    <div className="flex items-center gap-1 mt-auto">
      <Clock size={12} className={`${timerText} opacity-50 mr-0.5`} />
      {units.map(({ v, l }, i) => (
        <span key={l} className="flex items-center gap-1">
          <span
            className={`${timerBg} ${timerText} rounded-lg px-1.5 py-1 text-center min-w-[32px]`}
          >
            <span className="block text-sm font-bold tabular-nums leading-none">
              {v}
            </span>
            <span className="text-[9px] opacity-60 mt-0.5 block">{l}</span>
          </span>
          {i < 2 && (
            <span className={`text-xs font-bold ${timerText} opacity-30`}>
              :
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ─── Offer utility helpers (exported for ProductCard) ───────── */
export function getProductOffer(
  productId: string,
  categoryId: string,
  offers: any[],
): any | null {
  const now = Date.now();
  return (
    offers.find((o) => {
      if (!o.isActive) return false;
      if (new Date(o.startDate).getTime() > now) return false;
      if (new Date(o.endDate).getTime() < now) return false;
      const hasProd = o.applicableProducts.length > 0;
      const hasCat = o.applicableCategories.length > 0;
      if (!hasProd && !hasCat) return true;
      if (hasProd && o.applicableProducts.includes(productId)) return true;
      if (
        hasCat &&
        o.applicableCategories.some(
          (c: any) => c.toLowerCase() === categoryId.toLowerCase(),
        )
      )
        return true;
      return false;
    }) ?? null
  );
}

export function calcOfferPrice(price: number, offer: any): number {
  if (offer.discountType === "percentage") {
    const disc = (price * offer.discountValue) / 100;
    const capped =
      offer.maxDiscount > 0 ? Math.min(disc, offer.maxDiscount) : disc;
    return Math.round(price - capped);
  }
  return Math.max(0, Math.round(price - offer.discountValue));
}

/* ─── Custom hook ─────────────────────────────────────────────── */
export function useActiveOffers() {
  const { data } = useQuery({
    queryKey: ["active-offers"],
    queryFn: getActiveOffers,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  return data?.offers ?? [];
}

/* ─── Single Offer Cell ───────────────────────────────────────── */
function OfferCell({
  offer,
  lang,
  spanCols = 1,
  spanRows = 1,
}: {
  offer: any;
  lang: string;
  spanCols?: number;
  spanRows?: number;
}) {
  const p = THEME_PALETTE[offer.theme] ?? FALLBACK_PALETTE;
  const title = lang === "hi" && offer.titleHi ? offer.titleHi : offer.title;
  const desc =
    lang === "hi" && offer.descriptionHi
      ? offer.descriptionHi
      : offer.description;
  const discLabel =
    offer.discountType === "percentage"
      ? `${offer.discountValue}% off`
      : `₹${offer.discountValue} off`;

  const colClass = spanCols === 2 ? "col-span-2" : "col-span-1";
  const rowClass = spanRows === 2 ? "row-span-2" : "row-span-1";

  return (
    <div
      className={`
      ${colClass} ${rowClass}
      ${p.bg} border ${p.border}
      rounded-3xl p-4 sm:p-5
      flex flex-col gap-2 min-h-[120px]
      transition-all duration-200 
    `}
    >
      {/* Type tag */}
      <span
        className={`
        ${p.tag} ${p.tagText}
        text-[10px] font-semibold tracking-widest uppercase
        px-2.5 py-1 rounded-full w-fit
      `}
      >
        {TYPE_LABEL[offer.type] ?? "Offer"}
      </span>

      {/* Discount amount */}
      <div
        className={`text-2xl sm:text-3xl font-bold leading-none tracking-tight ${p.disc}`}
      >
        {discLabel}
      </div>

      {/* Title */}
      <p className={`text-xs sm:text-sm font-semibold leading-snug ${p.title}`}>
        {title}
      </p>

      {/* Description — only if cell has row span */}
      {desc && spanRows >= 2 && (
        <p className={`text-[11px] leading-relaxed opacity-60 ${p.title}`}>
          {desc}
        </p>
      )}

      {/* Applicable categories as pills */}
      {offer.applicableCategories?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {offer.applicableCategories.slice(0, 4).map((cat: string) => (
            <span
              key={cat}
              className={`${p.tag} ${p.tagText} text-[10px] font-medium px-2 py-0.5 rounded-full`}
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar (if offer has stock limit) */}
      {offer.stockLimit > 0 && (
        <div className="mt-auto">
          <div
            className={`flex justify-between text-[10px] opacity-50 ${p.title} mb-1`}
          >
            <span>{offer.claimed ?? 0} claimed</span>
            <span>{offer.stockLimit - (offer.claimed ?? 0)} left</span>
          </div>
          <div className={`h-1 rounded-full ${p.progBg} overflow-hidden`}>
            <div
              className={`h-full rounded-full ${p.progFill} transition-all duration-700`}
              style={{
                width: `${Math.min(100, ((offer.claimed ?? 0) / offer.stockLimit) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Countdown — flash sales only */}
      {offer.type === "flash_sale" && (
        <CountdownTimer
          endDate={offer.endDate}
          timerBg={p.timerBg}
          timerText={p.timerText}
        />
      )}

      {/* CTA */}
      <Link
        to="/offers"
        className={`
          mt-auto self-start
          ${p.cta} ${p.ctaText}
          text-[11px] font-semibold
          px-3.5 py-2 rounded-xl
          hover:opacity-85 active:scale-95 transition-all
        `}
      >
        {lang === "hi" ? "अभी खरीदें" : "Shop now"}
      </Link>
    </div>
  );
}

/* ─── Bento Layout Logic ──────────────────────────────────────── */
// Assigns span sizes so the grid looks intentional regardless of how many offers there are
function assignSpans(
  offers: any[],
): { offer: any; cols: number; rows: number }[] {
  return offers.map((offer, i) => {
    const isFlash = offer.type === "flash_sale";
    // First flash sale gets the hero slot (2 cols × 2 rows)
    if (isFlash && i === 0) return { offer, cols: 2, rows: 2 };
    // Every other flash sale gets 2 cols × 1 row
    if (isFlash) return { offer, cols: 2, rows: 1 };
    return { offer, cols: 1, rows: 1 };
  });
}

/* ─── Main Banner Component ──────────────────────────────────── */
export default function OfferBanner() {
  const { lang } = useLanguage();
  const offers = useActiveOffers();
  const bannerOffers = offers.filter(
    (o) =>
      o.type === "flash_sale" ||
      o.type === "banner" ||
      o.type === "category_sale",
  );

  if (bannerOffers.length === 0) return null;

  const cells = assignSpans(bannerOffers);

  return (
    <section className="max-w-7xl mx-auto  mt-6">
      <div
        className="
        grid gap-2.5
        grid-cols-2
        sm:grid-cols-3
        lg:grid-cols-4
      "
      >
        {cells.map(({ offer, cols, rows }) => (
          <OfferCell
            key={offer._id}
            offer={offer}
            lang={lang}
            spanCols={cols}
            spanRows={rows}
          />
        ))}
      </div>
    </section>
  );
}
