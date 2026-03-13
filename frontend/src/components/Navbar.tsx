import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Globe, Wheat } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { t, lang, toggleLang } = useLanguage();
  const itemCount = useCartStore(s => s.itemCount());
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

const navLinks = [
  { to: '/products', label: t('products') },
  { to: '/offers', label: '🔥 ' + t('offers') },
  { to: '/orders', label: t('orders') },
  { to: '/subscriptions', label: t('subscriptions') },
];
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
            <Wheat size={20} className="text-white" />
          </div>
          <span className="text-xl font-extrabold gradient-text tracking-tight">
            {t('appName')}
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm font-medium text-stone-600 rounded-lg hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Lang toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:border-amber-400 hover:text-amber-600 transition-all"
          >
            <Globe size={13} />
            {lang === 'hi' ? 'EN' : 'हि'}
          </button>

          {/* Cart */}
          <button
            onClick={() => navigate('/cart')}
            className="relative p-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-md"
          >
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-in">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-stone-100 transition"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-stone-100 px-4 py-3 flex flex-col gap-1 animate-fade-in-up">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="px-4 py-3 text-sm font-medium text-stone-700 rounded-xl hover:bg-amber-50 hover:text-amber-700 transition"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/admin"
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-sm font-medium text-stone-500 rounded-xl hover:bg-stone-50 transition"
          >
            {t('admin')}
          </Link>
        </div>
      )}
    </header>
  );
}
