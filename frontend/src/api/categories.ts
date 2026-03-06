import client from './client';
import type { Category } from '../types';

export const getCategories = () =>
  client.get<{ success: boolean; categories: Category[] }>('/api/categories').then(r => r.data);
