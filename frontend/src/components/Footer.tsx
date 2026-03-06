import { Link } from 'react-router-dom';
import { Wheat, Phone, MapPin, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-stone-900 text-stone-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <Wheat size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">{t('appName')}</span>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed">{t('tagline')}</p>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            {[
              { to: '/products', label: t('products') },
              { to: '/orders', label: t('myOrders') },
              { to: '/subscriptions', label: t('subscriptions') },
              { to: '/admin', label: t('admin') },
            ].map(l => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-amber-400 transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Contact</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Phone size={14} className="text-amber-400" /> +91 98765 43210</li>
            <li className="flex items-center gap-2"><MapPin size={14} className="text-amber-400" /> Local Delivery Area</li>
            <li className="flex items-center gap-2"><Clock size={14} className="text-amber-400" /> 7 AM – 7 PM</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-800 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} {t('appName')} – Fresh Flour, Every Day
      </div>
    </footer>
  );
}
