import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import type { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

interface Props { product: Product; }

const PLACEHOLDER = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop';

export default function ProductCard({ product }: Props) {
  const { t, lang } = useLanguage();
  const addItem = useCartStore(s => s.addItem);

  const name = lang === 'hi' && product.nameHi ? product.nameHi : product.name;
  const hasVariants = product.variants.length > 0;
  const defaultVariant = hasVariants ? product.variants[0] : null;
  const displayPrice = (defaultVariant && defaultVariant.price > 0) ? defaultVariant.price : product.pricing.basePrice;
  const basePrice    = product.pricing.mrp > displayPrice ? product.pricing.mrp : displayPrice;
  const discount     = basePrice > displayPrice ? Math.round(((basePrice - displayPrice) / basePrice) * 100) : 0;
  const totalStock   = product.inventory.quantity;
  const isOutOfStock = totalStock === 0 || product.stockStatus === 'out_of_stock';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    addItem({
      productId: product.productId,
      productName: product.name,
      productNameHi: product.nameHi,
      imageUrl: product.images?.[0] || PLACEHOLDER,
      variantId: defaultVariant?._id,
      size: defaultVariant ? (defaultVariant.weight > 0 ? `${defaultVariant.weight}${defaultVariant.unit}` : 'Loose') : undefined,
      quantity: 1,
      unitPrice: displayPrice,
      categoryId: product.categoryId,
    });
    toast.success(`${name} ${t('addToCart')} ✓`);
  };

  return (
    <Link to={`/products/${product.productId}`} className="block group">
      <div className="card overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-amber-50">
          <img
            src={product.images?.[0] || PLACEHOLDER}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {discount > 0 && (
            <span className="absolute top-2 left-2 pill-amber text-[11px] font-bold shadow">
              −{discount}% {t('discount')}
            </span>
          )}
          {product.isFeatured && (
            <span className="absolute top-2 right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow">
              <Star size={13} fill="white" className="text-white" />
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="pill-gray text-white bg-stone-700 text-xs font-bold">{t('outOfStock')}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-0.5 truncate">
            {product.categoryId}
          </p>
          <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2 mb-2">{name}</h3>

          {/* Variant size pills */}
          {hasVariants && (
            <div className="flex flex-wrap gap-1 mb-2">
              {product.variants.slice(0, 3).map((v, i) => (
                <span key={v._id || i} className="px-2 py-0.5 text-[10px] font-semibold border border-stone-200 rounded-full text-stone-500">
                  {v.weight > 0 ? `${v.weight}${v.unit}` : 'Loose'}
                </span>
              ))}
            </div>
          )}

          {/* Price row */}
          <div className="flex items-center justify-between mt-1">
            <div>
              <span className="text-base font-extrabold text-stone-900">₹{displayPrice}</span>
              {discount > 0 && (
                <span className="text-xs text-stone-400 line-through ml-1.5">₹{basePrice}</span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`p-2 rounded-xl transition-all ${
                isOutOfStock
                  ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-amber-200 active:scale-90'
              }`}
            >
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
