/**
 * Auth Context
 * Manages authentication state and provides auth methods
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  getAuthToken,
  getUserInfo,
  initiateLogin,
  initiateSignup,
  isAuthenticated,
  logout,
  verifyLogin,
  verifySignup,
  verifyChangePhone,
  setupEmailRecovery as setupEmailRecoveryService,
  User,
} from '@/services/authService';

const EMAIL_RECOVERY_KEY = 'salama_email_recovery_setup';

export interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  isLoading: boolean;
  showEmailRecoveryModal: boolean;
  login: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  signup: (phone: string, otp: string, country?: string) => Promise<{ success: boolean; error?: string }>;
  initiateSignupFlow: (phone: string, country?: string) => Promise<{ success: boolean; error?: string }>;
  initiateLoginFlow: (phone: string) => Promise<{ success: boolean; error?: string; _testOTP?: string }>;
  changePhone: (newPhone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  setupEmailRecovery: (email: string) => Promise<void>;
  skipEmailRecovery: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailRecoveryModal, setShowEmailRecoveryModal] = useState(false);

  // Rehydrate auth state on mount
  useEffect(() => {
    rehydrateAuth();
  }, []);

  const rehydrateAuth = async () => {
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const userInfo = await getUserInfo();
        setUser(userInfo);
        setIsLoggedIn(true);
      } else {
      }
    } catch (error) {
      console.error('[AUTH-CONTEXT] Error rehydrating auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmailRecoverySetup = async () => {
    try {
      const isSetup = await SecureStore.getItemAsync(EMAIL_RECOVERY_KEY);
      return isSetup === 'true';
    } catch (error) {
      return false;
    }
  };

  const signup = async (
    phone: string,
    otp: string,
    country?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await verifySignup(phone, otp, country);
      if (result.success && result.user) {
        setUser(result.user);
        setIsLoggedIn(true);
        // Show email recovery modal on first signup only if user doesn't have email from backend
        if (!result.user.email) {
          setShowEmailRecoveryModal(true);
        }
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Signup failed';
      return { success: false, error: message };
    }
  };

  const login = async (
    phone: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await verifyLogin(phone, otp);
      if (result.success && result.user) {
        setUser(result.user);
        setIsLoggedIn(true);

        // Assign userId to local reports created while not logged in
        try {
          const { getAllReports, saveReport } = await import('@/services/storage');
          const localReports = await getAllReports(undefined); // Get all reports without userId filter
          const reportsNeedingUserId = localReports.filter(r => !r.userId);


          for (const report of reportsNeedingUserId) {
            await saveReport({
              ...report,
              userId: result.user.userId,
            });
          }

          if (reportsNeedingUserId.length > 0) {
          }
        } catch (migrateError) {
        }

        // Sync local PIN to backend (if user set PIN while not logged in)
        try {
          const { syncLocalPinToBackend } = await import('@/services/security');
          await syncLocalPinToBackend(result.user.userId);
        } catch (pinError) {
          // Don't fail login if PIN sync fails
        }

        // Show email recovery modal on first login only if user doesn't have email from backend
        if (!result.user.email) {
          setShowEmailRecoveryModal(true);
        }
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: message };
    }
  };

  const changePhoneNumber = async (
    newPhone: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await verifyChangePhone(newPhone, otp);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Phone change failed';
      return { success: false, error: message };
    }
  };

  const setupEmailRecovery = async (email: string) => {
    try {
      // Call backend endpoint to save email for recovery
      const result = await setupEmailRecoveryService(email);

      if (!result.success) {
        throw new Error(result.error || 'Failed to setup email recovery');
      }

      // Mark as set up in secure storage
      await SecureStore.setItemAsync(EMAIL_RECOVERY_KEY, 'true');
      setShowEmailRecoveryModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to setup email recovery';
      throw new Error(message);
    }
  };

  const skipEmailRecovery = async () => {
    try {
      // Mark as skipped in secure storage
      await SecureStore.setItemAsync(EMAIL_RECOVERY_KEY, 'skipped');
      setShowEmailRecoveryModal(false);
    } catch (error) {
      console.error('Error skipping email recovery:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        isLoading,
        showEmailRecoveryModal,
        login,
        signup,
        initiateSignupFlow: initiateSignup,
        initiateLoginFlow: initiateLogin,
        changePhone: changePhoneNumber,
        setupEmailRecovery,
        skipEmailRecovery,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
