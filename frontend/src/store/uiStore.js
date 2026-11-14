/**
 * store/uiStore.js
 * UI state: sidebar collapse, notifications count, socket status
 */
import { create } from 'zustand';

const useUIStore = create((set, get) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Unread notifications badge
  unreadCount:   0,
  setUnreadCount: (n)  => set({ unreadCount: n }),
  incrementUnread: ()  => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  clearUnread: ()      => set({ unreadCount: 0 }),

  // Socket connection status
  socketConnected: false,
  setSocketConnected: (v) => set({ socketConnected: v }),

  // Global subscription warning banner (shown to all college users)
  subscriptionWarning: null,
  setSubscriptionWarning: (data) => set({ subscriptionWarning: data }),
  clearSubscriptionWarning: ()   => set({ subscriptionWarning: null }),
}));

export default useUIStore;
