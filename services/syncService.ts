/**
 * Sync Service
 * Handles syncing guest data to user account after login
 * - Claims guest reports (sets user_id on NULL reports)
 * - Syncs temporary PIN to backend if needed
 */

import { claimGuestReports, getAllReports } from '@/services/storage';
import { syncLocalPinToBackend } from '@/services/security';
import { extractErrorMessage } from '@/utils/errorExtractor';

export interface SyncResult {
  success: boolean;
  guestReportsClaimed: number;
  pinSynced: boolean;
  error?: string;
}

/**
 * Sync guest data after successful login
 * - Claims guest reports (associates them with userId)
 * - Syncs temporary PIN to backend if present
 */
export async function syncGuestDataAfterLogin(
  userId: string,
): Promise<SyncResult> {
  try {
    let guestReportsClaimed = 0;
    let pinSynced = false;

    // Step 1: Claim all guest reports (user_id IS NULL)
    try {
      guestReportsClaimed = await claimGuestReports(userId);
      console.log(`[Sync] Claimed ${guestReportsClaimed} guest report(s)`);
    } catch (error) {
      extractErrorMessage(error, 'Failed to claim guest reports');
    }

    // Step 2: Sync temporary PIN to backend if it exists
    try {
      await syncLocalPinToBackend(userId);
      pinSynced = true;
      console.log('[Sync] PIN synced successfully');
    } catch (error) {
      extractErrorMessage(error, 'Failed to sync PIN');
      // Don't fail entire sync if PIN sync fails
    }

    console.log('[Sync] Guest data sync completed', {
      guestReportsClaimed,
      pinSynced,
    });

    return {
      success: true,
      guestReportsClaimed,
      pinSynced,
    };
  } catch (error) {
    const errorMsg = extractErrorMessage(error, 'Guest data sync failed');
    return {
      success: false,
      guestReportsClaimed: 0,
      pinSynced: false,
      error: errorMsg,
    };
  }
}

/**
 * Check if there's guest data to sync
 * Returns count of pending guest reports
 */
export async function checkGuestDataPending(): Promise<number> {
  try {
    const guestReports = await getAllReports(undefined);
    return guestReports.length;
  } catch (error) {
    extractErrorMessage(error, 'Failed to check guest data');
    return 0;
  }
}
