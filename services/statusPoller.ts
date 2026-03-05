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
    console.log(`Polling already active for report ${reportId}`);
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
        console.log(
          `Status polling timeout for report ${reportId} after ${elapsed}ms`
        );
        stopStatusPolling(reportId);
        return;
      }

      // Get current status
      const statusResult = await checkReportStatus(reportId);
      const confirmations = statusResult.confirmations || 0;

      // Check if confirmed (12+ confirmations)
      if (confirmations >= apiConfig.statusPolling.confirmationThreshold) {
        console.log(`Report ${reportId} confirmed with ${confirmations} confirmations`);

        const { saveReport } = await import('./storage');
        await saveReport({
          id: reportId,
          status: 'confirmed',
          confirmations: confirmations,
          txHash: statusResult.txHash,
          ipfsHash: statusResult.ipfsHash,
        });

        // Stop polling
        stopStatusPolling(reportId);
        return;
      }

      // Check if failed
      if (statusResult.status === 'failed') {
        console.log(`Report ${reportId} submission failed`);
        const { saveReport } = await import('./storage');
        await saveReport({
          id: reportId,
          status: 'failed',
        });
        stopStatusPolling(reportId);
        return;
      }

      // Update with latest status and confirmations (still pending)
      const { saveReport } = await import('./storage');
      await saveReport({
        id: reportId,
        status: 'pending',
        confirmations: confirmations,
        txHash: statusResult.txHash,
        ipfsHash: statusResult.ipfsHash,
      });

      console.log(
        `Report ${reportId} status: ${statusResult.status}, confirmations: ${confirmations}`
      );
    } catch (error) {
      console.error(`Error polling status for ${reportId}:`, error);
    }
  }, apiConfig.statusPolling.interval);

  session.intervalId = pollInterval;
  activeSessions.set(reportId, session);

  console.log(`Started status polling for report ${reportId}`);
}

/**
 * Stop polling status for a report
 */
export function stopStatusPolling(reportId: string): void {
  const session = activeSessions.get(reportId);
  if (session && session.intervalId) {
    clearInterval(session.intervalId);
    activeSessions.delete(reportId);
    console.log(`Stopped status polling for report ${reportId}`);
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
  console.log('Stopped all status polling sessions');
}

/**
 * Get active polling sessions (for debugging)
 */
export function getActivePollingSession(reportId: string): PollingSession | null {
  return activeSessions.get(reportId) || null;
}
