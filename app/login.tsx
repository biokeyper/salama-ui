/**
 * Login Screen
 * 2-step login flow: phone → OTP verification
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import {
  initiateForgotPhone,
  verifyRecoveryEmail,
  initiatePhoneChangeRecovery,
  verifyPhoneChangeRecovery,
} from '@/services/authService';

export default function LoginScreen() {
  const [step, setStep] = useState<'phone' | 'otp' | 'forgot-email' | 'forgot-token' | 'forgot-newphone' | 'forgot-otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testOtp, setTestOtp] = useState<string | undefined>();
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const router = useRouter();
  const { login, initiateLoginFlow } = useAuth();

  const handleInitiateLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const result = await initiateLoginFlow(phone.trim());
      if (result.success) {
        setTestOtp(result._testOTP); // For dev mode
        setStep('otp');
      } else {
        Alert.alert('Error', result.error || 'Failed to initiate login');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(phone.trim(), otp.trim());
      if (result.success) {
        Alert.alert('Success', 'You are now logged in', [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to verify OTP');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPhone = async () => {
    if (!recoveryEmail.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      const result = await initiateForgotPhone(recoveryEmail.trim());
      if (result.success) {
        Alert.alert('Check your email', 'A recovery link has been sent to your email address');
        setStep('forgot-token');
      } else {
        Alert.alert('Error', result.error || 'Failed to initiate recovery');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRecoveryToken = async () => {
    if (!recoveryToken.trim()) {
      Alert.alert('Error', 'Please enter the recovery token from your email');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyRecoveryEmail(recoveryEmail.trim(), recoveryToken.trim());
      if (result.success) {
        setStep('forgot-newphone');
      } else {
        Alert.alert('Error', result.error || 'Invalid token');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePhoneRecovery = async () => {
    if (!newPhone.trim()) {
      Alert.alert('Error', 'Please enter your new phone number');
      return;
    }

    setIsLoading(true);
    try {
      const result = await initiatePhoneChangeRecovery(recoveryEmail.trim(), newPhone.trim());
      if (result.success) {
        setStep('forgot-otp');
      } else {
        Alert.alert('Error', result.error || 'Failed to initiate phone change');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneChangeRecovery = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyPhoneChangeRecovery(recoveryEmail.trim(), newPhone.trim(), otp.trim());
      if (result.success) {
        Alert.alert('Success', 'Your phone number has been updated. You can now login with your new phone.', [
          {
            text: 'OK',
            onPress: () => {
              setStep('phone');
              setPhone(newPhone);
              setRecoveryEmail('');
              setRecoveryToken('');
              setNewPhone('');
              setOtp('');
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to verify phone change');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          {step === 'phone'
            ? 'Login'
            : step === 'otp'
            ? 'Enter OTP'
            : step === 'forgot-email'
            ? 'Forgot Phone Number'
            : step === 'forgot-token'
            ? 'Enter Recovery Token'
            : step === 'forgot-newphone'
            ? 'New Phone Number'
            : 'Verify Phone Change'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {step === 'phone'
            ? 'Enter your phone number to receive an OTP'
            : step === 'otp'
            ? 'Check your phone for the 6-digit code'
            : step === 'forgot-email'
            ? 'We will send a recovery link to your email'
            : step === 'forgot-token'
            ? 'Enter the token from the recovery email'
            : step === 'forgot-newphone'
            ? 'Enter your new phone number'
            : 'Enter the OTP sent to your new phone'}
        </ThemedText>

        <View style={styles.formContainer}>
          {step === 'phone' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Phone number (e.g., +254712345678)"
                placeholderTextColor="#aaa"
                value={phone}
                onChangeText={setPhone}
                editable={!isLoading}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleInitiateLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Continue</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('forgot-email'); setRecoveryEmail(''); }}>
                <ThemedText style={styles.forgotPhoneText}>Forgot phone number?</ThemedText>
              </TouchableOpacity>
            </>
          ) : step === 'otp' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                placeholderTextColor="#aaa"
                value={otp}
                onChangeText={setOtp}
                editable={!isLoading}
                keyboardType="number-pad"
                maxLength={6}
              />
              {testOtp && (
                <ThemedText style={styles.testOtpText}>
                  Dev mode: {testOtp}
                </ThemedText>
              )}
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Verify</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setTestOtp(undefined);
                }}
                disabled={isLoading}
              >
                <ThemedText style={styles.secondaryButtonText}>Back</ThemedText>
              </TouchableOpacity>
            </>
          ) : step === 'forgot-email' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Your email address"
                placeholderTextColor="#aaa"
                value={recoveryEmail}
                onChangeText={setRecoveryEmail}
                editable={!isLoading}
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleForgotPhone}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Send Recovery Link</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setStep('phone');
                  setRecoveryEmail('');
                }}
                disabled={isLoading}
              >
                <ThemedText style={styles.secondaryButtonText}>Back</ThemedText>
              </TouchableOpacity>
            </>
          ) : step === 'forgot-token' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Recovery token from email"
                placeholderTextColor="#aaa"
                value={recoveryToken}
                onChangeText={setRecoveryToken}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyRecoveryToken}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Verify Token</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setStep('forgot-email');
                  setRecoveryToken('');
                }}
                disabled={isLoading}
              >
                <ThemedText style={styles.secondaryButtonText}>Back</ThemedText>
              </TouchableOpacity>
            </>
          ) : step === 'forgot-newphone' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="New phone number"
                placeholderTextColor="#aaa"
                value={newPhone}
                onChangeText={setNewPhone}
                editable={!isLoading}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleChangePhoneRecovery}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Continue</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setStep('forgot-token');
                  setNewPhone('');
                }}
                disabled={isLoading}
              >
                <ThemedText style={styles.secondaryButtonText}>Back</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                placeholderTextColor="#aaa"
                value={otp}
                onChangeText={setOtp}
                editable={!isLoading}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyPhoneChangeRecovery}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Verify</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setStep('forgot-newphone');
                  setOtp('');
                }}
                disabled={isLoading}
              >
                <ThemedText style={styles.secondaryButtonText}>Back</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 32,
  },
  input: {
    borderColor: '#8A4FFF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#faf8ff',
    color: '#222',
  },
  testOtpText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#8A4FFF',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#8A4FFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#8A4FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    textAlign: 'center',
    color: '#8A4FFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  forgotPhoneText: {
    textAlign: 'center',
    color: '#8A4FFF',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});
