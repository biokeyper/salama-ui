import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { sendPanicAlert } from '@/services/panicService';
import { getEmergencyContacts } from '@/services/emergencyContactService';
import { getAuthToken } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateModal from './AuthGateModal';

interface EmergencyAlertModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EmergencyAlertModal({ visible, onClose }: EmergencyAlertModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [tapCount, setTapCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = async () => {
    // Clear previous timeout if it exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    if (newTapCount === 1) {
      // First tap - show confirmation message
      // Auto-reset after 3 seconds if not confirmed
      timeoutRef.current = setTimeout(() => {
        setTapCount(0);
      }, 3000);
    } else if (newTapCount === 2) {
      // Second tap - send panic alert
      setTapCount(0);
      setIsSending(true);

      try {
        // Check if user is authenticated
        const token = await getAuthToken();
        if (!token || !user) {
          // Not authenticated - show AuthGateModal instead of alert
          setIsSending(false);
          setShowAuthGate(true);
          return;
        }

        // Check if emergency contacts exist
        const contactsResult = await getEmergencyContacts();
        const hasContacts = contactsResult.success && (contactsResult.data?.length ?? 0) > 0;

        // Show warning if no contacts
        if (!hasContacts) {
          Alert.alert(
            'No Emergency Contacts',
            'You haven\'t added emergency contacts. Your panic alert will be recorded but no SMS will be sent to contacts.',
            [
              {
                text: 'Go to Settings',
                onPress: () => {
                  setIsSending(false);
                  onClose();
                  router.push('/settings');
                },
              },
              {
                text: 'Continue',
                onPress: () => sendAlert(),
                style: 'destructive',
              },
            ]
          );
          return;
        }

        await sendAlert();
      } catch (error) {
        Alert.alert('Error', 'An error occurred');
        setIsSending(false);
      }
    }
  };

  const sendAlert = async () => {
    try {
      // Request location permission (optional)
      let locationData = 'emergency-alert-triggered';

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const mapLink = `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
          locationData = JSON.stringify({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            mapLink,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (locError) {
        // Continue without location if permission denied or GPS fails
      }

      // Send panic alert (with or without location)
      const result = await sendPanicAlert(locationData);

      if (result.success) {
        Alert.alert('🚨 Alert Sent', 'Your emergency alert has been sent successfully.', [
          {
            text: 'OK',
            onPress: () => {
              setIsSending(false);
              onClose();
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to send emergency alert');
        setIsSending(false);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while sending the alert');
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setTapCount(0);
    setIsSending(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>Emergency Alert</Text>

            {/* Instruction */}
            <Text style={styles.instruction}>
              {tapCount === 1
                ? 'Tap again to confirm and send'
                : 'Tap twice on the button below to send emergency alert'}
            </Text>

            {/* Alert Button */}
            <TouchableOpacity
              style={[
                styles.alertButton,
                tapCount === 1 && styles.alertButtonConfirm,
                isSending && styles.alertButtonDisabled,
              ]}
              onPress={handleTap}
              disabled={isSending}
            >
              <MaterialIcons name="favorite" size={48} color="#EF4444" />
              {isSending && (
                <ActivityIndicator
                  color="#EF4444"
                  size="large"
                  style={styles.loadingOverlay}
                />
              )}
              {tapCount === 1 && !isSending && (
                <View style={styles.confirmIndicator}>
                  <Text style={styles.confirmText}>!</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Sending status */}
            {isSending && (
              <Text style={styles.sendingText}>Sending alert...</Text>
            )}

            {/* Info text */}
            <Text style={styles.infoText}>
              Your location and custom message will be sent to emergency contacts via SMS.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Auth gate for unauthenticated users */}
      <AuthGateModal
        visible={showAuthGate}
        onClose={() => {
          setShowAuthGate(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  alertButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  alertButtonConfirm: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
    width: 120,
    height: 120,
  },
  alertButtonDisabled: {
    opacity: 0.7,
  },
  loadingOverlay: {
    position: 'absolute',
  },
  confirmIndicator: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  confirmText: {
    color: '#7F1D1D',
    fontWeight: 'bold',
    fontSize: 20,
  },
  sendingText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
