import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { apiConfig } from '@/config/api';
import { AlertModal, type AlertType, type AlertButton } from '@/components/AlertModal';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email, userId } = useLocalSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message?: string; buttons?: AlertButton[] }>({
    visible: false,
    type: 'info',
    title: '',
  });

  useEffect(() => {
    verifyEmail();
  }, [email, userId]);

  const verifyEmail = async () => {
    if (!email || !userId) {
      setVerifyError('Invalid verification link');
      setIsVerifying(false);
      return;
    }

    try {

      const response = await axios.post(
        `${apiConfig.baseURL}/api/auth/setup-email`,
        {
          email: Array.isArray(email) ? email[0] : email,
          userId: Array.isArray(userId) ? userId[0] : userId,
        }
      );

      if (response.status === 200) {
        setIsVerifying(false);
        setAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Your email has been verified successfully!',
          buttons: [
            {
              text: 'Continue',
              onPress: () => {
                router.replace('/(tabs)');
              },
            },
          ],
        });
      }
    } catch (error) {
      let message = 'Failed to verify email. Please try again.';

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }

      setVerifyError(message);
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setIsVerifying(true);
    setVerifyError(null);
    verifyEmail();
  };

  const handleCancel = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Email</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {isVerifying ? (
          <>
            <Feather name="mail" size={80} color="#8B5CF6" style={styles.icon} />
            <Text style={styles.title}>Verifying Email</Text>
            <Text style={styles.subtitle}>Please wait while we verify your email address...</Text>
            <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
          </>
        ) : verifyError ? (
          <>
            <Feather name="alert-circle" size={80} color="#EF4444" style={styles.icon} />
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.subtitle}>{verifyError}</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
                <Feather name="refresh-cw" size={20} color="#fff" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loader: {
    marginTop: 20,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
