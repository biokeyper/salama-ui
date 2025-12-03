/**
 * Storage service for managing reports using AsyncStorage
 */

import { Report, ReportStorage } from '@/types/report';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@safegirls:reports';
const MAX_STORAGE_SIZE = 100; // Maximum number of reports to store locally

/**
 * Generate a unique ID for a report
 */
function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all reports from storage
 */
export async function getAllReports(): Promise<Report[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    const storage: ReportStorage = JSON.parse(data);
    return storage.reports || [];
  } catch (error) {
    console.error('Error getting reports from storage:', error);
    return [];
  }
}

/**
 * Get a single report by ID
 */
export async function getReportById(id: string): Promise<Report | null> {
  try {
    const reports = await getAllReports();
    return reports.find(report => report.id === id) || null;
  } catch (error) {
    console.error('Error getting report by ID:', error);
    return null;
  }
}

/**
 * Save a new report or update an existing one
 */
export async function saveReport(report: Partial<Report>): Promise<Report> {
  try {
    const reports = await getAllReports();

    // If report has an ID, update existing; otherwise create new
    let updatedReport: Report;
    let updatedReports: Report[];

    if (report.id) {
      const existingIndex = reports.findIndex(r => r.id === report.id);
      if (existingIndex >= 0) {
        // Update existing report
        updatedReport = {
          ...reports[existingIndex],
          ...report,
          updatedAt: new Date().toISOString(),
        };
        updatedReports = [...reports];
        updatedReports[existingIndex] = updatedReport;
      } else {
        // ID provided but not found - create new with that ID
        updatedReport = {
          id: report.id,
          type: report.type || 'text',
          status: report.status || 'saved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...report,
        } as Report;
        updatedReports = [...reports, updatedReport];
      }
    } else {
      // Create new report
      updatedReport = {
        id: generateReportId(),
        type: report.type || 'text',
        status: report.status || 'saved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...report,
      } as Report;
      updatedReports = [...reports, updatedReport];
    }

    // Enforce maximum storage size (remove oldest if exceeded)
    if (updatedReports.length > MAX_STORAGE_SIZE) {
      updatedReports.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      updatedReports = updatedReports.slice(-MAX_STORAGE_SIZE);
    }

    // Save to storage
    const storage: ReportStorage = {
      reports: updatedReports,
      lastSyncAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    return updatedReport;
  } catch (error) {
    console.error('Error saving report:', error);
    throw error;
  }
}

/**
 * Delete a report by ID
 */
export async function deleteReport(id: string): Promise<boolean> {
  try {
    const reports = await getAllReports();
    const filteredReports = reports.filter(report => report.id !== id);

    const storage: ReportStorage = {
      reports: filteredReports,
      lastSyncAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    return true;
  } catch (error) {
    console.error('Error deleting report:', error);
    return false;
  }
}

/**
 * Delete all reports
 */
export async function deleteAllReports(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting all reports:', error);
    return false;
  }
}

/**
 * Get reports by status
 */
export async function getReportsByStatus(status: Report['status']): Promise<Report[]> {
  try {
    const reports = await getAllReports();
    return reports.filter(report => report.status === status);
  } catch (error) {
    console.error('Error getting reports by status:', error);
    return [];
  }
}

/**
 * Get reports by type
 */
export async function getReportsByType(type: Report['type']): Promise<Report[]> {
  try {
    const reports = await getAllReports();
    return reports.filter(report => report.type === type);
  } catch (error) {
    console.error('Error getting reports by type:', error);
    return [];
  }
}

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

// ... existing code ...

/**
 * Get all health logs
 */
export async function getHealthLogs(): Promise<HealthLog[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const storage: ReportStorage = JSON.parse(data);
    return storage.healthLogs || [];
  } catch (error) {
    console.error('Error getting health logs:', error);
    return [];
  }
}

/**
 * Save a health log
 */
export async function saveHealthLog(log: Partial<HealthLog>): Promise<HealthLog> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    let storage: ReportStorage = data ? JSON.parse(data) : { reports: [], healthLogs: [] };

    const logs = storage.healthLogs || [];
    let updatedLog: HealthLog;
    let updatedLogs: HealthLog[];

    if (log.id) {
      const index = logs.findIndex(l => l.id === log.id);
      if (index >= 0) {
        updatedLog = { ...logs[index], ...log, updatedAt: new Date().toISOString() } as HealthLog;
        updatedLogs = [...logs];
        updatedLogs[index] = updatedLog;
      } else {
        updatedLog = {
          id: log.id,
          date: log.date || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...log
        } as HealthLog;
        updatedLogs = [...logs, updatedLog];
      }
    } else {
      updatedLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: log.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...log
      } as HealthLog;
      updatedLogs = [...logs, updatedLog];
    }

    storage.healthLogs = updatedLogs;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    return updatedLog;
  } catch (error) {
    console.error('Error saving health log:', error);
    throw error;
  }
}

/**
 * Delete a health log
 */
export async function deleteHealthLog(id: string): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return false;

    const storage: ReportStorage = JSON.parse(data);
    if (!storage.healthLogs) return false;

    storage.healthLogs = storage.healthLogs.filter(l => l.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    return true;
  } catch (error) {
    console.error('Error deleting health log:', error);
    return false;
  }
}
