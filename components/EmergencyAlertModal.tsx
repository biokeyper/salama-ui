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
import { sendPanicAlert } from '@/services/panicService';

interface EmergencyAlertModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EmergencyAlertModal({ visible, onClose }: EmergencyAlertModalProps) {
  const [tapCount, setTapCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
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
        const result = await sendPanicAlert('emergency-alert-triggered');
        if (result.success) {
          Alert.alert('🚨 Alert Sent', 'Your emergency alert has been sent successfully.', [
            {
              text: 'OK',
              onPress: onClose,
            },
          ]);
        } else {
          Alert.alert('Error', result.error || 'Failed to send emergency alert');
        }
      } catch (error) {
        console.error('Error sending panic alert:', error);
        Alert.alert('Error', 'An error occurred while sending the alert');
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleClose = () => {
    setTapCount(0);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClose();
  };

  return (
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
            {isSending ? (
              <ActivityIndicator color="white" size="large" />
            ) : (
              <>
                <MaterialIcons name="favorite" size={48} color="#EF4444" />
                {tapCount === 1 && (
                  <View style={styles.confirmIndicator}>
                    <Text style={styles.confirmText}>!</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>

          {/* Info text */}
          <Text style={styles.infoText}>
            Emergency services and your trusted contacts will be notified.
          </Text>
        </View>
      </View>
    </Modal>
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
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  alertButtonConfirm: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    width: 120,
    height: 120,
  },
  alertButtonDisabled: {
    opacity: 0.7,
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
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
