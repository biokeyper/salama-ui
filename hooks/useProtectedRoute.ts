import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/services/authService';

export function useProtectedRoute() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isAuthenticated = async (): Promise<boolean> => {
    const token = await getAuthToken();
    return !!token && !!user;
  };

  const guardAction = async (action: () => void) => {
    const authenticated = await isAuthenticated();

    if (authenticated) {
      action();
    } else {
      setPendingAction(() => action);
      setShowLoginModal(true);
    }
  };

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
