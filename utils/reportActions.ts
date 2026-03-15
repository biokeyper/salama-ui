/**
 * Report Actions Validator
 * Determines which actions are available for a report based on its status
 */

import { Report } from "@/types/report";

export interface ActionAvailability {
  canDelete: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canSubmit: boolean;
  canRetry: boolean;
  message?: string;
}

export function getAvailableActions(report: Report): ActionAvailability {
  const { status, isArchived } = report;

  // Archived reports are read-only
  if (isArchived) {
    return {
      canDelete: false,
      canEdit: false,
      canArchive: false,
      canSubmit: false,
      canRetry: false,
      message: "Archived report (read-only)",
    };
  }

  // Draft/saved reports (not yet submitted)
  if (status === "draft" || status === "saved") {
    return {
      canDelete: true,
      canEdit: true,
      canArchive: false,
      canSubmit: true,
      canRetry: false,
    };
  }

  // Submitted - waiting for blockchain to process
  if (status === "submitted") {
    return {
      canDelete: false,
      canEdit: false,
      canArchive: true,
      canSubmit: false,
      canRetry: false,
      message: "Submitted",
    };
  }

  // Pending - blockchain is confirming
  if (status === "pending") {
    return {
      canDelete: false,
      canEdit: false,
      canArchive: true,
      canSubmit: false,
      canRetry: false,
      message: "Pending",
    };
  }

  // Failed - submission failed
  if (status === "failed") {
    return {
      canDelete: true,
      canEdit: false,
      canArchive: false,
      canSubmit: true,
      canRetry: true,
      message: "Submission failed - can retry",
    };
  }

  return {
    canDelete: false,
    canEdit: false,
    canArchive: false,
    canSubmit: false,
    canRetry: false,
  };
}
