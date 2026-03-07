import client from './client';
import type { Subscription, SubscriptionFrequency, PaymentMethod } from '../types';

export interface CreateSubscriptionPayload {
  customerName: string;
  phoneNumber: string;
  address: string;
  pincode: string;
  productId: string;
  productName: string;
  variantId?: string;
  quantity: number;
  frequency: SubscriptionFrequency;
  paymentMethod: PaymentMethod | string;
  deliverySlot?: string;
}

export const createSubscription = (payload: CreateSubscriptionPayload) =>
  client
    .post<{ success: boolean; subscription: Subscription }>('/api/subscriptions', payload)
    .then(r => r.data);

export const getSubscriptionsByPhone = (phoneNumber: string) =>
  client
    .get<{ success: boolean; subscriptions: Subscription[] }>('/api/subscriptions', {
      params: { phoneNumber },
    })
    .then(r => r.data);

export const cancelSubscription = (subscriptionId: string) =>
  client
    .patch<{ success: boolean }>(`/api/subscriptions/${subscriptionId}/status`, { subscriptionStatus: 'cancelled' })
    .then(r => r.data);
