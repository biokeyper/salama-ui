/**
 * Authentication Service
 * Handles OTP-based auth with backend SafeGirlCore
 * Stores JWT token and user info in SecureStore
 */

import { apiConfig } from "@/config/api";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "salama_auth_token";
const AUTH_USER_KEY = "salama_auth_user";

export interface User {
  userId: string;
  phone: string;
  email: string;
  pin?: string | null;
}

export interface AuthResponse {
  token?: string;
  userId?: string;
  phone?: string;
  email?: string;
  pin?: string | null;
  _testOTP?: string; // Dev mode only
  // For wrapped responses from backend
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    userId?: string;
    phone?: string;
    email?: string;
    pin?: string | null;
  };
}

/**
 * Initiate signup process with phone
 * Sends OTP to phone number
 */
export async function initiateSignup(
  phone: string,
): Promise<{ success: boolean; error?: string }> {
  const payload = { phone };

  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.signupInitiate}`,
      payload,
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to initiate signup",
    };
  } catch (error) {
    let message = "Signup initiation failed";

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      // Handle specific status codes
      if (status === 409) {
        message =
          errorData?.message ||
          "Phone number already registered. Please login instead.";
      } else if (status === 400) {
        message = errorData?.message || "Invalid phone number format";
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

    return { success: false, error: message };
  }
}

/**
 * Verify signup with OTP
 * Saves JWT token and user info to SecureStore
 */
export async function verifySignup(
  phone: string,
  otp: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
  const payload = { phone, otp };

  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.signupVerify}`,
      payload,
    );

    if (response.status === 200 || response.status === 201) {
      const response_data: AuthResponse = response.data;

      // Extract token from nested data structure (backend wraps response in { data: { token } })
      let token = response_data.token;
      let pin = response_data.pin;
      let userId = response_data.userId;
      let userData = {
        userId: userId || "",
        phone: response_data.phone || phone,
        email: response_data.email || "",
        pin: pin ?? null,
      };

      // If token is nested in data object
      if (!token && response_data.data?.token) {
        token = response_data.data.token;
        pin = response_data.data.pin;
        userId = response_data.data.userId;
        userData = {
          userId: userId || "",
          phone: response_data.data.phone || phone,
          email: response_data.data.email || "",
          pin: pin ?? null,
        };
      }

      if (!token) {
        return {
          success: false,
          error: "No token received from server",
        };
      }

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      const { storePinFromBackend } = await import("./security");
      await storePinFromBackend(pin, userId);

      // Save user info
      const user: User = userData as User;
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || "Signup verification failed",
    };
  } catch (error) {
    let message = "Signup verification failed";

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (status === 401) {
        message = errorData?.message || "Invalid OTP. Please try again.";
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return { success: false, error: message };
  }
}

/**
 * Initiate login process with phone number
 * Sends OTP to phone
 */
export async function initiateLogin(
  phone: string,
): Promise<{ success: boolean; error?: string; _testOTP?: string }> {
  const payload = { phone };

  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.loginInitiate}`,
      payload,
    );

    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        _testOTP: (response.data as AuthResponse)?._testOTP,
      };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to initiate login",
    };
  } catch (error) {
    let message = "Login initiation failed";

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      // Handle specific status codes
      if (status === 404) {
        message =
          errorData?.message ||
          "Phone number not found. Please sign up instead.";
      } else if (status === 400) {
        message = errorData?.message || "Invalid phone number format";
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return { success: false, error: message };
  }
}

/**
 * Verify login with OTP
 * Saves JWT token and user info to SecureStore
 */
export async function verifyLogin(
  phone: string,
  otp: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
  const payload = { phone, otp };

  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.loginVerify}`,
      payload,
    );

    if (response.status === 200 || response.status === 201) {
      const response_data: AuthResponse = response.data;

      // Extract token from nested data structure (backend wraps response in { data: { token } })
      let token = response_data.token;
      let pin = response_data.pin;
      let userId = response_data.userId;
      let userData = {
        userId: userId || "",
        phone: response_data.phone || phone,
        email: response_data.email || "",
        pin: pin ?? null,
      };

      // If token is nested in data object
      if (!token && response_data.data?.token) {
        token = response_data.data.token;
        pin = response_data.data.pin;
        userId = response_data.data.userId;
        userData = {
          userId: userId || "",
          phone: response_data.data.phone || phone,
          email: response_data.data.email || "",
          pin: pin ?? null,
        };
      }

      if (!token) {
        return {
          success: false,
          error: "No token received from server",
        };
      }

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      const { storePinFromBackend } = await import("./security");
      await storePinFromBackend(pin, userId);

      // Save user info
      const user: User = userData as User;
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || "Login verification failed",
    };
  } catch (error) {
    let message = "Login verification failed";

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (status === 401) {
        message = errorData?.message || "Invalid OTP. Please try again.";
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return { success: false, error: message };
  }
}

/**
 * Get stored auth token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    return token;
  } catch (error) {
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
/**
 * Logout user
 * Calls backend to confirm logout, then clears local auth data and PIN
 */
export async function logout(): Promise<void> {
  try {
    const token = await getAuthToken();

    // Get user info before clearing it (needed to delete user's PIN)
    const userInfo = await getUserInfo();

    // Call backend logout endpoint if token exists
    if (token) {
      try {
        await axios.post(
          `${apiConfig.baseURL}${apiConfig.endpoints.logout}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } catch (error) {
        // Even if backend call fails, continue with local logout
      }
    }

    // Clear local auth data
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);

    // Clear PIN for the logged-in user
    if (userInfo?.userId) {
      const userPinKey = `pin_${userInfo.userId}`;
      try {
        await SecureStore.deleteItemAsync(userPinKey);
      } catch (error) {
        // PIN might not exist, that's okay
      }
    }

    // Also clear temp PIN if it exists
    try {
      await SecureStore.deleteItemAsync("pin_local_temp");
    } catch (error) {
      // Temp PIN might not exist, that's okay
    }
  } catch (error) {}
}

/**
 * Setup email recovery (authenticated)
 * Allows user to set an email for account recovery
 */
export async function setupEmailRecovery(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const payload = { email };

  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}/api/auth/setup-email`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to setup email recovery",
    };
  } catch (error) {
    let message = "Email recovery setup failed";

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (status === 500) {
        message = errorData?.message || "Server error. Please try again later.";
      } else if (status === 400) {
        message = errorData?.message || "Invalid email format";
      } else if (status === 409) {
        message = errorData?.message || "Email already registered";
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return { success: false, error: message };
  }
}

/**
 * Initiate phone number change (authenticated)
 * Sends OTP to new phone number
 */
export async function initiateChangePhone(
  newPhone: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.changePhoneInitiate}`,
      { newPhone },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to initiate phone change",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Phone change initiation failed";
    return { success: false, error: message };
  }
}

/**
 * Verify phone number change with OTP (authenticated)
 * Returns new token and updates user info
 */
export async function verifyChangePhone(
  newPhone: string,
  otp: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.changePhoneVerify}`,
      { newPhone, otp },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 200 || response.status === 201) {
      const response_data: AuthResponse = response.data;

      // Extract token from nested data structure
      let token = response_data.token;
      let pin = response_data.pin;
      let userData = {
        phone: response_data.phone || newPhone,
        email: response_data.email || "",
        pin: pin ?? null,
      };

      // If token is nested in data object
      if (!token && response_data.data?.token) {
        token = response_data.data.token;
        pin = response_data.data.pin;
        userData = {
          phone: response_data.data.phone || newPhone,
          email: response_data.data.email || "",
          pin: pin ?? null,
        };
      }

      if (!token) {
        return {
          success: false,
          error: "No token received from server",
        };
      }

      // Save new token
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

      // Store PIN from backend response if provided
      const { storePinFromBackend } = await import("./security");
      const currentUser = await getUserInfo();
      await storePinFromBackend(pin, currentUser?.userId);

      // Update user info with new phone
      const user: User = {
        userId: currentUser?.userId || "",
        ...userData,
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || "Phone change verification failed",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Phone change verification failed";
    return { success: false, error: message };
  }
}

/**
 * Initiate forgot phone recovery (email-based)
 * Sends recovery link to email
 */
export async function initiateForgotPhone(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.forgotPhone}`,
      { email },
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to initiate recovery",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Recovery initiation failed";
    return { success: false, error: message };
  }
}

/**
 * Verify recovery email token
 */
export async function verifyRecoveryEmail(
  email: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.verifyRecovery}`,
      { email, token },
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || "Token verification failed",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token verification failed";
    return { success: false, error: message };
  }
}

/**
 * Initiate phone change during recovery (email-based)
 * Sends OTP to new phone
 */
export async function initiatePhoneChangeRecovery(
  email: string,
  newPhone: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.changePhoneRecovery}`,
      { email, newPhone },
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to initiate phone change",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Phone change initiation failed";
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
  otp: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.verifyPhoneChangeRecovery}`,
      { email, newPhone, otp },
    );

    if (response.status === 200 || response.status === 201) {
      const response_data: AuthResponse = response.data;

      // Extract token from nested data structure
      let token = response_data.token;
      let pin = response_data.pin;
      let userData = {
        phone: response_data.phone || newPhone,
        email: response_data.email || email,
        pin: pin ?? null,
      };

      // If token is nested in data object
      if (!token && response_data.data?.token) {
        token = response_data.data.token;
        pin = response_data.data.pin;
        userData = {
          phone: response_data.data.phone || newPhone,
          email: response_data.data.email || email,
          pin: pin ?? null,
        };
      }

      if (!token) {
        return {
          success: false,
          error: "No token received from server",
        };
      }

      // Save token
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);

      // Store PIN from backend response if provided
      const { storePinFromBackend } = await import("./security");
      await storePinFromBackend(pin);

      // Save user info
      const user: User = {
        userId: "",
        ...userData,
      };
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      error: response.data?.error || "Phone change verification failed",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Phone change verification failed";
    return { success: false, error: message };
  }
}

/**
 * Backup encryption key (authenticated)
 */
export async function backupEncryptionKey(
  pin: string,
  encryptionKey: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.keysBackup}`,
      { pin, encryptionKey },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 200 || response.status === 201) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to backup encryption key",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Key backup failed";
    return { success: false, error: message };
  }
}

/**
 * Recover encryption key (phone and pin based)
 */
export async function recoverEncryptionKey(
  phone: string,
  pin: string,
): Promise<{ success: boolean; encryptionKey?: string; error?: string }> {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.keysRecover}`,
      { phone, pin },
    );

    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        encryptionKey: response.data.data?.encryptionKey,
      };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to recover encryption key",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Key recovery failed";
    return { success: false, error: message };
  }
}

/**
 * Delete user account (authenticated)
 * Permanently removes all user data from backend
 * Note: Submitted reports remain on blockchain
 */
export async function deleteUserAccount(): Promise<{
  success: boolean;
  error?: string;
  data?: any;
}> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await axios.post(
      `${apiConfig.baseURL}${apiConfig.endpoints.deleteAccount}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 200 || response.status === 201) {
      // Clear all local auth data after successful deletion
      await logout();
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.data?.error || "Failed to delete account",
    };
  } catch (error) {
    let message = "Account deletion failed";

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (status === 401) {
        message =
          errorData?.message || "Authentication failed. Please login again.";
      } else if (errorData?.message) {
        message = errorData.message;
      } else if (error.message) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return { success: false, error: message };
  }
}
