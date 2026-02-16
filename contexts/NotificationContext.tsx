/**
 * Notification Context
 * Manages notification state and provides notification utilities
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUnreadCount } from '@/services/notificationService';

export interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  // Refresh unread count on mount
  useEffect(() => {
    refreshUnreadCount();
  }, []);

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
