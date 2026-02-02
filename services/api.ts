/**
 * Backend API Client
 * Handles communication with SafeGirl Core backend
 */

import axios, { AxiosInstance } from 'axios';
import { Report } from '@/types/report';
import { apiConfig } from '@/config/api';
import { encryptReport } from '@/utils/encryption';
import { mapReportToResponses, prepareReportMetadata } from '@/utils/reportMapper';
import { updateReportStatus } from './storage';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
});

export interface SubmissionResult {
  success: boolean;
  reportId?: string;
  submissionId?: string;
  txHash?: string;
  ipfsHash?: string;
  status?: string;
  error?: string;
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
    // Validate report
    if (!report.id) {
      return {
        success: false,
        error: 'Report missing ID',
      };
    }

    // Update status to submitted (optimistic)
    await updateReportStatus(report.id, 'submitted');

    // Encrypt report data
    const encryptedPayload = await encryptReport({
      id: report.id,
      type: report.type,
      content: report.textContent || '[Audio Report]',
      metadata: report.metadata,
      timestamp: report.createdAt,
    });

    // Map to backend format (5 screening questions)
    const responses = mapReportToResponses(report);

    // Prepare metadata
    const metadata = prepareReportMetadata(report);

    // Submit to backend
    const response = await apiClient.post(apiConfig.endpoints.submitReport, {
      encryptedPayload,
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
 * Get API client instance (for advanced usage)
 */
export function getApiClient(): AxiosInstance {
  return apiClient;
}
