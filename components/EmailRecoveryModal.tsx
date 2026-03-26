/**
 * Email Recovery Setup Modal
 * Shown after first login to optionally set up email recovery
 */

import React, { useState } from 'react';
import { 
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
  
 } from 'react-native';
import { AlertModal, type AlertType, type AlertButton } from '@/components/AlertModal';
import { showToast } from '@/utils/toast';
import { Feather } from '@expo/vector-icons';

interface EmailRecoveryModalProps {
  visible: boolean;
  onSkip: () => void;
  onSave: (email: string) => Promise<void>;
}

export default function EmailRecoveryModal({
  visible,
  onSkip,
  onSave
}: EmailRecoveryModalProps) {
  const [email, setEmail] = useState('');
  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message?: string; buttons?: AlertButton[] }>({
    visible: false,
    type: 'info',
    title: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!email.trim()) {
      showToast.error('Please enter your email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(email.trim());
      showToast.success('Email recovery has been set up');
      setEmail('');
      onSkip();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save email';
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setEmail('');
    onSkip();
  };

  return (
    <>
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Feather name="mail" size={32} color="#8B5CF6" />
            <Text style={styles.title}>Secure Your Account</Text>
          </View>

          {/* Content */}
          <Text style={styles.subtitle}>
            Add your email as a recovery option. If you lose access to your phone, you can recover your account using your email.
          </Text>

          <Text style={styles.note}>
            💡 This is optional. You can also set it up later in Settings.
          </Text>

          {/* Email Input */}
          <TextInput
            style={styles.input}
            placeholder="Enter your email address"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </Modal>

      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={() => setAlert({ ...alert, visible: false })}
      />
    </>
    );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16
  },
  note: {
    fontSize: 13,
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  input: {
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  primaryButton: {
    backgroundColor: '#8B5CF6'
  },
  secondaryButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});
