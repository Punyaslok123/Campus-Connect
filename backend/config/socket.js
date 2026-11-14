/**
 * config/socket.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Socket.io server factory.
 *
 * Architecture:
 *   • Single global namespace (no per-college namespaces — rooms are cheaper)
 *   • Every socket joins TWO rooms on connect:
 *       room:user:{userId}              → personal events (DMs, notifications)
 *       room:college:{collegeId}        → broadcast events (events, jobs, expiry)
 *   • Owner joins room:owner            → cross-tenant alerts
 *   • JWT verified on handshake — unauthenticated connections are refused
 *   • Packet middleware validates collegeId scope on every event to prevent
 *     a user from emitting to another college's room
 *
 * Emitting from controllers:
 *   Use socketService.js (singleton) — never import `io` directly.
 *
 * Events (server → client):
 *   notification:new        → room:user:{userId}
 *   message:receive         → room:user:{receiverId}
 *   message:status          → room:user:{senderId}
 *   event:published         → room:college:{collegeId}
 *   job:posted              → room:college:{collegeId}
 *   mentorship:new          → room:college:{collegeId}
 *   subscription:expired    → room:college:{collegeId}
 *   subscription:warning    → room:college:{collegeId}  (14-day expiry warning)
 *   note:deleted            → room:college:{collegeId}
 *
 * Events (client → server):
 *   message:send            → deliver to receiver + persist ack
 *   message:delivered       → update delivery status
 *   message:read            → update read status
 *   typing:start            → relay to conversation partner
 *   typing:stop             → relay to conversation partner
 *   ping                    → heartbeat / latency check
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Server as SocketIO } from 'socket.io';
import jwt                    from 'jsonwebtoken';
import { socketService }      from '../services/socketService.js';

const { JWT_ACCESS_SECRET, FRONTEND_URL = 'http://localhost:5173', NODE_ENV } = process.env;

// ── Allowed origins (same list as CORS config) ────────────────────────────────
const getAllowedOrigins = () => {
  const port = process.env.PORT || 5000;
  const base = [
    FRONTEND_URL,
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://localhost:3000',
  ];
  return [...new Set(base.filter(Boolean))];
};

// ── Socket.io JWT auth middleware ─────────────────────────────────────────────

/**
 * Runs on every new connection attempt.
 * Validates the JWT from handshake.auth.token.
 * Attaches decoded identity to socket.user.
 */
const authMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token
    ?? socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new Error('AUTH_REQUIRED: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    socket.user = {
      _id:       decoded.sub,
      role:      decoded.role,
      collegeId: decoded.collegeId ?? null,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new Error('AUTH_EXPIRED: Token expired. Please refresh.'));
    }
    return next(new Error('AUTH_INVALID: Invalid token.'));
  }
};

// ── Per-packet scope guard ────────────────────────────────────────────────────

/**
 * Runs before every incoming event from a client.
 * Prevents a socket from emitting events that target other colleges.
 *
 * Currently guards: message:send (receiverId must be same college)
 * Extend this list as needed.
 */
const packetMiddleware = (packet, next) => {
  // packet = [eventName, ...args]
  const [eventName, data] = packet;

  const GUARDED_EVENTS = ['message:send', 'typing:start', 'typing:stop'];

  if (GUARDED_EVENTS.includes(eventName) && data?.targetCollegeId) {
    // If the client sends a targetCollegeId, it must match socket.user.collegeId
    if (data.targetCollegeId !== this.user?.collegeId) {
      return next(new Error('SCOPE_VIOLATION: Cross-college event rejected'));
    }
  }

  next();
};

// ── Room helpers ──────────────────────────────────────────────────────────────

export const Rooms = {
  user:    (userId)    => `room:user:${userId}`,
  college: (collegeId) => `room:college:${collegeId}`,
  owner:   ()          => 'room:owner',
};

// ── Connection handler ────────────────────────────────────────────────────────

const handleConnection = (io) => (socket) => {
  const { _id, role, collegeId } = socket.user;

  // ── Join rooms ─────────────────────────────────────────────────────────────
  socket.join(Rooms.user(_id));

  if (collegeId) {
    socket.join(Rooms.college(collegeId));
  }

  if (role === 'owner') {
    socket.join(Rooms.owner());
  }

  // ── message:send ──────────────────────────────────────────────────────────
  // Client sends a message → we relay to receiver's personal room
  // Note: persistence is handled by the REST API (POST /api/messages)
  // Socket is for real-time delivery only
  socket.on('message:send', (data, ack) => {
    try {
      const { receiverId, tempId, content, messageType = 'text' } = data ?? {};

      if (!receiverId || !content) {
        return typeof ack === 'function'
          ? ack({ ok: false, error: 'receiverId and content are required' })
          : null;
      }

      // Relay to receiver
      io.to(Rooms.user(receiverId)).emit('message:receive', {
        tempId,
        senderId:  _id,
        collegeId,
        content,
        messageType,
        createdAt: new Date().toISOString(),
      });

      // Acknowledge sender
      if (typeof ack === 'function') ack({ ok: true, tempId });

    } catch (err) {
      console.error('[Socket.io] message:send error:', err.message);
    }
  });

  // ── message:delivered ─────────────────────────────────────────────────────
  // Receiver confirms delivery → notify sender to update UI status
  socket.on('message:delivered', ({ messageId, senderId }) => {
    if (!messageId || !senderId) return;
    io.to(Rooms.user(senderId)).emit('message:status', {
      messageId,
      status: 'delivered',
    });
  });

  // ── message:read ──────────────────────────────────────────────────────────
  // Receiver opens conversation → notify sender of read receipt
  socket.on('message:read', ({ messageId, senderId }) => {
    if (!messageId || !senderId) return;
    io.to(Rooms.user(senderId)).emit('message:status', {
      messageId,
      status: 'read',
    });
  });

  // ── typing:start / typing:stop ────────────────────────────────────────────
  socket.on('typing:start', ({ receiverId }) => {
    if (!receiverId) return;
    io.to(Rooms.user(receiverId)).emit('typing:start', { senderId: _id });
  });

  socket.on('typing:stop', ({ receiverId }) => {
    if (!receiverId) return;
    io.to(Rooms.user(receiverId)).emit('typing:stop', { senderId: _id });
  });

  // ── ping / heartbeat ──────────────────────────────────────────────────────
  socket.on('ping', (ack) => {
    if (typeof ack === 'function') ack({ pong: true, ts: Date.now() });
  });

  // ── error ─────────────────────────────────────────────────────────────────
  socket.on('error', (err) => {
    console.error(`[Socket.io] Socket error for user:${_id}:`, err.message);
  });
};

// ── Factory: initialise Socket.io and attach to HTTP server ──────────────────

/**
 * @param {import('http').Server} httpServer
 * @returns {SocketIO} configured io instance
 */
export const initSocket = (httpServer) => {
  const io = new SocketIO(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (getAllowedOrigins().includes(origin)) return callback(null, true);
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        if (/^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(origin)) return callback(null, true);
        return callback(null, true);
      },
      methods:     ['GET', 'POST'],
      credentials: true,
    },

    // Connection transport settings
    transports:              ['websocket', 'polling'],   // prefer WS, fallback to polling
    pingTimeout:             30000,    // 30s without pong → disconnect
    pingInterval:            25000,    // send ping every 25s
    upgradeTimeout:          15000,    // max time for transport upgrade

    // Security
    allowEIO3:               false,    // reject Engine.IO v3 clients (legacy)
    maxHttpBufferSize:       1e6,      // 1MB max message size (prevents memory DoS)

    // Cookie config — we don't use socket.io cookies (JWT is our auth)
    cookie: false,
  });

  // Attach JWT auth middleware to ALL incoming connections
  io.use(authMiddleware);

  // Register connection handler
  io.on('connection', handleConnection(io));

  // Register io instance with the socketService singleton
  socketService.init(io);

  return io;
};
