import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem as CartItemType } from '../types';
import { useCartStore } from '../store/cartStore';
import { useLanguage } from '../context/LanguageContext';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=80&h=80&fit=crop';

interface Props { item: CartItemType; }

export default function CartItemRow({ item }: Props) {
  const { lang } = useLanguage();
  const { updateQuantity, removeItem, subscribeItems, toggleSubscribeItem } = useCartStore();
  const name = lang === 'hi' && item.productNameHi ? item.productNameHi : item.productName;
  const isSubscribed = subscribeItems.includes(item.productId);

  return (
    <div className="flex items-center gap-3 py-4 border-b border-stone-100 last:border-0">
      <img
        src={item.imageUrl || PLACEHOLDER}
        alt={name}
        className="w-16 h-16 rounded-xl object-cover bg-amber-50 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <Link to={`/products/${item.productId}`} className="font-semibold text-stone-900 text-sm hover:text-amber-600 transition line-clamp-1">
          {name}
        </Link>
        {item.size && <p className="text-xs text-stone-400 mt-0.5">{item.size}</p>}
        
        <button 
          onClick={() => toggleSubscribeItem(item.productId)}
          className={`flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
            isSubscribed 
              ? 'bg-amber-100 text-amber-800 border-amber-200' 
              : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <span className="text-[11px]">🔁</span> {isSubscribed ? 'Subscribed' : 'Subscribe'}
        </button>

        <p className="text-amber-600 font-extrabold text-sm mt-2">₹{(item.unitPrice * item.quantity).toFixed(0)}</p>
      </div>
      {/* Qty stepper */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
          className="stepper-btn"
        >
          <Minus size={14} />
        </button>
        <span className="w-7 text-center font-bold text-stone-800 text-sm">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
          className="stepper-btn"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => removeItem(item.productId, item.variantId)}
          className="ml-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
