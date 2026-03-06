import client from './client';
import type { DeliverySlot, DeliveryCharge, DeliveryArea } from '../types';

export const getDeliveryAreas = () =>
  client.get<{ success: boolean; areas: DeliveryArea[] }>('/api/delivery/areas').then(r => r.data);

export const getSlotAvailability = (date: string) =>
  client
    .get<{ success: boolean; date: string; slots: DeliverySlot[] }>('/api/orders/slots/availability', {
      params: { date },
    })
    .then(r => r.data);

export const getDeliveryCharge = () =>
  client.get<{ success: boolean; config: DeliveryCharge }>('/api/delivery/charges').then(r => r.data);

export const calculateDeliveryCharge = async (pincode: string, subtotal: number): Promise<number> => {
  try {
    const { config } = await getDeliveryCharge();
    if (!config) return 0;
    if (subtotal >= config.freeAboveAmount) return 0;
    return config.flatCharge;
  } catch {
    return 0;
  }
};
