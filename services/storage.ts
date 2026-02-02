/**
 * Storage service for managing reports using SQLite
 * This is a wrapper around database.ts to maintain API compatibility
 */

import { Report } from '@/types/report';
import {
  dbDeleteAllHealthLogs,
  dbDeleteAllReports,
  dbDeleteHealthLog,
  dbDeleteReport,
  dbGetAllReports,
  dbGetHealthLogs,
  dbGetReportById,
  dbGetReportsByStatus,
  dbGetReportsByType,
  dbSaveHealthLog,
  dbSaveReport,
} from './database';

// Export all database functions with the same API
export const getAllReports = dbGetAllReports;
export const getReportById = dbGetReportById;
export const saveReport = dbSaveReport;
export const deleteReport = dbDeleteReport;
export const deleteAllReports = dbDeleteAllReports;
export const getReportsByStatus = dbGetReportsByStatus;
export const getReportsByType = dbGetReportsByType;
export const getHealthLogs = dbGetHealthLogs;
export const saveHealthLog = dbSaveHealthLog;
export const deleteHealthLog = dbDeleteHealthLog;
export const deleteAllHealthLogs = dbDeleteAllHealthLogs;

/**
 * Update report status
 */
export async function updateReportStatus(
  id: string,
  status: Report['status'],
  submissionId?: string,
  error?: string
): Promise<Report | null> {
  try {
    const report = await getReportById(id);
    if (!report) {
      return null;
    }

    return await saveReport({
      ...report,
      status,
      submittedAt: status === 'submitted' ? new Date().toISOString() : report.submittedAt,
      submissionId: submissionId || report.submissionId,
      submissionError: error || report.submissionError,
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    return null;
  }
}

/**
 * Archive a report (soft delete - keeps blockchain record but hides from UI)
 */
export async function archiveReport(
  id: string,
  reason?: string
): Promise<Report | null> {
  try {
    const report = await getReportById(id);
    if (!report) {
      return null;
    }

    return await saveReport({
      ...report,
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archivedReason: reason || 'User archived',
    });
  } catch (error) {
    console.error('Error archiving report:', error);
    return null;
  }
}
