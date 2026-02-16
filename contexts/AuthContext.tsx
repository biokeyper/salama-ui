/**
 * Auth Context
 * Manages authentication state and provides auth methods
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  User,
} from '@/services/authService';

export interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  isLoading: boolean;
  login: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  signup: (phone: string, email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  initiateSignupFlow: (phone: string, email: string) => Promise<{ success: boolean; error?: string }>;
  initiateLoginFlow: (phone: string) => Promise<{ success: boolean; error?: string; _testOTP?: string }>;
  changePhone: (newPhone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Error rehydrating auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    phone: string,
    email: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await verifySignup(phone, email, otp);
      if (result.success && result.user) {
        setUser(result.user);
        setIsLoggedIn(true);
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
        login,
        signup,
        initiateSignupFlow: initiateSignup,
        initiateLoginFlow: initiateLogin,
        changePhone: changePhoneNumber,
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
