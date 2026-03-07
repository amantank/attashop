// ─── Product ────────────────────────────────────────────────────────────────
export interface ProductVariant {
  variantId: string;
  size: string;
  price: number;
  discount: number;
  finalPrice: number;
  stock: number;
}

export interface Product {
  _id: string;
  productId: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  price: number;
  discount: number;
  finalPrice: number;
  imageUrl: string;
  stock: number;
  categoryId: string;
  unitType: 'kg' | 'g' | 'litre' | 'packet' | 'piece';
  variants: ProductVariant[];
  isFeatured: boolean;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  _id: string;
  categoryId: string;
  name: string;
  nameHi: string;
  description: string;
  image: string;
  createdAt: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type PaymentMethod = 'upi' | 'gpay' | 'paytm' | 'cod' | 'razorpay';
export type PaymentStatus = 'pending' | 'paid' | 'cod' | 'failed';
export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderProduct {
  productId: string;
  productName: string;
  variantId?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  pincode: string;
  landmark?: string;
  products: OrderProduct[];
  totalPrice: number;
  deliveryCharge: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryDate: string;
  deliverySlot: string;
  invoicePath?: string;
  isSubscriptionOrder: boolean;
  createdAt: string;
}

// ─── Subscription ────────────────────────────────────────────────────────────
export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface Subscription {
  _id: string;
  subscriptionId: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  pincode: string;
  productId: string;
  productName: string;
  variantId?: string;
  size?: string;
  quantity: number;
  frequency: SubscriptionFrequency;
  customDays?: number;
  nextDeliveryDate: string;
  paymentMethod: PaymentMethod;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

// ─── Delivery ────────────────────────────────────────────────────────────────
export interface DeliveryArea {
  pincode: string;
  name: string;
  isActive: boolean;
}

export interface DeliverySlot {
  slotId: string;
  label: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  bookedOrders: number;
  available: boolean;
}

export interface DeliveryCharge {
  type: 'flat' | 'pincode';
  flatCharge: number;
  freeAboveAmount: number;
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItem {
  productId: string;
  productName: string;
  productNameHi: string;
  imageUrl: string;
  variantId?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  categoryId: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface Analytics {
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
}
