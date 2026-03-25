import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Clipboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initiateChangePhone, verifyChangePhone, getAuthToken } from '@/services/authService';
import { AlertModal, type AlertType } from '@/components/AlertModal';
import AuthGateModal from '@/components/AuthGateModal';

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [step, setStep] = useState<'info' | 'initiate' | 'verify'>('info');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message?: string }>({
    visible: false,
    type: 'info',
    title: '',
  });

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await getAuthToken();
    if (!token || !user) {
      setShowAuthGate(true);
    }
  };

  const handleInitiateChange = async () => {
    if (!newPhone.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await initiateChangePhone(newPhone);
      if (result.success) {
        setStep('verify');
        setError('');
      } else {
        setError(result.error || 'Failed to initiate phone change');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChange = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyChangePhone(newPhone, otp);
      if (result.success) {
        setStep('info');
        setNewPhone('');
        setOtp('');
        setAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Your phone number has been updated successfully',
        });
      } else {
        setError(result.error || 'Failed to verify phone change');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setStep('info');
    setNewPhone('');
    setOtp('');
    setError('');
  };

  const handleCopyUserId = async () => {
    if (user?.userId) {
      await Clipboard.setString(user.userId);
      setAlert({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'User ID copied to clipboard',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Account</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <Text style={styles.sectionDescription}>
            Your account details
          </Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Not available'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.userIdContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>User ID</Text>
                <Text style={styles.infoValue}>{user?.userId || 'Not available'}</Text>
              </View>
              {user?.userId && (
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyUserId}
                >
                  <Feather name="copy" size={18} color="#8B5CF6" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Change Phone Section */}
        {step === 'info' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Phone Number</Text>
            <Text style={styles.sectionDescription}>
              Update your phone number associated with your account
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep('initiate')}
            >
              <Feather name="phone" size={20} color="#8B5CF6" />
              <Text style={styles.primaryButtonText}>Change Phone</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'initiate' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enter New Phone Number</Text>

            <TextInput
              style={styles.input}
              placeholder="New phone number"
              value={newPhone}
              onChangeText={setNewPhone}
              editable={!isLoading}
              placeholderTextColor="#9CA3AF"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleInitiateChange}
                disabled={isLoading}
              >
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'verify' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verify with OTP</Text>
            <Text style={styles.sectionDescription}>
              Enter the OTP sent to {newPhone}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              editable={!isLoading}
              placeholderTextColor="#9CA3AF"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleVerifyChange}
                disabled={isLoading}
              >
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onDismiss={() => setAlert({ ...alert, visible: false })}
      />

      <AuthGateModal
        visible={showAuthGate}
        onClose={() => {
          router.back();
        }}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 24,
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
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copyButton: {
    padding: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    gap: 10,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
});
