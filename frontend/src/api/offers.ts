import client from './client';


export interface OffersResponse {
  success: boolean;
  offers: any[];
}

export const getActiveOffers = () =>
  client.get<OffersResponse>('/api/offers/active').then(r => r.data);

export const getAllOffers = () =>
  client.get<OffersResponse>('/api/offers').then(r => r.data);

export const createOffer = (data: Partial<any>) =>
  client.post<{ success: boolean; offer: any }>('/api/offers', data).then(r => r.data);

export const deleteOffer = (offerId: string) =>
  client.delete(`/api/offers/${offerId}`).then(r => r.data);

export const seedOffers = () =>
  client.post('/api/offers/seed').then(r => r.data);