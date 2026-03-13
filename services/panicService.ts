/**
 * Panic Alert Service
 * Handles emergency alert functionality
 */

import { getApiClient } from './api';
import { apiConfig } from '@/config/api';
import { extractErrorMessage } from '@/utils/errorExtractor';

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
    return {
      success: false,
      error: extractErrorMessage(error, 'Failed to send panic alert'),
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
    return {
      success: false,
      error: extractErrorMessage(error, 'Failed to fetch panic alert history'),
    };
  }
}
