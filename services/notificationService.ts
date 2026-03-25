/**
 * Notification Service
 * Handles notification management
 */

import { getApiClient } from './api';
import { apiConfig } from '@/config/api';
import { extractErrorMessage } from '@/utils/errorExtractor';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    unreadCount?: number;
  };
}

/**
 * Get notifications with optional filtering (authenticated)
 */
export async function getNotifications(
  params?: {
    isRead?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ success: boolean; notifications?: Notification[]; pagination?: any; unreadCount?: number; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.get(apiConfig.endpoints.notifications, {
      params: params || {},
    });

    if (response.status === 200) {
      let notifications: any[] = [];

      if (response.data.data?.notifications) {
        notifications = Array.isArray(response.data.data.notifications) ? response.data.data.notifications : [];
      } else if (response.data.data) {
        notifications = Array.isArray(response.data.data) ? response.data.data : [];
      }

      return {
        success: true,
        notifications,
        pagination: response.data.data?.pagination,
        unreadCount: response.data.data?.pagination?.unreadCount,
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, 'Failed to fetch notifications'),
    };
  }
}

/**
 * Get count of unread notifications (authenticated)
 */
export async function getUnreadCount(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.get(apiConfig.endpoints.notificationsUnreadCount);

    if (response.status === 200) {
      return {
        success: true,
        count: response.data.data?.unreadCount || response.data.data?.count || 0,
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    // Silently handle 401 errors (token expiry) - this is normal
    // Only log other errors
    if (!((error as any)?.response?.status === 401)) {
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch unread count';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Mark a single notification as read (authenticated)
 */
export async function markNotificationRead(
  notificationId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.post(
      `${apiConfig.endpoints.notifications}/${notificationId}/read`,
      {}
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Failed to mark notification as read',
    };
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, 'Failed to mark notification as read'),
    };
  }
}

/**
 * Mark all notifications as read (authenticated)
 */
export async function markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.post(apiConfig.endpoints.notificationsMarkAllRead, {});

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Failed to mark all notifications as read',
    };
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, 'Failed to mark all notifications as read'),
    };
  }
}

/**
 * Delete a notification (authenticated)
 */
export async function deleteNotification(
  notificationId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.delete(
      `${apiConfig.endpoints.notifications}/${notificationId}`
    );

    if (response.status === 200 || response.status === 204) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Failed to delete notification',
    };
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, 'Failed to delete notification'),
    };
  }
}
