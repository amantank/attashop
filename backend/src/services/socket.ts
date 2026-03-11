import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to socket: ${socket.id}`);

    // Client requests to listen for updates on a specific order
    socket.on('join_order_room', (orderId: string) => {
      console.log(`📡 Socket ${socket.id} joining room: order-${orderId}`);
      socket.join(`order-${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Helper explicitly for emitting payment updates
export const emitPaymentStatusUpdate = (orderId: string, status: string) => {
  if (io) {
    console.log(`🚀 Emitting payment_updated to order-${orderId} with status: ${status}`);
    io.to(`order-${orderId}`).emit('payment_updated', { orderId, status });
  } else {
    console.warn('⚠️ emitPaymentStatusUpdate called but Socket.io is not initialized!');
  }
};
