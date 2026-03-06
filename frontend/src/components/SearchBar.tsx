import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { searchProducts } from '../api/products';
import type { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';

export default function SearchBar() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addItem = useCartStore(s => s.addItem);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchProducts(query);
        setResults(data.products.slice(0, 6));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="input pl-11 pr-10 shadow-sm"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition">
            <X size={16} />
          </button>
        )}
      </div>

      {(results.length > 0 || loading) && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden animate-fade-in-up">
          {loading && (
            <div className="p-4 text-center text-sm text-stone-400">Searching…</div>
          )}
          {results.map(p => (
            <button
              key={p.productId}
              onClick={() => { navigate(`/products/${p.productId}`); setQuery(''); setResults([]); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition text-left border-b border-stone-50 last:border-0"
            >
              <img
                src={p.imageUrl || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=60&h=60&fit=crop'}
                alt={p.name}
                className="w-11 h-11 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 truncate">
                  {lang === 'hi' && p.nameHi ? p.nameHi : p.name}
                </p>
                <p className="text-xs text-stone-400">{p.categoryId}</p>
              </div>
              <span className="text-sm font-bold text-amber-600 shrink-0">₹{p.finalPrice}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
