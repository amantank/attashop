import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, PaymentMethod } from '../types';

interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  landmark: string;
}

interface CartState {
  items: CartItem[];
  customerInfo: CustomerInfo;
  deliveryDate: string;
  deliverySlot: string;
  paymentMethod: PaymentMethod;
  deliveryCharge: number;

  subscribeItems: string[];
  subFrequency: 'weekly' | 'biweekly' | 'monthly';

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  setDeliveryDate: (date: string) => void;
  setDeliverySlot: (slot: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setDeliveryCharge: (charge: number) => void;
  repeatOrder: (items: CartItem[]) => void;
  toggleSubscribeItem: (productId: string) => void;
  setSubFrequency: (freq: 'weekly' | 'biweekly' | 'monthly') => void;

  // Computed helpers
  itemCount: () => number;
  subtotal: () => number;
  total: () => number;
}

const isSameItem = (a: CartItem, b: CartItem) =>
  a.productId === b.productId && a.variantId === b.variantId;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerInfo: { name: '', phone: '', address: '', pincode: '', landmark: '' },
      deliveryDate: '',
      deliverySlot: '',
      paymentMethod: 'cod',
      deliveryCharge: 0,
      subscribeItems: [],
      subFrequency: 'weekly',

      addItem: (item) =>
        set(state => {
          const existing = state.items.find(i => isSameItem(i, item));
          if (existing) {
            return {
              items: state.items.map(i =>
                isSameItem(i, item) ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (productId, variantId) =>
        set(state => ({
          items: state.items.filter(i => !(i.productId === productId && i.variantId === variantId)),
        })),

      updateQuantity: (productId, variantId, quantity) =>
        set(state => ({
          items:
            quantity <= 0
              ? state.items.filter(i => !(i.productId === productId && i.variantId === variantId))
              : state.items.map(i =>
                  i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
                ),
        })),

      clearCart: () => set({ items: [], subscribeItems: [], subFrequency: 'weekly' }),

      setCustomerInfo: (info) =>
        set(state => ({ customerInfo: { ...state.customerInfo, ...info } })),

      setDeliveryDate: (date) => set({ deliveryDate: date }),
      setDeliverySlot: (slot) => set({ deliverySlot: slot }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setDeliveryCharge: (charge) => set({ deliveryCharge: charge }),

      repeatOrder: (items) => set({ items }),

      toggleSubscribeItem: (productId) =>
        set(state => {
          const next = new Set(state.subscribeItems);
          if (next.has(productId)) next.delete(productId);
          else next.add(productId);
          return { subscribeItems: Array.from(next) };
        }),
      setSubFrequency: (freq) => set({ subFrequency: freq }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      total: () => get().subtotal() + get().deliveryCharge,
    }),
    {
      name: 'attashop-cart',
      partialize: (state) => ({
        items: state.items,
        customerInfo: state.customerInfo,
        deliveryCharge: state.deliveryCharge,
        subscribeItems: state.subscribeItems,
        subFrequency: state.subFrequency,
      }),
    }
  )
);
