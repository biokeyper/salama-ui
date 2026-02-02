/**
 * Report Actions Validator
 * Determines which actions are available for a report based on its status
 */

import { Report } from '@/types/report';

export interface ActionAvailability {
  canDelete: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canSubmit: boolean;
  canRetry: boolean;
  message?: string;
}

/**
 * Get available actions for a report based on its status
 * Implements action rules per the status model specification
 */
export function getAvailableActions(report: Report): ActionAvailability {
  const { status, blockchainStatus, isArchived } = report;

  // Archived reports are read-only
  if (isArchived) {
    return {
      canDelete: false,
      canEdit: false,
      canArchive: false,
      canSubmit: false,
      canRetry: false,
      message: 'Archived report (read-only)',
    };
  }

  // Draft/saved reports (not yet submitted)
  if (status === 'draft' || status === 'saved') {
    return {
      canDelete: true,
      canEdit: true,
      canArchive: false,
      canSubmit: true,
      canRetry: false,
    };
  }

  // Submitted reports
  if (status === 'submitted') {
    // Failed submission can be retried and deleted
    if (blockchainStatus === 'failed') {
      return {
        canDelete: true,
        canEdit: false,
        canArchive: false,
        canSubmit: false,
        canRetry: true,
        message: 'Submission failed',
      };
    }

    // Pending/confirmed reports can only be archived
    return {
      canDelete: false,
      canEdit: false,
      canArchive: true,
      canSubmit: false,
      canRetry: false,
      message: 'Submitted reports are immutable on blockchain',
    };
  }

  // Failed reports (not submitted)
  if (status === 'failed') {
    return {
      canDelete: true,
      canEdit: false,
      canArchive: false,
      canSubmit: true,
      canRetry: true,
      message: 'Submission failed',
    };
  }

  // Unknown status (default to read-only)
  return {
    canDelete: false,
    canEdit: false,
    canArchive: false,
    canSubmit: false,
    canRetry: false,
  };
}
