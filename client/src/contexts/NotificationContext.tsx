'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { listHouseholdsApi } from '@/lib/households.api';
import {
  listNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '@/lib/notifications.api';
import type { Notification } from '@/types/notifications';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (householdId: string, notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

/** Derive the socket.io server URL from the API base URL */
function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  // Strip trailing /api path to get the base server URL
  return apiUrl.replace(/\/api\/?$/, '');
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const householdIdsRef = useRef<string[]>([]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Fetch notifications from all households
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const households = await listHouseholdsApi();
      householdIdsRef.current = households.map((h) => h.id);

      const results = await Promise.allSettled(
        households.map((h) => listNotificationsApi(h.id, { limit: 20 }))
      );

      const allNotifications: Notification[] = [];
      const seenIds = new Set<string>();

      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const n of result.value.notifications) {
            if (!seenIds.has(n.id)) {
              seenIds.add(n.id);
              allNotifications.push(n);
            }
          }
        }
      }

      allNotifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(allNotifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Connect socket.io when user is authenticated
  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      return;
    }

    fetchNotifications();

    const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { userId: user.id });
    });

    socket.on('notification', (data: Notification) => {
      setNotifications((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === data.id)) return prev;
        return [data, ...prev];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchNotifications]);

  const markRead = useCallback(
    async (householdId: string, notificationId: string) => {
      try {
        await markNotificationReadApi(householdId, notificationId);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    try {
      await Promise.allSettled(
        householdIdsRef.current.map((hId) => markAllNotificationsReadApi(hId))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markRead,
        markAllRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
