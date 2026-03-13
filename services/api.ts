/**
 * Backend API Client
 * Handles communication with SafeGirl Core backend
 */

import axios, { AxiosInstance } from 'axios';
import { Report } from '@/types/report';
import { apiConfig } from '@/config/api';
import { mapReportToResponses, prepareReportMetadata } from '@/utils/reportMapper';
import { extractErrorMessage } from '@/utils/errorExtractor';
import { updateReportStatus } from './storage';
import { getAuthToken, isAuthenticated, logout } from './authService';
import * as SecureStore from 'expo-secure-store';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
});

// Add request interceptor to set Authorization header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Silently ignore auth token read errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Silent token expiry handling - no need to spam console
      try {
        // Clear auth data locally
        await SecureStore.deleteItemAsync('salama_auth_token');
        await SecureStore.deleteItemAsync('salama_auth_user');

        // Set a flag to indicate token expiry so screens can handle it
        await SecureStore.setItemAsync('salama_token_expired', 'true');
      } catch (err) {
        // Silently ignore - token clearing issues are not critical
      }
    }
    return Promise.reject(error);
  }
);

export interface SubmissionResult {
  success: boolean;
  reportId?: string;
  submissionId?: string;
  txHash?: string;
  ipfsHash?: string;
  status?: string;
  error?: string;
  requiresAuth?: boolean;
}

export interface StatusCheckResult {
  status: string;
  confirmations?: number;
  txHash?: string;
  ipfsHash?: string;
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get(apiConfig.endpoints.health);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Submit report to backend
 * 1. Encrypts report data
 * 2. Maps to backend format
 * 3. Sends to API
 * 4. Updates local database
 */
export async function submitReportToBackend(
  report: Report
): Promise<SubmissionResult> {
  try {
    console.log('[API] submitReportToBackend called for report:', report.id);
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      console.log('[API] Authentication check failed');
      return {
        success: false,
        error: 'Authentication required',
        requiresAuth: true,
      };
    }

    console.log('[API] Authentication verified');

    // Validate report
    if (!report.id) {
      console.log('[API] Report missing ID');
      return {
        success: false,
        error: 'Report missing ID',
      };
    }

    // Update status to submitted (optimistic)
    console.log('[API] Updating report status to submitted');
    await updateReportStatus(report.id, 'submitted');

    // Map to backend format (flexible responses)
    console.log('[API] Mapping report to backend format');
    const responses = mapReportToResponses(report);

    // Prepare metadata
    console.log('[API] Preparing report metadata');
    const metadata = prepareReportMetadata(report);

    // Build final payload - wrapped in "payload" field as backend expects
    const submitPayload = {
      payload: {
        responses,
        metadata,
      },
    };

    console.log('[API] Sending report to backend endpoint:', apiConfig.endpoints.submitReport);
    // Submit to backend (backend handles encryption)
    const response = await apiClient.post(apiConfig.endpoints.submitReport, submitPayload);

    if (response.status === 200 || response.status === 201) {
      const data = response.data;

      console.log('[API] ✅ Backend response received:', JSON.stringify(data, null, 2));
      console.log('[API] Extracted status from backend:', data.status);

      // Update report with submission details
      const submissionId = data.reportId || data.submissionId;
      await updateReportStatus(
        report.id,
        'submitted',
        submissionId
      );

      return {
        success: true,
        reportId: report.id,
        submissionId,
        txHash: data.txHash,
        ipfsHash: data.ipfsHash,
        status: data.status || 'pending',
      };
    }

    console.log('[API] ❌ Unexpected response status:', response.status);
    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    console.log('[API] ❌ Submission error:', error instanceof Error ? error.message : 'Unknown error');
    const errorMessage = extractErrorMessage(error, 'Failed to submit report');

    // Check if it's an authentication error (401)
    const isAuthError = errorMessage.toLowerCase().includes('authentication') ||
      (error instanceof Error && error.message.includes('401'));

    if (isAuthError) {
      console.log('[API] Authentication error detected');
      return {
        success: false,
        error: 'Authentication required',
        requiresAuth: true,
      };
    }

    // Update report with error status
    try {
      await updateReportStatus(report.id, 'failed', undefined, errorMessage);
    } catch (updateError) {
      // Silently ignore status update errors
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check report status on blockchain
 */
export async function checkReportStatus(
  reportId: string
): Promise<StatusCheckResult> {
  try {
    const response = await apiClient.get(apiConfig.endpoints.reportStatus, {
      params: { reportId },
    });

    const data = response.data;
    return {
      status: data.status || 'unknown',
      confirmations: data.confirmations || 0,
      txHash: data.txHash,
      ipfsHash: data.ipfsHash,
    };
  } catch (error) {
    extractErrorMessage(error, 'Failed to check report status');
    return {
      status: 'error',
      confirmations: 0,
    };
  }
}

/**
 * Archive a report on backend
 * Works for submitted/confirmed reports
 * Soft delete - keeps blockchain record but marks as archived
 */
export async function archiveReportOnBackend(
  reportId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiClient.post(
      `/api/report/${reportId}/archive`,
      {
        reason: reason || 'User archived',
      }
    );

    return {
      success: response.status === 200 || response.status === 201,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Decrypt report from backend
 * Retrieves decrypted report content for submitted/confirmed reports
 */
export async function decryptReportFromBackend(
  reportId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await apiClient.get(
      `${apiConfig.endpoints.reportDecrypt}/${reportId}/decrypt`
    );

    if (response.status === 200) {
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
      error: extractErrorMessage(error, 'Failed to decrypt report'),
    };
  }
}

/**
 * Search reports on backend with filters
 */
export async function searchBackendReports(
  params?: {
    status?: string;
    createdAfter?: string;
    createdBefore?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ success: boolean; reports?: any[]; pagination?: any; error?: string }> {
  try {
    const response = await apiClient.get(apiConfig.endpoints.searchReports, {
      params: params || {},
    });

    if (response.status === 200) {
      return {
        success: true,
        reports: response.data.data?.reports || response.data.data || [],
        pagination: response.data.data?.pagination,
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, 'Failed to search reports'),
    };
  }
}

/**
 * Get report statistics from backend
 */
export async function getReportStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
  try {
    const response = await apiClient.get(apiConfig.endpoints.searchStats);

    if (response.status === 200) {
      return {
        success: true,
        stats: response.data.data,
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, 'Failed to fetch report stats'),
    };
  }
}

/**
 * Get API client instance (for advanced usage)
 */
export function getApiClient(): AxiosInstance {
  return apiClient;
}
