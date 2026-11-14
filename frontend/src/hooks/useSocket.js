/**
 * hooks/useSocket.js
 * Manages Socket.io connection lifecycle.
 * Connects on login, disconnects on logout, handles all incoming events.
 */
import { useEffect, useRef } from 'react';
import { io }                from 'socket.io-client';
import { useQueryClient }    from '@tanstack/react-query';
import toast                 from 'react-hot-toast';
import useAuthStore          from '../store/authStore.js';
import useUIStore            from '../store/uiStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

const EVENTS = {
  NOTIFICATION_NEW:      'notification:new',
  MESSAGE_RECEIVE:       'message:receive',
  MESSAGE_STATUS:        'message:status',
  EVENT_PUBLISHED:       'event:published',
  JOB_POSTED:            'job:posted',
  MENTORSHIP_NEW:        'mentorship:new',
  NOTE_DELETED:          'note:deleted',
  SUBSCRIPTION_EXPIRED:  'subscription:expired',
  SUBSCRIPTION_WARNING:  'subscription:warning',
  SUBSCRIPTION_RENEWED:  'subscription:renewed',
  FORCE_LOGOUT:          'auth:force_logout',
};

const useSocket = () => {
  const socketRef    = useRef(null);
  const { isAuth, accessToken, logout } = useAuthStore();
  const { setSocketConnected, incrementUnread, setSubscriptionWarning } = useUIStore();
  const queryClient  = useQueryClient();

  useEffect(() => {
    if (!isAuth || !accessToken) {
      socketRef.current?.disconnect();
      return;
    }

    // ── Connect ───────────────────────────────────────────────────────────────
    const socket = io(SOCKET_URL, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setSocketConnected(false);
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setSocketConnected(false);
    });

    // ── Notification ──────────────────────────────────────────────────────────
    socket.on(EVENTS.NOTIFICATION_NEW, ({ notification }) => {
      incrementUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      if (notification.priority === 'urgent') {
        toast.error(notification.message, { duration: 7000 });
      } else if (notification.priority === 'high') {
        toast(notification.message, { icon: '🔔', duration: 5000 });
      }
    });

    // ── Messages ──────────────────────────────────────────────────────────────
    socket.on(EVENTS.MESSAGE_RECEIVE, ({ message }) => {
      // Invalidate the specific conversation thread so it refreshes
      if (message?.senderId) {
        queryClient.invalidateQueries({ queryKey: ['msg-thread', message.senderId.toString()] });
      }
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
    });

    socket.on(EVENTS.MESSAGE_STATUS, (update) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'thread'] });
    });

    // ── College broadcasts ────────────────────────────────────────────────────
    socket.on(EVENTS.EVENT_PUBLISHED, ({ event }) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`New event: ${event.title}`, { icon: '📅' });
    });

    socket.on(EVENTS.JOB_POSTED, ({ job }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast(`New ${job.type}: ${job.title} at ${job.company}`, { icon: '💼' });
    });

    socket.on(EVENTS.MENTORSHIP_NEW, ({ session }) => {
      queryClient.invalidateQueries({ queryKey: ['mentorship'] });
      toast(`New mentorship session: ${session.title}`, { icon: '🎓' });
    });

    socket.on(EVENTS.NOTE_DELETED, ({ noteId, title }) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.removeQueries({ queryKey: ['notes', noteId] });
    });

    // ── Subscription events ───────────────────────────────────────────────────
    socket.on(EVENTS.SUBSCRIPTION_WARNING, (data) => {
      setSubscriptionWarning(data);
    });

    socket.on(EVENTS.SUBSCRIPTION_EXPIRED, (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.error('Your subscription has expired. Renew to restore access.', {
        duration: Infinity,
        id: 'sub-expired',
      });
    });

    socket.on(EVENTS.SUBSCRIPTION_RENEWED, () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Subscription renewed successfully!');
    });

    // ── Force logout ──────────────────────────────────────────────────────────
    socket.on(EVENTS.FORCE_LOGOUT, ({ reason }) => {
      toast.error(reason ?? 'Your account has been deactivated.', { duration: 8000 });
      setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 2000);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [isAuth, accessToken]);

  return socketRef.current;
};

export default useSocket;
