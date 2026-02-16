/**
 * Access & Sharing Service
 * Handles report sharing and access control
 */

import { getApiClient } from './api';
import { apiConfig } from '@/config/api';

export interface AccessViewer {
  userId: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface SharedReport {
  reportId: string;
  sharedBy: string;
  grantedAt: string;
  status: string;
  payload?: any;
}

/**
 * Grant access to a report (authenticated)
 */
export async function grantAccess(
  reportId: string,
  grantToUserId: string,
  expiresIn?: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.post(apiConfig.endpoints.accessGrant, {
      reportId,
      grantToUserId,
      expiresIn,
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
    console.error('Error granting access:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to grant access';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Revoke access to a report (authenticated)
 */
export async function revokeAccess(
  reportId: string,
  revokeFromUserId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.post(apiConfig.endpoints.accessRevoke, {
      reportId,
      revokeFromUserId,
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
    console.error('Error revoking access:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to revoke access';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get reports shared with current user (authenticated)
 */
export async function getSharedWithMe(): Promise<{ success: boolean; reports?: SharedReport[]; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.get(apiConfig.endpoints.accessSharedWithMe);

    if (response.status === 200) {
      return {
        success: true,
        reports: response.data.data?.reports || response.data.data || [],
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    console.error('Error fetching shared reports:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch shared reports';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get list of viewers for a report (authenticated)
 */
export async function getReportViewers(
  reportId: string
): Promise<{ success: boolean; viewers?: AccessViewer[]; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.get(
      `${apiConfig.endpoints.accessReportViewers}/${reportId}/viewers`
    );

    if (response.status === 200) {
      return {
        success: true,
        viewers: response.data.data?.viewers || response.data.data || [],
      };
    }

    return {
      success: false,
      error: 'Unexpected response from backend',
    };
  } catch (error) {
    console.error('Error fetching report viewers:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch report viewers';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * View a report shared with current user (authenticated)
 */
export async function getSharedReport(
  reportId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const apiClient = getApiClient();
    const response = await apiClient.get(
      `${apiConfig.endpoints.accessViewSharedReport}/${reportId}`
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
    console.error('Error fetching shared report:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch shared report';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
