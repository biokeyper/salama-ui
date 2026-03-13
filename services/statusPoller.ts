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
 * Polls until confirmed (12+ confirmations) or max duration exceeded
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
  console.log('[STATUS-POLLER] 🚀 Starting status polling for report:', reportId);
  console.log('[STATUS-POLLER] 📡 Polling endpoint: GET /api/reportStatus?reportId=' + reportId);
  console.log('[STATUS-POLLER] ⏱️ Interval: every', apiConfig.statusPolling.interval + 'ms');
  console.log('[STATUS-POLLER] ⏳ Max duration:', apiConfig.statusPolling.maxDuration + 'ms (5 minutes)');
  console.log('[STATUS-POLLER] ✅ Confirmation threshold:', apiConfig.statusPolling.confirmationThreshold + ' confirmations');

  const pollInterval = setInterval(async () => {
    try {
      // Check if max duration exceeded
      const elapsed = Date.now() - session.startTime;
      if (elapsed > apiConfig.statusPolling.maxDuration) {
        console.log('[STATUS-POLLER] ⏰ Max polling duration reached for report:', reportId);
        stopStatusPolling(reportId);
        return;
      }

      // Get current status
      const statusResult = await checkReportStatus(reportId);
      const confirmations = statusResult.confirmations || 0;
      console.log('[STATUS-POLLER] 📊 Report', reportId, '- Status:', statusResult.status, '- Confirmations:', confirmations + '/' + apiConfig.statusPolling.confirmationThreshold);

      // Check if confirmed (12+ confirmations)
      if (confirmations >= apiConfig.statusPolling.confirmationThreshold) {
        console.log('[STATUS-POLLER] ✅ Report', reportId, 'reached', confirmations, 'confirmations - CONFIRMED');

        const { saveReport, getReportById } = await import('./storage');
        const existingReport = await getReportById(reportId);
        if (existingReport) {
          await saveReport({
            ...existingReport,
            status: 'confirmed',
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
        console.log('[STATUS-POLLER] ❌ Report', reportId, 'submission FAILED');
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
      console.log('[STATUS-POLLER] ⚠️ Error polling status for report:', reportId, '-', error instanceof Error ? error.message : 'Unknown error');
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
    console.log('[STATUS-POLLER] ⏹️ Stopped polling for report:', reportId);
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
