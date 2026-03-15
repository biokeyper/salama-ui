
import axios, { AxiosInstance } from 'axios';
import { Report } from '@/types/report';
import { apiConfig } from '@/config/api';
import { mapReportToResponses, prepareReportMetadata } from '@/utils/reportMapper';
import { extractErrorMessage } from '@/utils/errorExtractor';
import { updateReportStatus } from './storage';
import { getAuthToken, isAuthenticated, logout } from './authService';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('salama_auth_token');
        await SecureStore.deleteItemAsync('salama_auth_user');
        await SecureStore.setItemAsync('salama_token_expired', 'true');
      } catch (err) {
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

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get(apiConfig.endpoints.health);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

export async function submitReportToBackend(
  report: Report
): Promise<SubmissionResult> {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return {
        success: false,
        error: 'Authentication required',
        requiresAuth: true,
      };
    }

    if (!report.id) {
      return {
        success: false,
        error: 'Report missing ID',
      };
    }

    const responses = mapReportToResponses(report);
    const metadata = prepareReportMetadata(report);

    const payloadData = {
      responses,
      metadata: {
        ...metadata,
        type: report.type,
      },
    };

    let response;

    if (report.audioUri) {
      const fileInfo = await FileSystem.getInfoAsync(report.audioUri);
      if (!fileInfo.exists) {
        return {
          success: false,
          error: 'Audio file not found',
        };
      }

      const formData = new FormData();
      formData.append('payload', JSON.stringify(payloadData));

      const fileExtension = report.audioUri.split('.').pop()?.toLowerCase() || 'm4a';
      const mimeType = fileExtension === 'wav' ? 'audio/wav' : 'audio/m4a';

      formData.append('audio', {
        uri: report.audioUri,
        name: `recording_${report.id}.${fileExtension}`,
        type: mimeType,
      } as any);

      response = await apiClient.post(apiConfig.endpoints.submitReport, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      });
    } else {
      const submitPayload = { payload: payloadData };
      response = await apiClient.post(apiConfig.endpoints.submitReport, submitPayload);
    }

    if (response.status === 200 || response.status === 201) {
      const data = response.data;

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

    const isAuthError = errorMessage.toLowerCase().includes('authentication') ||
      (error instanceof Error && error.message.includes('401'));

    if (isAuthError) {
      return {
        success: false,
        error: 'Authentication required',
        requiresAuth: true,
      };
    }

    try {
      await updateReportStatus(report.id, 'failed', undefined, errorMessage);
    } catch (updateError) {
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

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


export function getApiClient(): AxiosInstance {
  return apiClient;
}
