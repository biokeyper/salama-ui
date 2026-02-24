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
  // For wrapped responses from backend
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    userId?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Initiate signup process with phone
 * Sends OTP to phone number
 */
export async function initiateSignup(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const payload = { phone };
  console.log('Initiating signup with payload:', JSON.stringify(payload));
  console.log('API URL:', `${apiConfig.baseURL}${apiConfig.endpoints.signupInitiate}`);

  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.signupInitiate}`,
      payload
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to initiate signup',
    };
  } catch (error) {
    let message = 'Signup initiation failed';

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      console.log('Signup error - Status:', status);
      console.log('Signup error - Message:', errorData?.message);
      console.log('Signup error - Error:', errorData?.error);

      // Handle specific status codes
      if (status === 409) {
        message = errorData?.message || 'Phone number already registered. Please login instead.';
      } else if (status === 400) {
        message = errorData?.message || 'Invalid phone number format';
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (errorData?.error === true && errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    console.log('Signup initiation final error message:', message);
    return { success: false, error: message };
  }
}

/**
 * Verify signup with OTP
 * Saves JWT token and user info to SecureStore
 */
export async function verifySignup(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  const payload = { phone, otp };
  console.log('Verifying signup with payload:', JSON.stringify(payload));
  console.log('API URL:', `${apiConfig.baseURL}${apiConfig.endpoints.signupVerify}`);

  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.signupVerify}`,
      payload
    );

    console.log('Signup verification response status:', response.status);
    console.log('Signup verification response data:', JSON.stringify(response.data));

    if (response.status === 200 || response.status === 201) {
      const response_data: AuthResponse = response.data;

      // Extract token from nested data structure (backend wraps response in { data: { token } })
      let token = response_data.token;
      let userData = {
        phone: response_data.phone || phone,
        email: response_data.email || '',
      };

      // If token is nested in data object
      if (!token && response_data.data?.token) {
        token = response_data.data.token;
        userData = {
          phone: response_data.data.phone || phone,
          email: response_data.data.email || '',
        };
      }

      if (!token) {
        return {
          success: false,
          error: 'No token received from server',
        };
      }

      // Save token
      console.log('Saving token to SecureStore:', token.substring(0, 20) + '...');
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      console.log('Token saved, verifying...');

      // Verify token was saved
      const retrievedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      console.log('Verification - Token retrieved from SecureStore:', retrievedToken ? 'YES' : 'NO');

      // Save user info
      const user: User = {
        userId: '', // Backend doesn't return userId in signup response
        ...userData,
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      console.log('Signup successful, user data saved');
      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || 'Signup verification failed',
    };
  } catch (error) {
    let message = 'Signup verification failed';

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      console.log('Signup verify error - Status:', status);
      console.log('Signup verify error - Message:', errorData?.message);

      if (status === 401) {
        message = errorData?.message || 'Invalid OTP. Please try again.';
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    console.log('Signup verification final error:', message);
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
  const payload = { phone };
  console.log('Initiating login with payload:', JSON.stringify(payload));
  console.log('API URL:', `${apiConfig.baseURL}${apiConfig.endpoints.loginInitiate}`);

  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.loginInitiate}`,
      payload
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
    let message = 'Login initiation failed';

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      console.log('Login error - Status:', status);
      console.log('Login error - Message:', errorData?.message);
      console.log('Login error - Error:', errorData?.error);

      // Handle specific status codes
      if (status === 404) {
        message = errorData?.message || 'Phone number not found. Please sign up instead.';
      } else if (status === 400) {
        message = errorData?.message || 'Invalid phone number format';
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    console.log('Login initiation final error message:', message);
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
  const payload = { phone, otp };
  console.log('Verifying login with payload:', JSON.stringify(payload));
  console.log('API URL:', `${apiConfig.baseURL}${apiConfig.endpoints.loginVerify}`);

  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.loginVerify}`,
      payload
    );

    console.log('Login verification response status:', response.status);
    console.log('Login verification response data:', JSON.stringify(response.data));

    if (response.status === 200 || response.status === 201) {
      const response_data: AuthResponse = response.data;

      // Extract token from nested data structure (backend wraps response in { data: { token } })
      let token = response_data.token;
      let userData = {
        phone: response_data.phone || phone,
        email: response_data.email || '',
      };

      // If token is nested in data object
      if (!token && response_data.data?.token) {
        token = response_data.data.token;
        userData = {
          phone: response_data.data.phone || phone,
          email: response_data.data.email || '',
        };
      }

      if (!token) {
        return {
          success: false,
          error: 'No token received from server',
        };
      }

      // Save token
      console.log('Saving token to SecureStore:', token.substring(0, 20) + '...');
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      console.log('Token saved, verifying...');

      // Verify token was saved
      const retrievedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      console.log('Verification - Token retrieved from SecureStore:', retrievedToken ? 'YES' : 'NO');

      // Save user info
      const user: User = {
        userId: '', // Backend doesn't return userId in login response
        ...userData,
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      console.log('Login successful, user data saved');
      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || 'Login verification failed',
    };
  } catch (error) {
    let message = 'Login verification failed';

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      console.log('Login verify error - Status:', status);
      console.log('Login verify error - Message:', errorData?.message);

      if (status === 401) {
        message = errorData?.message || 'Invalid OTP. Please try again.';
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    console.log('Login verification final error:', message);
    return { success: false, error: message };
  }
}

/**
 * Get stored auth token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    console.log('getAuthToken retrieved:', token ? `token exists (${token.substring(0, 20)}...)` : 'NO TOKEN FOUND');
    return token;
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
 * Setup email recovery (authenticated)
 * Allows user to set an email for account recovery
 */
export async function setupEmailRecovery(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}/api/auth/setup-email`,
      { email },
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
      error: response.data?.error || 'Failed to setup email recovery',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Email recovery setup failed';
    return { success: false, error: message };
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
      const response_data: AuthResponse = response.data;

      // Extract token from nested data structure
      let token = response_data.token;
      let userData = {
        phone: response_data.phone || newPhone,
        email: response_data.email || '',
      };

      // If token is nested in data object
      if (!token && response_data.data?.token) {
        token = response_data.data.token;
        userData = {
          phone: response_data.data.phone || newPhone,
          email: response_data.data.email || '',
        };
      }

      if (!token) {
        return {
          success: false,
          error: 'No token received from server',
        };
      }

      // Save new token
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

      // Update user info with new phone
      const currentUser = await getUserInfo();
      const user: User = {
        userId: currentUser?.userId || '',
        ...userData,
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
      const response_data: AuthResponse = response.data;

      // Extract token from nested data structure
      let token = response_data.token;
      let userData = {
        phone: response_data.phone || newPhone,
        email: response_data.email || email,
      };

      // If token is nested in data object
      if (!token && response_data.data?.token) {
        token = response_data.data.token;
        userData = {
          phone: response_data.data.phone || newPhone,
          email: response_data.data.email || email,
        };
      }

      if (!token) {
        return {
          success: false,
          error: 'No token received from server',
        };
      }

      // Save token
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

      // Save user info
      const user: User = {
        userId: '',
        ...userData,
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
