/**
 * Authentication Service
 * Handles OTP-based auth with backend SafeGirlCore
 * Stores JWT token and user info in SecureStore
 */

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { apiConfig } from '@/config/api';

const AUTH_TOKEN_KEY = 'salama_auth_token';
const AUTH_USER_KEY = 'salama_auth_user';

export interface User {
  userId: string;
  phone: string;
  email: string;
}

export interface AuthResponse {
  token?: string;
  userId?: string;
  phone?: string;
  email?: string;
  _testOTP?: string; // Dev mode only
}

/**
 * Initiate signup process with phone and email
 * Sends OTP to phone number
 */
export async function initiateSignup(
  phone: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.signupInitiate}`,
      { phone, email }
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to initiate signup',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Signup initiation failed';
    return { success: false, error: message };
  }
}

/**
 * Verify signup with OTP
 * Saves JWT token and user info to SecureStore
 */
export async function verifySignup(
  phone: string,
  email: string,
  otp: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.signupVerify}`,
      { phone, email, otp }
    );

    if (response.status === 200 || response.status === 201) {
      const data: AuthResponse = response.data;

      if (!data.token) {
        return {
          success: false,
          error: 'No token received from server',
        };
      }

      // Save token
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);

      // Save user info
      const user: User = {
        userId: data.userId || '',
        phone: data.phone || phone,
        email: data.email || email,
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || 'Signup verification failed',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Signup verification failed';
    return { success: false, error: message };
  }
}

/**
 * Initiate login process with phone number
 * Sends OTP to phone
 */
export async function initiateLogin(
  phone: string
): Promise<{ success: boolean; error?: string; _testOTP?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.loginInitiate}`,
      { phone }
    );

    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        _testOTP: (response.data as AuthResponse)?._testOTP,
      };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to initiate login',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Login initiation failed';
    return { success: false, error: message };
  }
}

/**
 * Verify login with OTP
 * Saves JWT token and user info to SecureStore
 */
export async function verifyLogin(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.loginVerify}`,
      { phone, otp }
    );

    if (response.status === 200 || response.status === 201) {
      const data: AuthResponse = response.data;

      if (!data.token) {
        return {
          success: false,
          error: 'No token received from server',
        };
      }

      // Save token
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);

      // Save user info
      const user: User = {
        userId: data.userId || '',
        phone: data.phone || phone,
        email: data.email || '',
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || 'Login verification failed',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Login verification failed';
    return { success: false, error: message };
  }
}

/**
 * Get stored auth token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error reading auth token:', error);
    return null;
  }
}

/**
 * Get stored user info
 */
export async function getUserInfo(): Promise<User | null> {
  try {
    const userJson = await SecureStore.getItemAsync(AUTH_USER_KEY);
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error reading user info:', error);
    return null;
  }
}

/**
 * Check if user is authenticated (token exists)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

/**
 * Logout user (remove token and user info)
 */
export async function logout(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

/**
 * Initiate phone number change (authenticated)
 * Sends OTP to new phone number
 */
export async function initiateChangePhone(
  newPhone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.changePhoneInitiate}`,
      { newPhone },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to initiate phone change',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Phone change initiation failed';
    return { success: false, error: message };
  }
}

/**
 * Verify phone number change with OTP (authenticated)
 * Returns new token and updates user info
 */
export async function verifyChangePhone(
  newPhone: string,
  otp: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.changePhoneVerify}`,
      { newPhone, otp },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200 || response.status === 201) {
      const data: AuthResponse = response.data;

      if (!data.token) {
        return {
          success: false,
          error: 'No token received from server',
        };
      }

      // Save new token
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);

      // Update user info with new phone
      const currentUser = await getUserInfo();
      const user: User = {
        userId: currentUser?.userId || data.userId || '',
        phone: data.phone || newPhone,
        email: currentUser?.email || data.email || '',
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || 'Phone change verification failed',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Phone change verification failed';
    return { success: false, error: message };
  }
}

/**
 * Initiate forgot phone recovery (email-based)
 * Sends recovery link to email
 */
export async function initiateForgotPhone(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.forgotPhone}`,
      { email }
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to initiate recovery',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Recovery initiation failed';
    return { success: false, error: message };
  }
}

/**
 * Verify recovery email token
 */
export async function verifyRecoveryEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.verifyRecovery}`,
      { email, token }
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || 'Token verification failed',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Token verification failed';
    return { success: false, error: message };
  }
}

/**
 * Initiate phone change during recovery (email-based)
 * Sends OTP to new phone
 */
export async function initiatePhoneChangeRecovery(
  email: string,
  newPhone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.changePhoneRecovery}`,
      { email, newPhone }
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to initiate phone change',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Phone change initiation failed';
    return { success: false, error: message };
  }
}

/**
 * Verify phone change during recovery with OTP
 * Returns new token
 */
export async function verifyPhoneChangeRecovery(
  email: string,
  newPhone: string,
  otp: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.verifyPhoneChangeRecovery}`,
      { email, newPhone, otp }
    );

    if (response.status === 200 || response.status === 201) {
      const data: AuthResponse = response.data;

      if (!data.token) {
        return {
          success: false,
          error: 'No token received from server',
        };
      }

      // Save token
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);

      // Save user info
      const user: User = {
        userId: data.userId || '',
        phone: data.phone || newPhone,
        email: data.email || email,
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || 'Phone change verification failed',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Phone change verification failed';
    return { success: false, error: message };
  }
}

/**
 * Backup encryption key (authenticated)
 */
export async function backupEncryptionKey(
  pin: string,
  encryptionKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.keysBackup}`,
      { pin, encryptionKey },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to backup encryption key',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Key backup failed';
    return { success: false, error: message };
  }
}

/**
 * Recover encryption key (phone and pin based)
 */
export async function recoverEncryptionKey(
  phone: string,
  pin: string
): Promise<{ success: boolean; encryptionKey?: string; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.keysRecover}`,
      { phone, pin }
    );

    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        encryptionKey: response.data.data?.encryptionKey,
      };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to recover encryption key',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Key recovery failed';
    return { success: false, error: message };
  }
}
