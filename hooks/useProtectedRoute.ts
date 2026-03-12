import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/services/authService';

/**
 * Hook to guard protected routes
 * Returns whether user is authenticated and function to check before navigation
 */
export function useProtectedRoute() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  /**
   * Check if user is authenticated
   * @returns true if user has valid auth token
   */
  const isAuthenticated = async (): Promise<boolean> => {
    const token = await getAuthToken();
    return !!token && !!user;
  };

  /**
   * Guard a protected action
   * If not authenticated, shows login modal
   * If authenticated, executes the action immediately
   * After login, the action is executed
   */
  const guardAction = async (action: () => void) => {
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // User is logged in, execute action immediately
      action();
    } else {
      // Not logged in, show login modal and save action for after login
      setPendingAction(() => action);
      setShowLoginModal(true);
    }
  };

  /**
   * Call this when user successfully logs in
   * Executes the pending action that was waiting
   */
  const executeAfterLogin = () => {
    setShowLoginModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setPendingAction(null);
  };

  return {
    isAuthenticated,
    guardAction,
    executeAfterLogin,
    closeLoginModal,
    showLoginModal,
    setShowLoginModal,
  };
}
