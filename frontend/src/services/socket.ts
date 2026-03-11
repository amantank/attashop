import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '';
const socketUrl = API_URL.startsWith('http') ? API_URL : '/';

export const socket: Socket = io(socketUrl, {
  autoConnect: true,
  withCredentials: true,
});

// Logs connection status for debugging
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket backend:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket backend');
});
