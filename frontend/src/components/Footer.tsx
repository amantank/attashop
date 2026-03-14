import { Link } from "react-router-dom";
import { Wheat, Phone, MapPin, Clock } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useEffect, useState } from "react";

export default function Footer() {
  const { t, lang } = useLanguage();
  const heroTexts =
    lang === "hi"
      ? ["शुद्ध गेहूं का आटा", "ताजा बासमती चावल", "पौष्टिक मसूर दाल"]
      : ["Pure Wheat Flour", "Fresh Basmati Rice", "Nutritious Masoor Dal"];
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setHeroIdx((i) => (i + 1) % heroTexts.length),
      2500,
    );
    return () => clearInterval(timer);
  }, [heroTexts.length]);
  return (
    <footer className="bg-white border-t border-stone-200 mt-10 md:mb-[-3em]">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 text-sm text-stone-500">
          {/* Brand */}
          <div className="flex flex-col">
            <span className="font-semibold text-stone-900">
              {"The " + t("appName")}
            </span>
            <span
              key={heroIdx}
              className="text-xs text-stone-400 animate-fade-in-up"
            >
              {" "}
              {heroTexts[heroIdx]}
            </span>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap items-center md:gap-4 gap-2">
            <span className="flex items-center text-xs  gap-1">
              <Phone size={14} className="text-green-600" />
              +91 98765 43210
            </span>

            <span className="flex items-center gap-1 text-xs">
              <MapPin size={14} className="text-green-600" />
              {lang === "hi"
                ? "स्थानीय क्षेत्र - Udaipur (Rajasthan) 313001"
                : "Udaipur (Rajasthan) 313001"}
            </span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-0 pt-2 border-t-none border-stone-200 flex flex-col md:flex-row items-center justify-between md:gap-3 gap-2 text-xs text-stone-400">
          <p>
            © {new Date().getFullYear()} {t("appName")} —
            {lang === "hi" ? " ताज़ा आटा हर दिन" : " Fresh Flour, Every Day"}
          </p>

          <div className="flex flex-wrap md:gap-4 gap-2">
            {[
              { to: "/products", label: t("products") },
              { to: "/orders", label: t("myOrders") },
              { to: "/offers", label: t("offers") },
              { to: "/subscriptions", label: t("subscriptions") },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="hover:text-green-600 transition text-xs"
              >
                {l.label}
              </Link>
            ))}
            <span className="hover:text-stone-600 cursor-pointer">Privacy</span>
            <span className="hover:text-stone-600 cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
