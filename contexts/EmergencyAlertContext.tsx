/**
 * Emergency Alert Context
 * Manages gesture-based emergency alert functionality
 * Detects shake and triggers panic alert
 */

import React, { createContext, useContext, useState } from 'react';
import { Alert, LogBox } from 'react-native';
import { sendPanicAlert } from '@/services/panicService';
import { useAuth } from './AuthContext';
import { useShakeDetection } from '@/hooks/useShakeDetection';

// Suppress Expo dev menu warning
LogBox.ignoreLogs(['Possible Unhandled Promise Rejection']);

export interface EmergencyAlertContextType {
  emergencyAlertEnabled: boolean;
}

const EmergencyAlertContext = createContext<EmergencyAlertContextType | undefined>(undefined);

export function EmergencyAlertProvider({ children }: { children: React.ReactNode }) {
  const [emergencyAlertEnabled, setEmergencyAlertEnabled] = useState(true);
  const { user } = useAuth();

  const handleShakeDetected = async () => {
    if (!user || !emergencyAlertEnabled) return;

    // Show confirmation dialog
    Alert.alert(
      '🚨 Emergency Alert',
      'Send an emergency alert? This will notify authorities.',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Alert cancelled'),
          style: 'cancel',
        },
        {
          text: 'Send Alert',
          onPress: async () => {
            try {
              const result = await sendPanicAlert('emergency-location-shake');
              if (result.success) {
                Alert.alert(
                  '✓ Alert Sent',
                  'Your emergency alert has been sent successfully.'
                );
              } else {
                Alert.alert(
                  'Error',
                  result.error || 'Failed to send emergency alert'
                );
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while sending the alert');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // Use shake detection hook
  useShakeDetection(handleShakeDetected);

  return (
    <EmergencyAlertContext.Provider
      value={{
        emergencyAlertEnabled,
      }}
    >
      {children}
    </EmergencyAlertContext.Provider>
  );
}

export function useEmergencyAlert() {
  const context = useContext(EmergencyAlertContext);
  if (!context) {
    throw new Error('useEmergencyAlert must be used within EmergencyAlertProvider');
  }
  return context;
}
