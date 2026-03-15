/**
 * Notification Context
 * Manages notification state and provides notification utilities
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUnreadCount } from '@/services/notificationService';
import { useAuth } from './AuthContext';

export interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Refresh unread count on mount and when user changes
  useEffect(() => {
    if (user) {
      refreshUnreadCount();
    } else {
      // Clear count when user logs out or deletes account
      setUnreadCount(0);
    }
  }, [user]);

  const refreshUnreadCount = async () => {
    try {
      const result = await getUnreadCount();
      if (result.success && result.count !== undefined) {
        setUnreadCount(result.count);
      }
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
