import { useSettings } from '@/contexts/SettingsContext';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { hasPin, removePin, setPin as savePin } from '@/services/security';
import { deleteAllHealthLogs, deleteAllReports } from '@/services/storage';
import { usePinProtection } from '@/contexts/PinProtectionContext';
import { backupEncryptionKey, recoverEncryptionKey, setupEmailRecovery } from '@/services/authService';
import LockScreen from './lock-screen';
import * as SecureStore from 'expo-secure-store';
import EmergencyContactsSection from '@/components/EmergencyContactsSection';

const EMAIL_RECOVERY_KEY = 'salama_email_recovery_setup';


export default function SettingsScreen() {
    const router = useRouter();
    const { settings, updateSettings, resetSettings } = useSettings();
    const pinProtection = usePinProtection();
    const checkPinStatus = pinProtection?.checkPinStatus || (async () => { });
    const [isClearing, setIsClearing] = useState(false);
    const [pinExists, setPinExists] = useState(false);
    const [showSetPin, setShowSetPin] = useState(false);
    const [showVerifyPin, setShowVerifyPin] = useState(false);
    const [showKeyBackupModal, setShowKeyBackupModal] = useState(false);
    const [keyBackupPin, setKeyBackupPin] = useState('');
    const [isBackingUpKey, setIsBackingUpKey] = useState(false);
    const [showEmailRecoveryModal, setShowEmailRecoveryModal] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [isSettingUpEmail, setIsSettingUpEmail] = useState(false);
    const [emailRecoverySetup, setEmailRecoverySetup] = useState(false);

    useEffect(() => {
        checkPin();
        checkEmailRecoverySetup();
    }, []);

    const checkEmailRecoverySetup = async () => {
        try {
            const isSetup = await SecureStore.getItemAsync(EMAIL_RECOVERY_KEY);
            setEmailRecoverySetup(isSetup === 'true');
        } catch (error) {
            console.error('Error checking email recovery setup:', error);
        }
    };

    const checkPin = async () => {
        const exists = await hasPin();
        setPinExists(exists);
    };

    const handleClearAllData = () => {
        Alert.alert(
            'Clear All Data',
            'This will permanently delete all reports, health logs, and recordings. This action cannot be undone. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All Data',
                    style: 'destructive',
                    onPress: async () => {
                        setIsClearing(true);
                        try {
                            await AsyncStorage.clear();
                            await resetSettings();
                            Alert.alert('Success', 'All data has been cleared.');
                            router.back();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear data. Please try again.');
                        } finally {
                            setIsClearing(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSetPin = async (pin: string) => {
        const success = await savePin(pin);
        if (success) {
            setPinExists(true);
            setShowSetPin(false);
            setShowVerifyPin(false);
            // Refresh global PIN state
            await checkPinStatus();
            Alert.alert('Success', 'PIN has been set successfully');
        } else {
            Alert.alert('Error', 'Failed to set PIN. Please try again.');
        }
    };

    const handleChangePin = () => {
        // Show verification modal first
        setShowVerifyPin(true);
    };

    const handleVerificationSuccess = () => {
        // After successful verification, show set PIN modal
        setShowVerifyPin(false);
        setShowSetPin(true);
    };

    const handleRemovePin = () => {
        Alert.alert(
            'Remove PIN & Clear Data',
            'Removing your PIN will also permanently delete all your data for security reasons. This action cannot be undone. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove & Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Clear all data from database
                            await deleteAllReports();
                            await deleteAllHealthLogs();
                            // Clear AsyncStorage
                            await AsyncStorage.clear();
                            // Remove PIN
                            const pinRemoved = await removePin();
                            if (pinRemoved) {
                                setPinExists(false);
                                // Refresh global PIN state
                                await checkPinStatus();
                                Alert.alert(
                                    'Complete',
                                    'PIN removed and all data has been cleared.',
                                    [{ text: 'OK', onPress: () => router.back() }]
                                );
                            } else {
                                Alert.alert('Error', 'Failed to remove PIN. Please try again.');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear data. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleBackupEncryptionKey = async () => {
        if (!keyBackupPin.trim()) {
            Alert.alert('Error', 'Please enter a PIN');
            return;
        }

        setIsBackingUpKey(true);
        try {
            // In a real scenario, you would get the actual encryption key from your app
            // For now, using a placeholder
            const result = await backupEncryptionKey(keyBackupPin, 'placeholder-encryption-key');
            if (result.success) {
                setShowKeyBackupModal(false);
                setKeyBackupPin('');
                Alert.alert('Success', 'Your encryption key has been backed up securely');
            } else {
                Alert.alert('Error', result.error || 'Failed to backup encryption key');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while backing up');
        } finally {
            setIsBackingUpKey(false);
        }
    };

    const handleSetupEmailRecovery = async () => {
        if (!recoveryEmail.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail.trim())) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setIsSettingUpEmail(true);
        try {
            const result = await setupEmailRecovery(recoveryEmail.trim());
            if (result.success) {
                setShowEmailRecoveryModal(false);
                setRecoveryEmail('');
                setEmailRecoverySetup(true);
                Alert.alert('Success', 'Email recovery has been set up successfully');
            } else {
                Alert.alert('Error', result.error || 'Failed to setup email recovery');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while setting up email recovery');
        } finally {
            setIsSettingUpEmail(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#8B5CF6" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Background Recording Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Background Recording</Text>
                    <Text style={styles.sectionDescription}>
                        Record audio in the background when these apps are open. Turn off if you want to use them normally.
                    </Text>

                    <View style={styles.setting}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>🔢 Calculator</Text>
                            <Text style={styles.settingHint}>Record when calculator is open</Text>
                        </View>
                        <Switch
                            value={settings.backgroundRecording.calculator}
                            onValueChange={(value) =>
                                updateSettings({
                                    backgroundRecording: { ...settings.backgroundRecording, calculator: value },
                                })
                            }
                            trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                            thumbColor={settings.backgroundRecording.calculator ? '#8B5CF6' : '#F3F4F6'}
                        />
                    </View>

                    <View style={styles.setting}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>📅 Calendar</Text>
                            <Text style={styles.settingHint}>Record when calendar is open</Text>
                        </View>
                        <Switch
                            value={settings.backgroundRecording.calendar}
                            onValueChange={(value) =>
                                updateSettings({
                                    backgroundRecording: { ...settings.backgroundRecording, calendar: value },
                                })
                            }
                            trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                            thumbColor={settings.backgroundRecording.calendar ? '#8B5CF6' : '#F3F4F6'}
                        />
                    </View>

                    <View style={styles.setting}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>💖 Menstrual Tracker</Text>
                            <Text style={styles.settingHint}>Record when tracker is open</Text>
                        </View>
                        <Switch
                            value={settings.backgroundRecording.tracker}
                            onValueChange={(value) =>
                                updateSettings({
                                    backgroundRecording: { ...settings.backgroundRecording, tracker: value },
                                })
                            }
                            trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                            thumbColor={settings.backgroundRecording.tracker ? '#8B5CF6' : '#F3F4F6'}
                        />
                    </View>
                </View>

                {/* App Lock Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔒 App Lock</Text>
                    <Text style={styles.sectionDescription}>
                        Protect your data with a PIN. When enabled, you'll need to enter your PIN to access your library.
                    </Text>

                    {!pinExists ? (
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => setShowSetPin(true)}
                        >
                            <Feather name="lock" size={20} color="#8B5CF6" />
                            <Text style={styles.primaryButtonText}>Set PIN</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.buttonGroup}>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={handleChangePin}
                            >
                                <Feather name="edit-2" size={18} color="#6B7280" />
                                <Text style={styles.secondaryButtonText}>Change PIN</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={handleRemovePin}
                            >
                                <Feather name="unlock" size={18} color="#6B7280" />
                                <Text style={styles.secondaryButtonText}>Remove PIN</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Safety Features Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Safety Features</Text>
                    <Text style={styles.sectionDescription}>
                        Automatically detect concerning patterns and quick emergency options.
                    </Text>

                    <View style={styles.setting}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Auto-Detect Abuse Indicators</Text>
                            <Text style={styles.settingHint}>
                                Flag concerning health entries automatically
                            </Text>
                        </View>
                        <Switch
                            value={settings.abuseDetection}
                            onValueChange={(value) => updateSettings({ abuseDetection: value })}
                            trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                            thumbColor={settings.abuseDetection ? '#8B5CF6' : '#F3F4F6'}
                        />
                    </View>

                    <View style={styles.setting}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>🚨 Emergency Alert (Shake)</Text>
                            <Text style={styles.settingHint}>
                                Shake your phone anywhere to send an emergency alert
                            </Text>
                        </View>
                        <Text style={styles.settingStatus}>Active</Text>
                    </View>
                </View>

                {/* Emergency Contacts Section */}
                <EmergencyContactsSection />

                {/* Account Security Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔐 Account Security</Text>
                    <Text style={styles.sectionDescription}>
                        Set up recovery options to regain access if you lose your phone.
                    </Text>

                    <View style={styles.securityOption}>
                        <View style={styles.securityInfo}>
                            <Text style={styles.settingLabel}>📧 Email Recovery</Text>
                            <Text style={styles.settingHint}>
                                {emailRecoverySetup ? 'Email recovery is enabled' : 'Set up email recovery'}
                            </Text>
                        </View>
                        {emailRecoverySetup && <Feather name="check-circle" size={20} color="#10B981" />}
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => setShowEmailRecoveryModal(true)}
                    >
                        <Feather name="mail" size={20} color="#8B5CF6" />
                        <Text style={styles.primaryButtonText}>
                            {emailRecoverySetup ? 'Update Email Recovery' : 'Setup Email Recovery'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Key Backup Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔑 Key Backup</Text>
                    <Text style={styles.sectionDescription}>
                        Backup your encryption key securely to recover access to your data.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => setShowKeyBackupModal(true)}
                    >
                        <Feather name="lock" size={20} color="#8B5CF6" />
                        <Text style={styles.primaryButtonText}>Backup Encryption Key</Text>
                    </TouchableOpacity>
                </View>

                {/* Data Management Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Management</Text>
                    <Text style={styles.sectionDescription}>
                        All your data is stored privately on your device only. No cloud sync.
                    </Text>

                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleClearAllData}
                        disabled={isClearing}
                    >
                        <Feather name="trash-2" size={20} color="#EF4444" />
                        <Text style={styles.dangerButtonText}>
                            {isClearing ? 'Clearing...' : 'Clear All Data'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Privacy Notice */}
                <View style={styles.privacyNotice}>
                    <Feather name="shield" size={20} color="#8B5CF6" />
                    <Text style={styles.privacyText}>
                        Your privacy is our priority. All features work offline and your data never leaves
                        your device.
                    </Text>
                </View>
            </ScrollView>

            {/* PIN Verification Modal (for changing PIN) */}
            <Modal visible={showVerifyPin} animationType="slide" transparent={false}>
                <LockScreen
                    mode="verify"
                    onUnlock={handleVerificationSuccess}
                    onSetPin={() => { }}
                />
                <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowVerifyPin(false)}
                >
                    <Feather name="x" size={24} color="#666" />
                </TouchableOpacity>
            </Modal>

            {/* PIN Setup Modal */}
            <Modal visible={showSetPin} animationType="slide" transparent={false}>
                <LockScreen
                    mode="set"
                    onSetPin={handleSetPin}
                    onUnlock={() => { }}
                />
                <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowSetPin(false)}
                >
                    <Feather name="x" size={24} color="#666" />
                </TouchableOpacity>
            </Modal>

            {/* Key Backup Modal */}
            <Modal visible={showKeyBackupModal} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => {
                                setShowKeyBackupModal(false);
                                setKeyBackupPin('');
                            }}
                        >
                            <Feather name="x" size={24} color="#666" />
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Backup Encryption Key</Text>
                        <Text style={styles.modalDescription}>
                            Enter a PIN to secure your encryption key backup
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter PIN"
                            value={keyBackupPin}
                            onChangeText={setKeyBackupPin}
                            secureTextEntry={true}
                            editable={!isBackingUpKey}
                            placeholderTextColor="#9CA3AF"
                        />

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleBackupEncryptionKey}
                            disabled={isBackingUpKey}
                        >
                            <Text style={styles.primaryButtonText}>
                                {isBackingUpKey ? 'Backing up...' : 'Backup Key'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Email Recovery Modal */}
            <Modal visible={showEmailRecoveryModal} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => {
                                setShowEmailRecoveryModal(false);
                                setRecoveryEmail('');
                            }}
                        >
                            <Feather name="x" size={24} color="#666" />
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Email Recovery</Text>
                        <Text style={styles.modalDescription}>
                            Add your email to recover your account if you lose access to your phone.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email address"
                            value={recoveryEmail}
                            onChangeText={setRecoveryEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isSettingUpEmail}
                            placeholderTextColor="#9CA3AF"
                        />

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleSetupEmailRecovery}
                            disabled={isSettingUpEmail}
                        >
                            {isSettingUpEmail ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Feather name="mail" size={20} color="#fff" />
                                    <Text style={styles.primaryButtonText}>
                                        {emailRecoverySetup ? 'Update Email' : 'Setup Email'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    setting: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 4,
    },
    settingHint: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    settingStatus: {
        fontSize: 13,
        fontWeight: '600',
        color: '#10B981',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        gap: 10,
    },
    dangerButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
    },
    privacyNotice: {
        flexDirection: 'row',
        backgroundColor: '#F5F3FF',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        alignItems: 'flex-start',
    },
    privacyText: {
        flex: 1,
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F3FF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        gap: 10,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 32,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1F2937',
        marginBottom: 16,
    },
    securityOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        marginBottom: 16,
    },
    securityInfo: {
        flex: 1,
        marginRight: 12,
    },
});
