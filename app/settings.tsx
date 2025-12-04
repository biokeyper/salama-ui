import { useSettings } from '@/contexts/SettingsContext';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();
    const { settings, updateSettings, resetSettings } = useSettings();
    const [isClearing, setIsClearing] = useState(false);

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

                {/* Safety Features Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Safety Features</Text>
                    <Text style={styles.sectionDescription}>
                        Automatically detect concerning patterns in health logs and create private reports.
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
});
