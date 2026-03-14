/**
 * Status Poller
 * Polls blockchain confirmation status for submitted reports
 */

import { checkReportStatus } from './api';
import { updateReportStatus, getReportById } from './storage';
import { apiConfig } from '@/config/api';

interface PollingSession {
  reportId: string;
  startTime: number;
  intervalId: NodeJS.Timeout | number | null;
}

const activeSessions = new Map<string, PollingSession>();

/**
 * Start polling status for a report
 * Polls until submitted (12+ confirmations) or max duration exceeded
 */
export function startStatusPolling(reportId: string): void {
  // Don't start duplicate polling
  if (activeSessions.has(reportId)) {
    return;
  }

  const session: PollingSession = {
    reportId,
    startTime: Date.now(),
    intervalId: null,
  };

  // Start polling

  const pollInterval = setInterval(async () => {
    try {
      // Check if max duration exceeded
      const elapsed = Date.now() - session.startTime;
      if (elapsed > apiConfig.statusPolling.maxDuration) {
        stopStatusPolling(reportId);
        return;
      }

      // Get current status
      const statusResult = await checkReportStatus(reportId);
      const confirmations = statusResult.confirmations || 0;

      // Check if submitted (12+ confirmations)
      if (confirmations >= apiConfig.statusPolling.confirmationThreshold) {

        const { saveReport, getReportById } = await import('./storage');
        const existingReport = await getReportById(reportId);
        if (existingReport) {
          await saveReport({
            ...existingReport,
            status: 'submitted',
            confirmations: confirmations,
            txHash: statusResult.txHash,
            ipfsHash: statusResult.ipfsHash,
          });
        }

        // Stop polling
        stopStatusPolling(reportId);
        return;
      }

      // Check if failed
      if (statusResult.status === 'failed') {
        const { saveReport, getReportById } = await import('./storage');
        const existingReport = await getReportById(reportId);
        if (existingReport) {
          await saveReport({
            ...existingReport,
            status: 'failed',
          });
        }
        stopStatusPolling(reportId);
        return;
      }

      // Update with latest status and confirmations (still pending)
      const { saveReport, getReportById } = await import('./storage');
      const existingReport = await getReportById(reportId);
      if (existingReport) {
        await saveReport({
          ...existingReport,
          status: 'pending',
          confirmations: confirmations,
          txHash: statusResult.txHash,
          ipfsHash: statusResult.ipfsHash,
        });
      }
    } catch (error) {
    }
  }, apiConfig.statusPolling.interval);

  session.intervalId = pollInterval;
  activeSessions.set(reportId, session);

}

/**
 * Stop polling status for a report
 */
export function stopStatusPolling(reportId: string): void {
  const session = activeSessions.get(reportId);
  if (session && session.intervalId) {
    clearInterval(session.intervalId);
    activeSessions.delete(reportId);
  }
}

/**
 * Stop all active polling sessions
 */
export function stopAllStatusPolling(): void {
  activeSessions.forEach((session) => {
    if (session.intervalId) {
      clearInterval(session.intervalId);
    }
  });
  activeSessions.clear();
}

/**
 * Get active polling sessions (for debugging)
 */
export function getActivePollingSession(reportId: string): PollingSession | null {
  return activeSessions.get(reportId) || null;
}