import { io, Socket } from 'socket.io-client';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getRealtimeClient(): Socket {
  if (!socket) {
    socket = io(BASE_URL, { withCredentials: true, autoConnect: false });
  }
  return socket;
}

export function connectRealtime(): Socket {
  const s = getRealtimeClient();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
}
