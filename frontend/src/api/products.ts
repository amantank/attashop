import client from './client';
import type { Product } from '../types';

export interface ProductsResponse {
  success: boolean;
  products: Product[];
  total: number;
}

export const getProducts = (params?: {
  category?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}) => {
  const apiParams: any = { ...params };
  if (apiParams.category) {
    apiParams.categoryId = apiParams.category;
    delete apiParams.category;
  }
  return client.get<ProductsResponse>('/api/products', { params: apiParams }).then(r => r.data);
};

export const getProduct = (productId: string) =>
  client.get<{ success: boolean; product: Product }>(`/api/products/${productId}`).then(r => r.data);

export const searchProducts = (q: string) =>
  client.get<ProductsResponse>('/api/products', { params: { search: q, limit: 20 } }).then(r => r.data);
