import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  res => res,
  err => {
    console.error('[API Error]', err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default client;
