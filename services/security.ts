/**
 * Security Service - PIN Management
 * PIN is managed by backend - returned as part of user info on login
 * User can set PIN (sends to backend) or verify against user.pin
 */

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { apiConfig } from '@/config/api';
import { getAuthToken } from './authService';
import { extractErrorMessage } from '@/utils/errorExtractor';

const AUTH_USER_KEY = 'salama_auth_user';
const LOCAL_TEMP_PIN_KEY = 'pin_local_temp';

function getUserPinKey(userId: string): string {
  return `pin_${userId}`;
}

function isValidPin(value?: string | null): value is string {
  return typeof value === 'string' && /^\d{4,6}$/.test(value);
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const userJson = await SecureStore.getItemAsync(AUTH_USER_KEY);
    if (!userJson) return null;

    const user = JSON.parse(userJson) as { userId?: string };
    return user.userId || null;
  } catch {
    return null;
  }
}

async function updateStoredUserPin(pin: string | null, userId?: string): Promise<void> {
  try {
    const userJson = await SecureStore.getItemAsync(AUTH_USER_KEY);
    if (!userJson) return;

    const user = JSON.parse(userJson) as Record<string, unknown> & { userId?: string };
    if (userId && user.userId && user.userId !== userId) {
      return;
    }

    user.pin = pin;
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // Best-effort user cache update only.
  }
}

async function storePinForUser(pin: string, userId?: string): Promise<void> {
  const resolvedUserId = userId || (await getCurrentUserId());

  if (resolvedUserId) {
    await SecureStore.setItemAsync(getUserPinKey(resolvedUserId), pin);
    await SecureStore.deleteItemAsync(LOCAL_TEMP_PIN_KEY);
    await updateStoredUserPin(pin, resolvedUserId);
    return;
  }

  // Keep temporary PIN for users who created one before login.
  await SecureStore.setItemAsync(LOCAL_TEMP_PIN_KEY, pin);
}

async function clearStoredPin(userId?: string): Promise<void> {
  const resolvedUserId = userId || (await getCurrentUserId());

  if (resolvedUserId) {
    await SecureStore.deleteItemAsync(getUserPinKey(resolvedUserId));
    await updateStoredUserPin(null, resolvedUserId);
  }

  await SecureStore.deleteItemAsync(LOCAL_TEMP_PIN_KEY);
}

async function getStoredPin(userId?: string): Promise<string | null> {
  const resolvedUserId = userId || (await getCurrentUserId());

  if (resolvedUserId) {
    const userPin = await SecureStore.getItemAsync(getUserPinKey(resolvedUserId));
    if (isValidPin(userPin)) {
      return userPin;
    }
  }

  const tempPin = await SecureStore.getItemAsync(LOCAL_TEMP_PIN_KEY);
  return isValidPin(tempPin) ? tempPin : null;
}

/**
 * Save PIN received from backend to local secure store.
 */
export async function storePinFromBackend(pin?: string | null, userId?: string): Promise<void> {
  try {
    if (!isValidPin(pin)) {
      await clearStoredPin(userId);
      return;
    }

    await storePinForUser(pin, userId);
  } catch (error) {
    extractErrorMessage(error, 'Failed to store PIN from backend');
  }
}

/**
 * Sync temporary PIN (created before login) to backend after login.
 */
export async function syncLocalPinToBackend(userId: string): Promise<void> {
  try {
    const tempPin = await SecureStore.getItemAsync(LOCAL_TEMP_PIN_KEY);
    if (!isValidPin(tempPin)) {
      return;
    }

    const synced = await setPin(tempPin, userId);
    if (synced) {
      await SecureStore.deleteItemAsync(LOCAL_TEMP_PIN_KEY);
    }
  } catch (error) {
    extractErrorMessage(error, 'Failed to sync local PIN to backend');
  }
}

/**
 * Set a new PIN - sends to backend
 * User sets PIN only when user.pin is null (first time)
 */
export async function setPin(pin: string, userId?: string): Promise<boolean> {
  try {
    if (!isValidPin(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }

    const token = await getAuthToken();
    if (!token) {
      await storePinForUser(pin, userId);
      console.log('[PIN] ℹ️ PIN saved locally (not authenticated)');
      return true;
    }

    console.log('[PIN] Setting PIN on backend for user:', userId);
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
      console.log('[PIN] ✅ PIN set on backend for user:', userId);
      await storePinForUser(pin, userId);
      return true;
    }

    return false;
  } catch (error) {
    extractErrorMessage(error, 'Failed to set PIN');
    return false;
  }
}

/**
 * Verify PIN against user.pin from user info
 * Compares entered PIN with the PIN from backend user object
 */
export async function verifyPin(enteredPin: string, userPin: string | null): Promise<boolean> {
  try {
    const pinToVerify = isValidPin(userPin) ? userPin : await getStoredPin();
    if (!pinToVerify) {
      console.log('[PIN] No PIN set for user');
      return false;
    }

    console.log('[PIN] Verifying entered PIN');
    return enteredPin === pinToVerify;
  } catch (error) {
    extractErrorMessage(error, 'Failed to verify PIN');
    return false;
  }
}

/**
 * Check if user has a PIN set.
 * Supports backend PIN value, userId, or implicit current user lookup.
 */
export async function hasPin(userPinOrUserId?: string | null): Promise<boolean> {
  try {
    let hasPinSet = false;

    if (isValidPin(userPinOrUserId)) {
      hasPinSet = true;
    } else if (typeof userPinOrUserId === 'string' && userPinOrUserId.length > 0) {
      const storedPin = await getStoredPin(userPinOrUserId);
      hasPinSet = isValidPin(storedPin);
    } else {
      const storedPin = await getStoredPin();
      hasPinSet = isValidPin(storedPin);
    }

    console.log('[PIN] User has PIN:', hasPinSet);
    return hasPinSet;
  } catch (error) {
    extractErrorMessage(error, 'Failed to check PIN');
    return false;
  }
}
