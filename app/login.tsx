

import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { AlertModal, type AlertType, type AlertButton } from '@/components/AlertModal';
import { CountryPicker } from '@/components/CountryPicker';
import { COUNTRIES, normalizePhoneNumber, isValidPhoneLength } from '@/utils/countries';
import { showToast } from '@/utils/toast';
import {
  initiateForgotPhone,
  verifyRecoveryEmail,
  initiatePhoneChangeRecovery,
  verifyPhoneChangeRecovery,
} from '@/services/authService'; // Keep these for recovery flow

export default function LoginScreen() {
  const [step, setStep] = useState<'phone' | 'otp' | 'forgot-email' | 'forgot-token' | 'forgot-newphone' | 'forgot-otp'>('phone');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[1]); // Uganda by default
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedCountryRecovery, setSelectedCountryRecovery] = useState(COUNTRIES[0]);
  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message?: string; buttons?: AlertButton[] }>({
    visible: false,
    type: 'info',
    title: '',
  });
  const router = useRouter();
  const { login, initiateLoginFlow } = useAuth();

  const handleInitiateLogin = async () => {
    if (!phone.trim()) {
      showToast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(selectedCountry.code, phone.trim());
      const result = await initiateLoginFlow(normalizedPhone);
      if (result.success) {
        setStep('otp');
      } else {
        showToast.error(result.error || 'Failed to initiate login');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showToast.error('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(selectedCountry.code, phone.trim());
      const result = await login(normalizedPhone, otp.trim());
      if (result.success) {
        showToast.success('Logged in successfully');
        setTimeout(() => {
          router.replace('/');
        }, 100);
      } else {
        showToast.error(result.error || 'Failed to verify OTP');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPhone = async () => {
    if (!recoveryEmail.trim()) {
      showToast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      const result = await initiateForgotPhone(recoveryEmail.trim());
      if (result.success) {
        showToast.success('Recovery link sent to your email');
        setStep('forgot-token');
      } else {
        showToast.error(result.error || 'Failed to initiate recovery');
      }
    } catch (_error) {
      showToast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRecoveryToken = async () => {
    if (!recoveryToken.trim()) {
      showToast.error('Please enter the recovery token from your email');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyRecoveryEmail(recoveryEmail.trim(), recoveryToken.trim());
      if (result.success) {
        setStep('forgot-newphone');
      } else {
        showToast.error(result.error || 'Invalid token');
      }
    } catch (_error) {
      showToast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePhoneRecovery = async () => {
    if (!newPhone.trim()) {
      showToast.error('Please enter your new phone number');
      return;
    }

    if (!isValidPhoneLength(selectedCountryRecovery.code, newPhone)) {
      showToast.error(`${selectedCountryRecovery.name} phone numbers should have ${selectedCountryRecovery.phoneLength} digits`);
      return;
    }

    setIsLoading(true);
    try {
      const normalizedNewPhone = normalizePhoneNumber(selectedCountryRecovery.code, newPhone);
      const result = await initiatePhoneChangeRecovery(recoveryEmail.trim(), normalizedNewPhone);
      if (result.success) {
        setStep('forgot-otp');
      } else {
        showToast.error(result.error || 'Failed to initiate phone change');
      }
    } catch (_error) {
      showToast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneChangeRecovery = async () => {
    if (!otp.trim()) {
      showToast.error('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyPhoneChangeRecovery(recoveryEmail.trim(), newPhone.trim(), otp.trim());
      if (result.success) {
        showToast.success('Your phone number has been updated. You can now login with your new phone.');
        setStep('phone');
        setPhone(newPhone);
        setRecoveryEmail('');
        setRecoveryToken('');
        setNewPhone('');
        setOtp('');
      } else {
        showToast.error(result.error || 'Failed to verify phone change');
      }
    } catch (_error) {
      showToast.error('An error occurred');
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
              <View style={styles.phoneInputRow}>
                <TouchableOpacity
                  style={[styles.input, styles.countryCodeDropdown]}
                  onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                >
                  <ThemedText style={styles.countryCodeText}>{selectedCountry.code}</ThemedText>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.phoneNumberInput]}
                  placeholder="Phone digits only"
                  placeholderTextColor="#aaa"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!isLoading}
                  keyboardType="phone-pad"
                />
              </View>

              {showCountryDropdown && (
                <Modal
                  visible={showCountryDropdown}
                  animationType="slide"
                  transparent={false}
                  onRequestClose={() => setShowCountryDropdown(false)}
                >
                  <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={() => setShowCountryDropdown(false)}>
                        <ThemedText style={styles.closeButton}>Done</ThemedText>
                      </TouchableOpacity>
                      <ThemedText style={styles.modalTitle}>Select Country</ThemedText>
                      <View style={{ width: 40 }} />
                    </View>
                    <FlatList
                      data={COUNTRIES}
                      keyExtractor={(item) => `${item.code}-${item.name}`}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.countryOption,
                            selectedCountry.code === item.code && styles.countryOptionSelected,
                          ]}
                          onPress={() => {
                            setSelectedCountry(item);
                            setShowCountryDropdown(false);
                          }}
                        >
                          <ThemedText style={styles.countryOptionFlag}>{item.flag}</ThemedText>
                          <View style={styles.countryOptionContent}>
                            <ThemedText style={styles.countryOptionName}>{item.name}</ThemedText>
                            <ThemedText style={styles.countryOptionCode}>{item.code}</ThemedText>
                          </View>
                          {selectedCountry.code === item.code && (
                            <ThemedText style={styles.checkmark}>✓</ThemedText>
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  </SafeAreaView>
                </Modal>
              )}
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
              <View style={styles.bottomActionRow}>
                <TouchableOpacity onPress={() => { setStep('forgot-email'); setRecoveryEmail(''); }}>
                  <ThemedText style={styles.forgotPhoneText}>Forgot phone number?</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()}>
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
              </View>
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
              <CountryPicker
                selectedCountry={selectedCountryRecovery}
                onSelectCountry={setSelectedCountryRecovery}
              />
              <View style={styles.phoneInputRow}>
                <TextInput
                  style={[styles.input, styles.countryCodeInput]}
                  value={selectedCountryRecovery.code}
                  editable={false}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.input, styles.phoneNumberInput]}
                  placeholder={`New phone (${selectedCountryRecovery.phoneLength} digits)`}
                  placeholderTextColor="#aaa"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  editable={!isLoading}
                  keyboardType="phone-pad"
                />
              </View>
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

        <View style={styles.bottomContainer}>
          <View style={styles.signupLinkContainer}>
            <ThemedText style={styles.signupLinkText}>Don&apos;t have an account? </ThemedText>
            <TouchableOpacity onPress={() => router.navigate('/signup')}>
              <ThemedText style={styles.signupLink}>Sign Up</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <AlertModal
          visible={alert.visible}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          buttons={alert.buttons}
          onDismiss={() => setAlert({ ...alert, visible: false })}
        />
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
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeDropdown: {
    flex: 0.25,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  phoneNumberInput: {
    flex: 0.75,
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    color: '#8A4FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  countryOptionSelected: {
    backgroundColor: '#f5f3ff',
  },
  countryOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryOptionContent: {
    flex: 1,
  },
  countryOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  countryOptionCode: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  checkmark: {
    fontSize: 18,
    color: '#8A4FFF',
    fontWeight: '600',
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
  bottomContainer: {
    gap: 12,
  },
  signupLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupLinkText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    textAlign: 'center',
    color: '#8A4FFF',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bottomActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#8A4FFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
