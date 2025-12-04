import { useBackgroundRecording } from '@/contexts/BackgroundRecordingContext';
import { useSettings } from '@/contexts/SettingsContext';
import { saveReport } from '@/services/storage';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Holiday Map: "Month-Day" (0-indexed month) -> Name
const HOLIDAYS: Record<string, string> = {
    '11-25': 'Christmas Day',       // Dec 25
    '11-26': 'Boxing Day',          // Dec 26
    '0-1': "New Year's Day",        // Jan 1
    '2-8': "Intl. Women's Day",     // Mar 8
    '3-18': 'Good Friday',          // Apr 18 (2025 date)
    '3-21': 'Easter Monday',        // Apr 21 (2025 date)
    '4-1': 'Labour Day',            // May 1
};

export default function FakeCalendarScreen() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
    const [secretPattern, setSecretPattern] = useState<number[]>([]);

    const router = useRouter();
    const { exitDecoyMode, setBackgroundRecordingUri } = useBackgroundRecording();
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const { settings } = useSettings();

    // Start recording immediately on launch if settings allow
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const initRecording = async () => {
            if (!isRecording && settings.backgroundRecording.calendar) {
                timer = setTimeout(() => {
                    startRecording();
                }, 500);
            }
        };
        initRecording();
        return () => clearTimeout(timer);
    }, [settings.backgroundRecording.calendar]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isRecording) {
                try {
                    audioRecorder.stop().catch(() => { });
                } catch (error) {
                    console.log('Recorder cleanup skipped - already released');
                }
            }
        };
    }, [isRecording]);

    const startRecording = async () => {
        try {
            const status = await AudioModule.requestRecordingPermissionsAsync();
            if (!status.granted) {
                console.error('Microphone permission not granted');
                return;
            }

            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();
            setRecordingStartTime(Date.now());
            setIsRecording(true);
            console.log('Background recording started in calendar');
        } catch (error) {
            console.error('Error starting background recording:', error);
        }
    };

    const stopRecording = async () => {
        if (!isRecording) return null;

        try {
            await audioRecorder.stop();
            const endTime = Date.now();
            const durationMs = recordingStartTime ? (endTime - recordingStartTime) : 0;

            const uri = audioRecorder.uri ?? null;
            setIsRecording(false);

            if (uri) {
                const savedReport = await saveReport({
                    type: 'audio',
                    status: 'saved',
                    audioUri: uri,
                    audioDuration: durationMs,
                    createdAt: new Date().toISOString(),
                    metadata: { notes: 'Background recording from calendar' },
                });

                console.log('Background recording saved:', savedReport);
                setBackgroundRecordingUri(uri);
                return uri;
            }
            return null;
        } catch (error) {
            console.error('Error stopping background recording:', error);
            setIsRecording(false);
            return null;
        }
    };

    const handleEmergencyExit = async () => {
        try {
            await stopRecording();
            exitDecoyMode();
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Error during emergency exit:', error);
            exitDecoyMode();
            router.replace('/(tabs)');
        }
    };

    // Secret pattern: Long press on same day 3 times (like 111 in calculator)
    const handleDateLongPress = (date: number) => {
        const newPattern = [...secretPattern, date];
        setSecretPattern(newPattern);

        // Check if pattern is 3 consecutive same dates
        if (newPattern.length >= 3) {
            const lastThree = newPattern.slice(-3);
            if (lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
                handleEmergencyExit();
                return;
            }
        }

        // Reset pattern after 5 attempts
        if (newPattern.length > 5) {
            setSecretPattern([]);
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days: (number | null)[] = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const isToday = (date: number) => {
        const today = new Date();
        return (
            date === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    const getHolidayName = (date: number) => {
        const key = `${currentDate.getMonth()}-${date}`;
        return HOLIDAYS[key];
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Calendar</Text>
                {isRecording && (
                    <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                    </View>
                )}
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                    <Text style={styles.navButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthYear}>
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                    <Text style={styles.navButtonText}>›</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.calendarContainer}>
                {/* Day Headers */}
                <View style={styles.daysHeader}>
                    {DAYS.map((day) => (
                        <View key={day} style={styles.dayHeaderCell}>
                            <Text style={styles.dayHeaderText}>{day}</Text>
                        </View>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                    {renderCalendar().map((date, index) => {
                        const holiday = date ? getHolidayName(date) : null;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.dateCell,
                                    date === null && styles.emptyCell,
                                    selectedDate === date && styles.selectedCell,
                                    date && isToday(date) && styles.todayCell,
                                    !!holiday && styles.holidayCell,
                                ]}
                                onPress={() => date && setSelectedDate(date)}
                                onLongPress={() => {
                                    if (date) handleDateLongPress(date);
                                }}
                                disabled={date === null}
                            >
                                {date && (
                                    <>
                                        <Text
                                            style={[
                                                styles.dateText,
                                                selectedDate === date && styles.selectedText,
                                                isToday(date) && styles.todayText,
                                                !!holiday && styles.holidayText,
                                            ]}
                                        >
                                            {date}
                                        </Text>
                                        {holiday && (
                                            <View style={styles.holidayDot} />
                                        )}
                                    </>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Selected Date Info / Holiday Info */}
                <View style={styles.infoContainer}>
                    {selectedDate && (
                        <View>
                            <Text style={styles.selectedDateLabel}>
                                {MONTHS[currentDate.getMonth()]} {selectedDate}, {currentDate.getFullYear()}
                            </Text>
                            {getHolidayName(selectedDate) && (
                                <Text style={styles.holidayLabel}>🎉 {getHolidayName(selectedDate)}</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Secret Hint (very subtle) */}
                <View style={styles.hintContainer}>
                    <Text style={styles.hintText}>
                        {isRecording ? '•' : ''}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    recordingIndicator: {
        width: 12,
        height: 12,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff0000',
        opacity: 0.5,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    navButton: {
        padding: 10,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navButtonText: {
        fontSize: 32,
        fontWeight: '300',
        color: '#8B5CF6',
    },
    monthYear: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    calendarContainer: {
        flex: 1,
        paddingHorizontal: 10,
    },
    daysHeader: {
        flexDirection: 'row',
        paddingVertical: 10,
    },
    dayHeaderCell: {
        flex: 1,
        alignItems: 'center',
    },
    dayHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dateCell: {
        width: '14.28%', // 7 days per week
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: '#f0f0f0',
        borderRadius: 8,
        marginVertical: 2,
    },
    emptyCell: {
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    selectedCell: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    todayCell: {
        borderColor: '#8B5CF6',
        borderWidth: 2,
    },
    holidayCell: {
        backgroundColor: '#F5F3FF',
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    selectedText: {
        color: '#fff',
        fontWeight: '600',
    },
    todayText: {
        color: '#8B5CF6',
        fontWeight: '700',
    },
    holidayText: {
        color: '#7C3AED',
        fontWeight: '600',
    },
    holidayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#7C3AED',
        marginTop: 2,
    },
    infoContainer: {
        padding: 20,
        minHeight: 100,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        marginTop: 20,
    },
    selectedDateLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    holidayLabel: {
        fontSize: 16,
        color: '#7C3AED',
        fontWeight: '500',
    },
    hintContainer: {
        padding: 20,
        alignItems: 'center',
    },
    hintText: {
        fontSize: 10,
        color: '#eee',
    },
});
