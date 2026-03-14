/**
 * Signup Screen
 * 2-step signup flow: phone + email → OTP verification
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

export default function SignupScreen() {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testOtp, setTestOtp] = useState<string | undefined>();
  const router = useRouter();
  const { signup, initiateSignupFlow } = useAuth();

  const handleInitiateSignup = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const result = await initiateSignupFlow(phone.trim());
      if (result.success) {
        setTestOtp(result._testOTP); // For dev mode
        setStep('otp');
      } else {
        Alert.alert('Error', result.error || 'Failed to initiate signup');
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
      const result = await signup(phone.trim(), otp.trim());
      if (result.success) {
        // Navigate immediately, then show success message
        // This ensures navigation happens first before any modal shows
        setTimeout(() => {
          router.replace('/');
        }, 100);

        // Show brief success alert
        Alert.alert('Success', 'Account created successfully');
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={[styles.title, { color: '#000' }]}>
          {step === 'details' ? 'Create Account' : 'Enter OTP'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {step === 'details'
            ? 'Enter your phone number to get started'
            : 'Check your phone for the 6-digit code'}
        </ThemedText>

        <View style={styles.formContainer}>
          {step === 'details' ? (
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
                onPress={handleInitiateSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Continue</ThemedText>
                )}
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
                  setStep('details');
                  setOtp('');
                  setTestOtp(undefined);
                }}
                disabled={isLoading}
              >
                <ThemedText style={styles.secondaryButtonText}>
                  Back
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </TouchableOpacity>

          <View style={styles.loginLinkContainer}>
            <ThemedText style={styles.loginLinkText}>Already have an account? </ThemedText>
            <TouchableOpacity onPress={() => router.navigate('/login')}>
              <ThemedText style={styles.loginLink}>Login</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
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
  bottomContainer: {
    gap: 12,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    textAlign: 'center',
    color: '#8A4FFF',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
