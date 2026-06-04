import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'new_email';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (message: string, type?: NotificationItem['type']) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (message, type = 'info') => {
    const newItem: NotificationItem = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: new Date(),
      read: false
    };
    
    set((state) => {
      const updated = [newItem, ...state.notifications].slice(0, 50); // Keep last 50
      return {
        notifications: updated,
        unreadCount: state.unreadCount + 1
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  }
}));
