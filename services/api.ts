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
import * as FileSystem from 'expo-file-system/legacy';

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
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return {
        success: false,
        error: 'Authentication required',
        requiresAuth: true,
      };
    }


    // Validate report
    if (!report.id) {
      return {
        success: false,
        error: 'Report missing ID',
      };
    }

    // Map to backend format (flexible responses)
    const responses = mapReportToResponses(report);

    // Prepare metadata
    const metadata = prepareReportMetadata(report);

    // Build final payload - wrapped in "payload" field as backend expects
    const payloadData = {
      responses,
      metadata: {
        ...metadata,
        type: report.type,  // Include report type (audio, text, or mixed)
      },
    };

    let response;

    // If report has an audio file, send as multipart/form-data
    if (report.audioUri) {

      // Verify the audio file exists before trying to upload
      const fileInfo = await FileSystem.getInfoAsync(report.audioUri);
      if (!fileInfo.exists) {
      }

      const formData = new FormData();
      formData.append('payload', JSON.stringify(payloadData));

      if (fileInfo.exists) {
        // Determine file extension and MIME type
        const fileExtension = report.audioUri.split('.').pop()?.toLowerCase() || 'm4a';
        const mimeType = fileExtension === 'wav' ? 'audio/wav' : 'audio/m4a';

        formData.append('audio', {
          uri: report.audioUri,
          name: `recording_${report.id}.${fileExtension}`,
          type: mimeType,
        } as any);

        console.log('[API] 📎 Audio file attached:', {
          uri: report.audioUri,
          type: mimeType,
          size: fileInfo.size,
        });
      }

      response = await apiClient.post(apiConfig.endpoints.submitReport, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 min timeout for file uploads
      });
    } else {
      // Text-only report: send as JSON
      const submitPayload = { payload: payloadData };
      response = await apiClient.post(apiConfig.endpoints.submitReport, submitPayload);
    }

    if (response.status === 200 || response.status === 201) {
      const data = response.data;


      // Update report with status from backend (not hardcoded)
      const submissionId = data.reportId || data.submissionId;
      const backendStatus = data.status || 'pending';
      await updateReportStatus(
        report.id,
        backendStatus,
        submissionId
      );

      return {
        success: true,
        reportId: report.id,
        submissionId,
        txHash: data.txHash,
        ipfsHash: data.ipfsHash,
        status: backendStatus,
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, 'Failed to submit report');

    // Check if it's an authentication error (401)
    const isAuthError = errorMessage.toLowerCase().includes('authentication') ||
      (error instanceof Error && error.message.includes('401'));

    if (isAuthError) {
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
 * Works for submitted reports
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
 * Retrieves decrypted report content for submitted reports
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
