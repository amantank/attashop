import client from './client';
import type { Order, CartItem, PaymentMethod } from '../types';

export interface PlaceOrderPayload {
  customerName: string;
  phoneNumber: string;
  address: string;
  pincode: string;
  landmark?: string;
  products: { productId: string; variantId?: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  deliveryDate: string;
  deliverySlot: string;
}

export const placeOrder = (payload: PlaceOrderPayload) =>
  client.post<{ success: boolean; order: Order }>('/api/orders', payload).then(r => r.data);

export const getOrder = (orderId: string) =>
  client.get<{ success: boolean; order: Order }>(`/api/orders/${orderId}`).then(r => r.data);

export const getOrdersByPhone = (phoneNumber: string) =>
  client
    .get<{ success: boolean; orders: Order[] }>('/api/customers/orders', {
      params: { phoneNumber },
    })
    .then(r => r.data);

/** Build cart items from a previous order for repeat-order feature */
export const buildRepeatCartItems = (order: Order): CartItem[] =>
  order.products.map(p => ({
    productId: p.productId,
    productName: p.productName,
    productNameHi: p.productName,
    imageUrl: '',
    variantId: p.variantId,
    size: p.size,
    quantity: p.quantity,
    unitPrice: p.unitPrice,
    categoryId: '',
  }));
