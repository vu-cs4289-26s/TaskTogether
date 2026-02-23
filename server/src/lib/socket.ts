import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

/**
 * Call once in index.ts after createServer(app).
 * Attaches Socket.io and registers the `join` event so clients
 * can subscribe to their personal notification room.
 */
export function initSocket(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Each client emits { userId } after connecting to join their personal room.
  // Room name: `user:{userId}` — notifications are emitted only to this room.
  io.on('connection', (socket) => {
    socket.on('join', ({ userId }: { userId: string }) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });
  });

  return io;
}

/**
 * Returns the existing Socket.io instance.
 * Throws if initSocket() was not called first.
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket() first.');
  }
  return io;
}
