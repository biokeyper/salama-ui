/**
 * Backend API Client
 * Handles communication with SafeGirl Core backend
 */

import axios, { AxiosInstance } from 'axios';
import { Report } from '@/types/report';
import { apiConfig } from '@/config/api';
import { mapReportToResponses, prepareReportMetadata } from '@/utils/reportMapper';
import { updateReportStatus } from './storage';
import { getAuthToken, isAuthenticated } from './authService';

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
      console.error('Error reading auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
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
    console.error('Backend health check failed:', error);
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

    // Update status to submitted (optimistic)
    await updateReportStatus(report.id, 'submitted');

    // Map to backend format (flexible responses)
    const responses = mapReportToResponses(report);

    // Prepare metadata
    const metadata = prepareReportMetadata(report);

    // Submit to backend (backend handles encryption)
    const response = await apiClient.post(apiConfig.endpoints.submitReport, {
      responses,
      metadata,
    });

    if (response.status === 200 || response.status === 201) {
      const data = response.data;

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

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    console.error('Error submitting report:', error);

    // Update report with error status
    try {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateReportStatus(report.id, 'failed', undefined, errorMessage);
    } catch (updateError) {
      console.error('Error updating report status:', updateError);
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to submit report',
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
    console.error('Error checking report status:', error);
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
    console.error('Error decrypting report:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to decrypt report';
    return {
      success: false,
      error: errorMessage,
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
    console.error('Error searching reports:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to search reports';
    return {
      success: false,
      error: errorMessage,
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
    console.error('Error fetching report stats:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch report stats';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get API client instance (for advanced usage)
 */
export function getApiClient(): AxiosInstance {
  return apiClient;
}
