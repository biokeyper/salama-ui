import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertModal, type AlertType, type AlertButton } from '@/components/AlertModal';
import { showToast } from '@/utils/toast';

import { hasPin, setPin as savePin } from '@/services/security';
import { deleteAllHealthLogs, deleteAllReports } from '@/services/storage';
import { usePinProtection } from '@/contexts/PinProtectionContext';
import { setupEmailRecovery, deleteUserAccount, getAuthToken } from '@/services/authService';
import LockScreen from './lock-screen';
import * as SecureStore from 'expo-secure-store';
import EmergencyContactsSection from '@/components/EmergencyContactsSection';
import AuthGateModal from '@/components/AuthGateModal';

export default function SettingsScreen() {
    const router = useRouter();
    const { settings, updateSettings } = useSettings();
    const { user, logout } = useAuth();
    const pinProtection = usePinProtection();
    const checkPinStatus = pinProtection?.checkPinStatus || (async () => { });
    const [isClearing, setIsClearing] = useState(false);
    const [pinExists, setPinExists] = useState(false);
    const [showSetPin, setShowSetPin] = useState(false);
    const [showVerifyPin, setShowVerifyPin] = useState(false);
    const [showEmailRecoveryModal, setShowEmailRecoveryModal] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [isSettingUpEmail, setIsSettingUpEmail] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showAuthGate, setShowAuthGate] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message?: string; buttons?: AlertButton[] }>({
        visible: false,
        type: 'info',
        title: '',
    });

    const checkAuth = async (): Promise<boolean> => {
        const token = await getAuthToken();
        return !!(token && user);
    };

    useEffect(() => {
        const checkPin = async () => {
            const exists = await hasPin(user?.userId);
            setPinExists(exists);
        };

        if (user) {
            checkPin();
            if (user.email) {
                setRecoveryEmail(user.email);
            }
        }
    }, [user]);

    const emailRecoverySetup = user?.email ? true : false;

    const handleLogout = () => {
        const buttons: AlertButton[] = [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    setIsLoggingOut(true);
                    try {
                        await logout();
                        router.replace('/login');
                    } catch (_error) {
                        setAlert({
                            visible: true,
                            type: 'error',
                            title: 'Error',
                            message: 'An error occurred while logging out. Please try again.',
                        });
                    } finally {
                        setIsLoggingOut(false);
                    }
                },
            },
        ];

        setAlert({
            visible: true,
            type: 'warning',
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            buttons,
        });
    };

    const handleDeleteAccount = async () => {

        const isAuth = await checkAuth();
        if (!isAuth) {
            setShowAuthGate(true);
            return;
        }

        const buttons: AlertButton[] = [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete My Account',
                style: 'destructive',
                onPress: async () => {
                    setIsClearing(true);
                    try {
                        const result = await deleteUserAccount();
                        if (result.success) {
                            try {
                                await deleteAllReports();
                                await deleteAllHealthLogs();
                                await AsyncStorage.clear();
                                await logout();
                            } catch (_cleanupError) {
                            }

                            setAlert({
                                visible: true,
                                type: 'success',
                                title: 'Account Deleted',
                                message: 'Your account and all local data have been permanently deleted.',
                                buttons: [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            router.replace('/');
                                        },
                                    },
                                ],
                            });
                        } else {
                            setAlert({
                                visible: true,
                                type: 'error',
                                title: 'Error',
                                message: result.error || 'Failed to delete account. Please try again.',
                            });
                        }
                    } catch (_error) {
                        setAlert({
                            visible: true,
                            type: 'error',
                            title: 'Error',
                            message: 'An error occurred. Please try again.',
                        });
                    } finally {
                        setIsClearing(false);
                    }
                },
            },
        ];

        setAlert({
            visible: true,
            type: 'warning',
            title: 'Delete Account',
            message: 'All your account data, reports, and settings will be permanently deleted. However, any reports you have submitted to the blockchain will remain there permanently as they are immutable. This action cannot be undone.',
            buttons,
        });
    };

    const handleSetPin = async (pin: string) => {
        const success = await savePin(pin, user?.userId);
        if (success) {
            setPinExists(true);
            setShowSetPin(false);
            setShowVerifyPin(false);
            await checkPinStatus();
            showToast.success('PIN has been set successfully');
        } else {
            setAlert({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'Failed to set PIN. Please try again.',
            });
        }
    };

    const handleChangePin = () => {
        setShowVerifyPin(true);
    };

    const handleVerificationSuccess = () => {
        setShowVerifyPin(false);
        setShowSetPin(true);
    };

    const handleOpenEmailRecovery = async () => {
        const isAuth = await checkAuth();
        if (!isAuth) {
            setShowAuthGate(true);
            return;
        }
        setShowEmailRecoveryModal(true);
    };

    const handleSetupEmailRecovery = async () => {
        if (!recoveryEmail.trim()) {
            setAlert({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'Please enter your email address',
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail.trim())) {
            setAlert({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'Please enter a valid email address',
            });
            return;
        }

        setIsSettingUpEmail(true);
        try {
            const result = await setupEmailRecovery(recoveryEmail.trim());
            if (result.success) {
                if (user) {
                    const updatedUser = { ...user, email: recoveryEmail.trim() };
                    await SecureStore.setItemAsync('salama_auth_user', JSON.stringify(updatedUser));
                }
                setShowEmailRecoveryModal(false);
                showToast.success(emailRecoverySetup ? 'Email updated successfully' : 'Email recovery set up successfully');
            } else {
                setAlert({
                    visible: true,
                    type: 'error',
                    title: 'Error',
                    message: result.error || 'Failed to setup email recovery',
                });
            }
        } catch (_error) {
            setAlert({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'An error occurred while setting up email recovery',
            });
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

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔒 App Lock</Text>
                    <Text style={styles.sectionDescription}>
                        Protect your data with a PIN. When enabled, you&apos;ll need to enter your PIN to access your library.
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
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleChangePin}
                        >
                            <Feather name="edit-2" size={20} color="#8B5CF6" />
                            <Text style={styles.primaryButtonText}>Change PIN</Text>
                        </TouchableOpacity>
                    )}
                </View>

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

                </View>

                <EmergencyContactsSection />

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔐 Account Security</Text>
                    <Text style={styles.sectionDescription}>
                        Set up recovery options to regain access if you lose your phone.
                    </Text>

                    <View style={styles.securityOption}>
                        <View style={styles.securityInfo}>
                            <Text style={styles.settingLabel}>📧 Email Recovery</Text>
                            <Text style={styles.settingHint}>
                                {emailRecoverySetup ? user?.email : 'Not set up yet'}
                            </Text>
                        </View>
                        {emailRecoverySetup && <Feather name="check-circle" size={20} color="#10B981" />}
                    </View>

                    {emailRecoverySetup && (
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleOpenEmailRecovery}
                        >
                            <Feather name="edit-2" size={20} color="#8B5CF6" />
                            <Text style={styles.primaryButtonText}>
                                Change Email Recovery
                            </Text>
                        </TouchableOpacity>
                    )}

                    {!emailRecoverySetup && (
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleOpenEmailRecovery}
                        >
                            <Feather name="mail" size={20} color="#8B5CF6" />
                            <Text style={styles.primaryButtonText}>
                                Setup Email Recovery
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {user && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Session</Text>
                        <Text style={styles.sectionDescription}>
                            Manage your account session and login status.
                        </Text>

                        <TouchableOpacity
                            style={styles.dangerButton}
                            onPress={handleLogout}
                            disabled={isLoggingOut}
                        >
                            <Feather name="log-out" size={20} color="#EF4444" />
                            <Text style={styles.dangerButtonText}>
                                {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {user && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Data Management</Text>
                        <Text style={styles.sectionDescription}>
                            All your data is stored privately on your device only. No cloud sync.
                        </Text>

                        <TouchableOpacity
                            style={styles.dangerButton}
                            onPress={handleDeleteAccount}
                            disabled={isClearing}
                        >
                            <Feather name="trash-2" size={20} color="#EF4444" />
                            <Text style={styles.dangerButtonText}>
                                {isClearing ? 'Deleting...' : 'Delete Account'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.privacyNotice}>
                    <Feather name="shield" size={20} color="#8B5CF6" />
                    <Text style={styles.privacyText}>
                        Your privacy is our priority. All features work offline and your data never leaves
                        your device.
                    </Text>
                </View>
            </ScrollView>

            <Modal visible={showVerifyPin} animationType="slide" transparent={false}>
                <LockScreen
                    mode="verify"
                    onUnlock={handleVerificationSuccess}
                    onSetPin={() => { }}
                    onClose={() => setShowVerifyPin(false)}
                />
            </Modal>

            <Modal visible={showSetPin} animationType="slide" transparent={false}>
                <LockScreen
                    mode="set"
                    onSetPin={handleSetPin}
                    onUnlock={() => { }}
                    onClose={() => setShowSetPin(false)}
                />
            </Modal>

            <Modal visible={showEmailRecoveryModal} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {emailRecoverySetup ? 'Update Email Recovery' : 'Setup Email Recovery'}
                            </Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowEmailRecoveryModal(false)}
                            >
                                <Feather name="x" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDescription}>
                            {emailRecoverySetup
                                ? 'Change your recovery email to a different address.'
                                : 'Add your email to recover your account if you lose access to your phone.'}
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

            <AlertModal
                visible={alert.visible}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                buttons={alert.buttons}
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalCloseButton: {
        padding: 8,
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
