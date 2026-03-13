/**
 * Security Service - PIN Management
 * PIN backed by backend, cached locally for quick unlock
 * Backend is source of truth, local SecureStore is cache from auth response
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { apiConfig } from '@/config/api';
import { getAuthToken } from './authService';
import { extractErrorMessage } from '@/utils/errorExtractor';

const PIN_KEY_TEMP = 'pin_local_temp'; // For users not logged in
const PIN_KEY_TEMPLATE = 'pin_'; // pin_user123 for logged-in users

/**
 * Set a new PIN
 * If logged in: sends to backend immediately
 * If NOT logged in: stores locally only (will sync on login)
 */
export async function setPin(pin: string, userId?: string): Promise<boolean> {
  try {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }

    const token = await getAuthToken();

    // If logged in: send to backend
    if (token && userId) {
      console.log('[PIN] User logged in, sending PIN to backend for userId:', userId);
      const response = await axios.post(
        `${apiConfig.baseURL}${apiConfig.endpoints.setPin}`,
        { pin },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        // Store PIN locally with user-specific key
        const userPinKey = `${PIN_KEY_TEMPLATE}${userId}`;
        await SecureStore.setItemAsync(userPinKey, pin);
        // Clear temp PIN if it exists
        await SecureStore.deleteItemAsync(PIN_KEY_TEMP);
        console.log('[PIN] ✅ PIN set and stored for user:', userId);
        return true;
      }
    } else {
      // Not logged in: store locally only (will sync when user logs in)
      console.log('[PIN] User NOT logged in, storing PIN locally for later sync');
      await SecureStore.setItemAsync(PIN_KEY_TEMP, pin);
      console.log('[PIN] ✅ PIN stored locally as temporary');
      return true;
    }

    return false;
  } catch (error) {
    extractErrorMessage(error, 'Failed to set PIN');
    return false;
  }
}

/**
 * Verify PIN against locally cached PIN
 * Checks user-specific PIN if userId provided, otherwise checks temp PIN
 * No network call needed for quick unlock
 */
export async function verifyPin(pin: string, userId?: string): Promise<boolean> {
  try {
    let storedPin: string | null;

    if (userId) {
      // Logged in: check user-specific PIN
      const userPinKey = `${PIN_KEY_TEMPLATE}${userId}`;
      storedPin = await SecureStore.getItemAsync(userPinKey);
      console.log('[PIN] Verifying PIN for user:', userId);
    } else {
      // Not logged in: check temp PIN
      storedPin = await SecureStore.getItemAsync(PIN_KEY_TEMP);
      console.log('[PIN] Verifying temp PIN (not logged in)');
    }

    return storedPin === pin;
  } catch (error) {
    extractErrorMessage(error, 'Failed to verify PIN');
    return false;
  }
}

/**
 * Check if PIN has been set
 * Checks user-specific PIN if userId provided, otherwise checks temp PIN
 */
export async function hasPin(userId?: string): Promise<boolean> {
  try {
    let pin: string | null;

    if (userId) {
      // Logged in: check user-specific PIN
      const userPinKey = `${PIN_KEY_TEMPLATE}${userId}`;
      pin = await SecureStore.getItemAsync(userPinKey);
      console.log('[PIN] Checking PIN for user:', userId);
    } else {
      // Not logged in: check temp PIN
      pin = await SecureStore.getItemAsync(PIN_KEY_TEMP);
      console.log('[PIN] Checking temp PIN (not logged in)');
    }

    return pin !== null;
  } catch (error) {
    extractErrorMessage(error, 'Failed to check PIN');
    return false;
  }
}

/**
 * Store PIN locally from backend response during login/signup
 * Called during auth flow when backend returns user PIN (if set)
 */
export async function storePinFromBackend(pin: string | null, userId: string): Promise<void> {
  try {
    const userPinKey = `${PIN_KEY_TEMPLATE}${userId}`;
    if (pin) {
      console.log('[PIN] Storing PIN from backend for user:', userId);
      await SecureStore.setItemAsync(userPinKey, pin);
    } else {
      // User hasn't set a PIN yet, remove any existing PIN
      console.log('[PIN] No PIN from backend for user:', userId);
      await SecureStore.deleteItemAsync(userPinKey);
    }
  } catch (error) {
    extractErrorMessage(error, 'Failed to store PIN from backend');
  }
}

/**
 * Sync locally-set PIN to backend on login
 * If user set PIN while not logged in, send it to backend after login
 * Called during auth flow after successful login
 */
export async function syncLocalPinToBackend(userId: string): Promise<void> {
  try {
    // Check if temp PIN exists (was set while not logged in)
    const tempPin = await SecureStore.getItemAsync(PIN_KEY_TEMP);

    if (tempPin) {
      console.log('[PIN] Found local temp PIN, syncing to backend for user:', userId);
      const success = await setPin(tempPin, userId);
      if (success) {
        console.log('[PIN] ✅ Successfully synced temp PIN to backend');
      } else {
        console.log('[PIN] ❌ Failed to sync temp PIN to backend');
      }
    } else {
      console.log('[PIN] No temp PIN to sync');
    }
  } catch (error) {
    console.log('[PIN] Error syncing local PIN to backend:', error instanceof Error ? error.message : 'Unknown error');
  }
}
