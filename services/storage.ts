/**
 * Storage service for managing reports using SQLite
 * This is a wrapper around database.ts to maintain API compatibility
 */

import { Report } from '@/types/report';
import {
  dbClaimGuestReports,
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

// Export wrapper functions to properly handle database calls
export async function saveReport(report: Report): Promise<Report> {
  await dbSaveReport(report);
  return report;
}

export const getAllReports = (userId?: string) => dbGetAllReports(userId);
export const getReportById = dbGetReportById;
export const deleteReport = dbDeleteReport;
export const deleteAllReports = dbDeleteAllReports;
export const getReportsByStatus = (userId: string, status: string) => dbGetReportsByStatus(userId, status);
export const getReportsByType = (userId: string, type: string) => dbGetReportsByType(userId, type);
export const getHealthLogs = dbGetHealthLogs;
export const saveHealthLog = dbSaveHealthLog;
export const deleteHealthLog = dbDeleteHealthLog;
export const deleteAllHealthLogs = dbDeleteAllHealthLogs;
export const claimGuestReports = (userId: string) => dbClaimGuestReports(userId);

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
    return null;
  }
}

/**
 * Clear entire local database (all reports and health logs)
 * ⚠️ DESTRUCTIVE - Cannot be undone
 */
export async function clearAllLocalData(): Promise<boolean> {
  try {
    await dbDeleteAllReports();
    await dbDeleteAllHealthLogs();
    return true;
  } catch (error) {
    return false;
  }
}
