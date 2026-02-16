/**
 * Notification Service
 * Handles notification management
 */

import { getApiClient } from './api';
import { apiConfig } from '@/config/api';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
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
): Promise<{ success: boolean; notifications?: Notification[]; pagination?: any; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.get(apiConfig.endpoints.notifications, {
      params: params || {},
    });

    if (response.status === 200) {
      return {
        success: true,
        notifications: response.data.data?.notifications || response.data.data || [],
        pagination: response.data.data?.pagination,
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch notifications';
    return {
      success: false,
      error: errorMessage,
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
    console.error('Error fetching unread count:', error);
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
    console.error('Error marking notification as read:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to mark notification as read';
    return {
      success: false,
      error: errorMessage,
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
    console.error('Error marking all notifications as read:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to mark all notifications as read';
    return {
      success: false,
      error: errorMessage,
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
    console.error('Error deleting notification:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete notification';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
