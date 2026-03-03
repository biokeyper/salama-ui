/**
 * Security Service - PIN Management
 * PIN backed by backend, cached locally for quick unlock
 * Backend is source of truth, local SecureStore is cache from auth response
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { apiConfig } from '@/config/api';
import { getAuthToken } from './authService';

const PIN_KEY = 'user_pin';

/**
 * Set a new PIN on backend
 * Requires backend endpoint /api/auth/set-pin
 * Stores PIN locally after successful backend save
 */
export async function setPin(pin: string): Promise<boolean> {
  try {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }

    const token = await getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

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
      // Store PIN locally after successful backend save
      console.log('PIN set on backend, caching locally');
      await SecureStore.setItemAsync(PIN_KEY, pin);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error setting PIN:', error);
    return false;
  }
}

/**
 * Verify PIN against locally cached PIN
 * PIN was cached from backend response during login/signup
 * No network call needed for quick unlock
 */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const storedPin = await SecureStore.getItemAsync(PIN_KEY);
    return storedPin === pin;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Check if PIN has been set
 * Returns true if PIN exists in local cache
 */
export async function hasPin(): Promise<boolean> {
  try {
    const pin = await SecureStore.getItemAsync(PIN_KEY);
    return pin !== null;
  } catch (error) {
    console.error('Error checking PIN:', error);
    return false;
  }
}

/**
 * Store PIN locally from backend response during login/signup
 * Called during auth flow when backend returns user PIN (if set)
 */
export async function storePinFromBackend(pin: string | null): Promise<void> {
  try {
    if (pin) {
      console.log('✅ PIN from backend:', pin);
      console.log('🔒 Storing PIN in SecureStore...');
      await SecureStore.setItemAsync(PIN_KEY, pin);
      console.log('✅ PIN stored successfully in SecureStore');
    } else {
      // User hasn't set a PIN yet, remove any existing PIN
      console.log('❌ No PIN from backend, clearing local PIN');
      await SecureStore.deleteItemAsync(PIN_KEY);
    }
  } catch (error) {
    console.error('❌ Error storing PIN from backend:', error);
  }
}
