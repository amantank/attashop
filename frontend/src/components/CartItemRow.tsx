import { Link } from "react-router-dom";
import { Minus, Plus, Repeat, Trash2 } from "lucide-react";
import type { CartItem as CartItemType } from "../types";
import { useCartStore } from "../store/cartStore";
import { useLanguage } from "../context/LanguageContext";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=80&h=80&fit=crop";

interface Props {
  item: CartItemType;
}

export default function CartItemRow({ item }: Props) {
  const { lang } = useLanguage();
  const { updateQuantity, removeItem, subscribeItems, toggleSubscribeItem } =
    useCartStore();
  const name =
    lang === "hi" && item.productNameHi ? item.productNameHi : item.productName;
  const isSubscribed = subscribeItems.includes(item.productId);

  return (
    <div className="flex items-center gap-3 py-4 border-b border-stone-100 last:border-0">
      <img
        src={item.imageUrl || PLACEHOLDER}
        alt={name}
        className="w-16 h-16 rounded-xl object-cover bg-amber-50 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <Link
          to={`/products/${item.productId}`}
          className="font-semibold text-stone-900 text-sm hover:text-amber-600 transition line-clamp-1"
        >
          {name}
        </Link>
        {item.size && (
          <p className="text-xs text-stone-400 mt-0.5">{item.size}</p>
        )}

        <button
          onClick={() => toggleSubscribeItem(item.productId)}
          className={`
          flex items-center justify-center gap-1.5
          mt-2 px-3 py-1.5
          rounded-full text-xs font-medium
          transition-all duration-200

          ${
            isSubscribed
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }
        `}
        >
          <Repeat size={12} className={`${isSubscribed ? "" : "opacity-70"}`} />
          {isSubscribed ? "Subscribed" : "Subscribe"}
        </button>
        <p className=" font-medium text-sm mt-2">
          ₹
          {(item.unitPrice > 0
            ? item.unitPrice * item.quantity
            : item.quantity
          ).toFixed(0)}
        </p>
      </div>
      {/* Qty stepper */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-2 bg-stone-100 rounded-full px-2 py-1">
          {/* Minus */}
          <button
            onClick={() =>
              updateQuantity(
                item.productId,
                item.variantId,
                Math.max(0.5, item.quantity - 0.5),
              )
            }
            className="
      w-7 h-7 flex items-center justify-center
      rounded-full bg-white
      shadow-sm border border-stone-200
      text-stone-600
      hover:bg-stone-50
      active:scale-95 transition
    "
          >
            <Minus size={14} />
          </button>

          {/* Quantity */}
          <span className="min-w-[32px] text-center text-sm font-semibold text-stone-800">
            {item.quantity}
          </span>

          {/* Plus */}
          <button
            onClick={() =>
              updateQuantity(
                item.productId,
                item.variantId,
                item.quantity + 0.5,
              )
            }
            className="
      w-7 h-7 flex items-center justify-center
      rounded-full bg-green-500
      text-white
      
      hover:bg-green-600
      active:scale-95 transition
    "
          >
            <Plus size={14} />
          </button>
        </div>
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
