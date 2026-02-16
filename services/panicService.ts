/**
 * Panic Alert Service
 * Handles emergency alert functionality
 */

import { getApiClient } from './api';
import { apiConfig } from '@/config/api';

export interface PanicAlert {
  alertId: string;
  txHash: string;
  timestamp: string;
}

export interface PanicAlertHistoryItem {
  id: string;
  timestamp: string;
  txHash: string;
  locationData?: string;
  status: string;
}

/**
 * Send panic alert (authenticated)
 * Rate limited to 10 per minute
 */
export async function sendPanicAlert(
  locationData: string
): Promise<{ success: boolean; data?: PanicAlert; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.post(apiConfig.endpoints.panicAlert, {
      locationData,
    });

    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    console.error('Error sending panic alert:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send panic alert';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get panic alert history (authenticated)
 */
export async function getPanicAlertHistory(
  limit: number = 10,
  offset: number = 0
): Promise<{ success: boolean; alerts?: PanicAlertHistoryItem[]; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.get(apiConfig.endpoints.panicAlertHistory, {
      params: { limit, offset },
    });

    if (response.status === 200) {
      return {
        success: true,
        alerts: response.data.data?.alerts || response.data.data || [],
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    console.error('Error fetching panic alert history:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch panic alert history';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
