import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, Globe, Wheat, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "../store/cartStore";
import { useLanguage } from "../context/LanguageContext";
import SearchBar from "./SearchBar";
const sidebarRoutes = [
  { label: "Home", to: "/" },
  { label: "Offers", to: "/offers" },
  { label: "Orders", to: "/orders" },
  { label: "Subscriptions", to: "/subscriptions" },
];
export default function Navbar() {
  const { t, lang, toggleLang } = useLanguage();
  const itemCount = useCartStore((s) => s.itemCount());
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { to: "/products", label: t("products") },
    { to: "/offers", label: t("offers") },
    { to: "/orders", label: t("orders") },
    { to: "/subscriptions", label: t("subscriptions") },
  ];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="bg-white md:border border-stone-200 ">
      <div className="max-w-7xl mx-auto px-6 py-4 md:py-6 md:border border-b-[0px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-400">The</p>
              <p className="font-semibold"> {t("appName")}</p>
            </div>
          </div>

          <div className="md:flex hidden items-center gap-4">
            <SearchBar />
          </div>
          <div className="flex items-center gap-2">
            {/* Lang toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:border-amber-400 hover:text-amber-600 transition-all"
            >
              <Globe size={13} />
              {lang === "hi" ? "EN" : "हि"}
            </button>

            {/* Cart */}
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2.5 rounded-full bg-green-500 text-white hover:bg-amber-600 transition-colors shadow-md"
            >
              <ShoppingCart size={15} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-in">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>

            {/* Right Sidebar (Desktop only) */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition"
            >
              <Menu size={15} />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-lg hover:bg-stone-100 transition"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
          {/* Mobile Menu Overlay */}
          <div
            className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
              open
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Backdrop */}
            <div
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Centered Sliding Menu */}
            <div
              className={`absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[80%] bg-white shadow-2xl rounded-3xl transform transition-transform duration-300 ease-out flex flex-col ${
                open ? "translate-x-0" : "-translate-x-[120%]"
              }`}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
                    {lang === "hi" ? "मेनू" : "Menu"}
                  </h2>

                  <p className="text-xs text-stone-400">
                    {lang === "hi" ? "नेविगेशन" : "Navigation"}
                  </p>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-500 transition"
                >
                  ✕
                </button>
              </div>

              {/* Menu Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Main Links */}
                <div className="space-y-1">
                  {navLinks.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between px-4 py-3 rounded-xl hover:bg-amber-50 transition"
                    >
                      <span className="text-[15px] font-medium text-stone-800 group-hover:text-amber-700">
                        {l.label}
                      </span>

                      <span className="text-stone-300 group-hover:text-amber-400 text-sm">
                        →
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-stone-100" />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-stone-100">
                <p className="text-xs text-stone-400 text-center">
                  © {new Date().getFullYear()} theaatashop.com
                </p>
              </div>
            </div>
          </div>
        </div>
        {sidebarOpen && (
          <div
            className="hidden lg:block fixed inset-0 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Right Sidebar */}
        <div
          className={`hidden lg:flex fixed right-0 top-0 h-full w-80 bg-green-500 text-white flex-col justify-between p-8 shadow-xl transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] z-40 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Top */}
          <div>
            <h2 className="text-2xl font-semibold">{t("appName")}</h2>

            <p className="text-green-100 mt-2 text-sm leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            {sidebarRoutes.map((item) => (
              <SidebarItem key={item.to} {...item} />
            ))}
          </div>
          {/* Footer */}
          <div className="text-xs text-green-100 opacity-80">
            © {new Date().getFullYear()} theaatashop.com
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ label, to }: any) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-3 rounded-3xl flex items-center justify-center text-center text-sm cursor-pointer transition ${
          isActive
            ? "bg-white text-green-600 shadow-sm"
            : "text-green-100 hover:bg-green-600"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
