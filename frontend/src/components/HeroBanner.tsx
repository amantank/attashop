import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getActiveBanners, type Banner } from "../api/banners";
import { useLanguage } from "../context/LanguageContext";

const SLIDE_INTERVAL = 4500;

// ── Skeleton ──────────────────────────────────────────────────────
function BannerSkeleton() {
  return (
    <div className="w-full h-48 sm:h-64 lg:h-80 rounded-2xl bg-gray-200 animate-pulse" />
  );
}

// ── Single slide ──────────────────────────────────────────────────
function BannerSlide({
  banner,
  active,
  lang,
}: {
  banner: Banner;
  active: boolean;
  lang: string;
}) {
  const [imgError, setImgError] = useState(false);

  const title = lang === "hi" && banner.titleHi ? banner.titleHi : banner.title;
  const subtitle =
    lang === "hi" && banner.subtitleHi ? banner.subtitleHi : banner.subtitle;
  const cta =
    lang === "hi" && banner.ctaTextHi ? banner.ctaTextHi : banner.ctaText;

  return (
    <div
      className={`
        absolute inset-0 transition-opacity duration-700 ease-in-out
        ${active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}
      `}
    >
      {/* bgColor is ALWAYS the base layer */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{ backgroundColor: banner.bgColor || "#F0FAF5" }}
      />

      {/* Image on top — hidden if broken */}
      {!imgError && (
        <img
          src={banner.imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          onError={() => setImgError(true)}
        />
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

      {/* Text content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 lg:px-14 max-w-xl">
        {subtitle && (
          <span className="text-white/80 text-[11px] sm:text-xs font-semibold tracking-widest uppercase mb-2 drop-shadow">
            {subtitle}
          </span>
        )}

        <h2 className="text-white text-xl sm:text-2xl lg:text-3xl font-bold leading-snug drop-shadow-md">
          {title}
        </h2>

        <Link
          to={banner.ctaLink}
          className="
            mt-4 self-start
            bg-white text-gray-900
            text-xs sm:text-sm font-semibold
            px-4 py-2 rounded-xl shadow
            hover:bg-gray-100 active:scale-95
            transition-all duration-200
          "
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

// ── Dot indicators ────────────────────────────────────────────────
function Dots({
  count,
  active,
  onDotClick,
}: {
  count: number;
  active: number;
  onDotClick: (i: number) => void;
}) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          aria-label={`Go to slide ${i + 1}`}
          className={`
            rounded-full transition-all duration-300
            ${
              i === active
                ? "w-5 h-2 bg-white"
                : "w-2 h-2 bg-white/50 hover:bg-white/75"
            }
          `}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function HeroBanner() {
  const { lang } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["active-banners"],
    queryFn: getActiveBanners,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const banners: Banner[] = data?.banners ?? [];
  const total = banners.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + total) % total),
    [total],
  );

  // Reset index when banner list changes
  useEffect(() => {
    setCurrent(0);
  }, [total]);

  // Auto-advance
  useEffect(() => {
    if (total <= 1 || paused) return;
    const id = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [next, total, paused]);

  // ── Render ────────────────────────────────────────────────────────
  if (isLoading) return <BannerSkeleton />;

  // Show error state so you can debug easily
  if (error) {
    console.error("[HeroBanner] Failed to load banners:", error);
    return null;
  }

  if (total === 0) return null;

  return (
    <div
      className="relative w-full h-48 sm:h-64 lg:h-80 rounded-2xl overflow-hidden select-none mt-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {banners.map((banner, i) => (
        <BannerSlide
          key={banner.bannerId}
          banner={banner}
          active={i === current}
          lang={lang}
        />
      ))}

      {/* Arrows — only if more than 1 */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous banner"
            className="
              absolute left-2 top-1/2 -translate-y-1/2 z-20
              bg-black/30 hover:bg-black/50
              text-white rounded-full p-1.5
              transition-all duration-200
            "
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={next}
            aria-label="Next banner"
            className="
              absolute right-2 top-1/2 -translate-y-1/2 z-20
              bg-black/30 hover:bg-black/50
              text-white rounded-full p-1.5
              transition-all duration-200
            "
          >
            <ChevronRight size={18} />
          </button>

          <Dots count={total} active={current} onDotClick={setCurrent} />
        </>
      )}
    </div>
  );
}
