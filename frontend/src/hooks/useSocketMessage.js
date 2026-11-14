/**
 * hooks/useSocketMessage.js
 *
 * Real-time messaging hook. Connects to the existing Socket.io server,
 * listens for incoming `message:receive` events and appends them to the
 * active thread without a full refetch. Also emits typing indicators.
 *
 * Usage:
 *   const { sendTyping, stopTyping } = useSocketMessage({
 *     activeUserId,        // the user we're chatting with
 *     onMessage: (msg) => setMessages(prev => [...prev, msg]),
 *   });
 */
import { useEffect, useRef, useCallback } from 'react';
import { io }                             from 'socket.io-client';
import useAuthStore                       from '../store/authStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';

const useSocketMessage = ({ activeUserId, onMessage }) => {
  const { accessToken, user } = useAuthStore();
  const socketRef             = useRef(null);

  useEffect(() => {
    if (!accessToken) return;

    // Reuse an existing socket if already connected (share with useSocket hook if needed)
    const socket = io(SOCKET_URL, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    });

    socketRef.current = socket;

    socket.on('message:receive', ({ message }) => {
      if (!message) return;
      const senderId = message.senderId?.toString?.() ?? message.senderId;
      // Only surface messages from the currently open conversation
      if (activeUserId && senderId !== activeUserId) return;
      onMessage?.(message);
    });

    return () => {
      socket.removeAllListeners('message:receive');
      socket.disconnect();
    };
  }, [accessToken, activeUserId]);

  const sendTyping = useCallback(() => {
    if (socketRef.current?.connected && activeUserId) {
      socketRef.current.emit('typing:start', { receiverId: activeUserId });
    }
  }, [activeUserId]);

  const stopTyping = useCallback(() => {
    if (socketRef.current?.connected && activeUserId) {
      socketRef.current.emit('typing:stop', { receiverId: activeUserId });
    }
  }, [activeUserId]);

  return { sendTyping, stopTyping };
};

export default useSocketMessage;
