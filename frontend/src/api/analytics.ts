import client from './client';
import type { Analytics } from '../types';

export const getAnalytics = () =>
  client.get<{ success: boolean; analytics: Analytics }>('/api/analytics').then(r => r.data);
