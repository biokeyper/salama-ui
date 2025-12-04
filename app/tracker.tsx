import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBackgroundRecording } from '@/contexts/BackgroundRecordingContext';
import { getHealthLogs, saveHealthLog, saveReport } from '@/services/storage';
import { CycleFlow, CycleMood, CyclePain, HealthLog } from '@/types/report';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const HEALTH_TIPS = [
    "Stay hydrated! Drinking water helps reduce bloating.",
    "Gentle yoga can help alleviate menstrual cramps.",
    "Magnesium-rich foods like dark chocolate can boost your mood.",
    "Tracking your cycle helps you understand your body better.",
    "Heat patches are great for soothing lower back pain.",
    "Listen to your body—rest if you need to.",
    "Regular exercise can improve PMS symptoms over time.",
    "Limit caffeine intake to reduce anxiety during your cycle."
];

export default function TrackerScreen() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [logs, setLogs] = useState<HealthLog[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [dailyTip, setDailyTip] = useState('');

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
    const { setBackgroundRecordingUri, exitDecoyMode } = useBackgroundRecording();
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    // Log State
    const [flow, setFlow] = useState<CycleFlow | undefined>(undefined);
    const [mood, setMood] = useState<CycleMood | undefined>(undefined);
    const [pain, setPain] = useState<CyclePain[]>([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadLogs();
        setDailyTip(HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)]);
    }, []);

    // Start recording immediately on launch
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const initRecording = async () => {
            if (!isRecording) {
                timer = setTimeout(() => {
                    startRecording();
                }, 500);
            }
        };
        initRecording();
        return () => clearTimeout(timer);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isRecording) {
                stopRecording();
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
            console.log('Background recording started in Tracker');
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
                // Save as a hidden report
                await saveReport({
                    type: 'audio',
                    status: 'saved',
                    audioUri: uri,
                    audioDuration: durationMs,
                    createdAt: new Date().toISOString(),
                    metadata: { notes: 'Background recording from Tracker' },
                });
                setBackgroundRecordingUri(uri);
                console.log('Tracker recording saved');
                return uri;
            }
        } catch (error) {
            console.error('Error stopping background recording:', error);
        }
        return null;
    };

    const handleSecretExit = async () => {
        await stopRecording();
        exitDecoyMode();
        router.replace('/(tabs)');
    };

    const loadLogs = async () => {
        const loadedLogs = await getHealthLogs();
        // Sort logs by date descending
        setLogs(loadedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const getLogForDate = (date: string) => {
        return logs.find(l => l.date === date);
    };

    const handleDayPress = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        setSelectedDate(dateStr);

        const existingLog = getLogForDate(dateStr);
        if (existingLog) {
            setFlow(existingLog.flow);
            setMood(existingLog.mood);
            setPain(existingLog.pain || []);
            setNotes(existingLog.notes || '');
        } else {
            resetForm();
        }
        setIsModalVisible(true);
    };

    const resetForm = () => {
        setFlow(undefined);
        setMood(undefined);
        setPain([]);
        setNotes('');
    };

    const togglePain = (p: CyclePain) => {
        if (pain.includes(p)) {
            setPain(pain.filter(item => item !== p));
        } else {
            setPain([...pain, p]);
        }
    };

    const saveLog = async () => {
        const logData: Partial<HealthLog> = {
            date: selectedDate,
            flow,
            mood,
            pain,
            notes: notes.trim() || undefined,
        };

        // If updating existing log, include ID
        const existingLog = getLogForDate(selectedDate);
        if (existingLog) {
            logData.id = existingLog.id;
        }

        await saveHealthLog(logData);
        await loadLogs();
        setIsModalVisible(false);
    };

    // Calendar Logic
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), i).toISOString().split('T')[0];
            const log = getLogForDate(dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <TouchableOpacity
                    key={i}
                    style={[styles.dayCell, isToday && styles.todayCell]}
                    onPress={() => handleDayPress(i)}
                >
                    <Text style={[styles.dayText, isToday && styles.todayText]}>{i}</Text>
                    {log && (
                        <View style={styles.indicators}>
                            {log.flow && <View style={[styles.dot, { backgroundColor: '#FF69B4' }]} />}
                            {log.notes && <View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} />}
                        </View>
                    )}
                </TouchableOpacity>
            );
        }

        return days;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={28} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity onLongPress={handleSecretExit} delayLongPress={3000}>
                    <Text style={styles.headerTitle}>My Cycle</Text>
                </TouchableOpacity>
                <View style={styles.headerRight}>
                    {isRecording && <View style={styles.recordingDot} />}
                </View>
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                        <IconSymbol name="chevron.left" size={24} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                        <IconSymbol name="chevron.right" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.weekHeader}>
                    {DAYS.map(day => <Text key={day} style={styles.weekDayText}>{day}</Text>)}
                </View>

                <View style={styles.calendarGrid}>
                    {renderCalendar()}
                </View>

                {/* Health Tip Section */}
                <View style={styles.tipContainer}>
                    <View style={styles.tipHeader}>
                        <Text style={styles.tipIcon}>💡</Text>
                        <Text style={styles.tipTitle}>Daily Tip</Text>
                    </View>
                    <Text style={styles.tipText}>{dailyTip}</Text>
                </View>

                {/* Cycle History Section */}
                <View style={styles.historyContainer}>
                    <Text style={styles.historyTitle}>Recent Logs</Text>
                    {logs.length === 0 ? (
                        <Text style={styles.emptyHistoryText}>No logs yet. Tap a date to add one.</Text>
                    ) : (
                        logs.slice(0, 5).map(log => (
                            <TouchableOpacity key={log.id} style={styles.historyItem} onPress={() => {
                                setSelectedDate(log.date);
                                setFlow(log.flow);
                                setMood(log.mood);
                                setPain(log.pain || []);
                                setNotes(log.notes || '');
                                setIsModalVisible(true);
                            }}>
                                <View style={styles.historyDate}>
                                    <Text style={styles.historyDay}>{new Date(log.date).getDate()}</Text>
                                    <Text style={styles.historyMonth}>{MONTHS[new Date(log.date).getMonth()].substring(0, 3)}</Text>
                                </View>
                                <View style={styles.historyDetails}>
                                    <View style={styles.historyTags}>
                                        {log.flow && <Text style={styles.tag}>{log.flow}</Text>}
                                        {log.mood && <Text style={styles.tag}>{log.mood}</Text>}
                                    </View>
                                    {log.notes && <Text style={styles.historyNoteIndicator}>🔒 Note added</Text>}
                                </View>
                                <IconSymbol name="chevron.right" size={20} color="#ccc" />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Log for {selectedDate}</Text>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {/* Flow Section */}
                        <Text style={styles.sectionTitle}>Flow</Text>
                        <View style={styles.optionsRow}>
                            {(['light', 'medium', 'heavy', 'spotting'] as CycleFlow[]).map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.optionButton, flow === f && styles.selectedOption]}
                                    onPress={() => setFlow(flow === f ? undefined : f)}
                                >
                                    <Text style={[styles.optionText, flow === f && styles.selectedOptionText]}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Mood Section */}
                        <Text style={styles.sectionTitle}>Mood</Text>
                        <View style={styles.optionsRow}>
                            {(['happy', 'sad', 'anxious', 'angry', 'neutral'] as CycleMood[]).map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.optionButton, mood === m && styles.selectedOption]}
                                    onPress={() => setMood(mood === m ? undefined : m)}
                                >
                                    <Text style={[styles.optionText, mood === m && styles.selectedOptionText]}>
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Pain Section */}
                        <Text style={styles.sectionTitle}>Symptoms</Text>
                        <View style={styles.optionsRow}>
                            {(['cramps', 'headache', 'backache', 'nausea'] as CyclePain[]).map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.optionButton, pain.includes(p) && styles.selectedOption]}
                                    onPress={() => togglePain(p)}
                                >
                                    <Text style={[styles.optionText, pain.includes(p) && styles.selectedOptionText]}>
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Secret Notes Section */}
                        <Text style={styles.sectionTitle}>Notes (Private)</Text>
                        <TextInput
                            style={styles.notesInput}
                            multiline
                            placeholder="Add personal notes..."
                            value={notes}
                            onChangeText={setNotes}
                        />
                        <Text style={styles.privacyHint}>
                            🔒 Notes are stored locally and encrypted. Use this space to document any unusual symptoms or events.
                        </Text>

                        <TouchableOpacity style={styles.saveButton} onPress={saveLog}>
                            <Text style={styles.saveButtonText}>Save Log</Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    headerRight: {
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    weekHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    weekDayText: {
        color: '#999',
        fontSize: 12,
        width: 40,
        textAlign: 'center',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    todayCell: {
        backgroundColor: '#F3E8FF',
        borderRadius: 20,
    },
    dayText: {
        fontSize: 16,
        color: '#333',
    },
    todayText: {
        color: '#8B5CF6',
        fontWeight: 'bold',
    },
    indicators: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 4,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    // Tip Styles
    tipContainer: {
        margin: 16,
        padding: 16,
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#0EA5E9',
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    tipIcon: {
        fontSize: 20,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0284C7',
    },
    tipText: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
    },
    // History Styles
    historyContainer: {
        padding: 16,
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    emptyHistoryText: {
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 10,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    historyDate: {
        alignItems: 'center',
        marginRight: 16,
        width: 40,
    },
    historyDay: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    historyMonth: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
    },
    historyDetails: {
        flex: 1,
    },
    historyTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    tag: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
        textTransform: 'capitalize',
    },
    historyNoteIndicator: {
        fontSize: 12,
        color: '#8B5CF6',
        fontStyle: 'italic',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeText: {
        color: '#8B5CF6',
        fontSize: 16,
    },
    modalContent: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 12,
        color: '#444',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f9f9f9',
    },
    selectedOption: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    optionText: {
        color: '#666',
    },
    selectedOptionText: {
        color: '#fff',
        fontWeight: '600',
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    privacyHint: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
        fontStyle: 'italic',
    },
    saveButton: {
        backgroundColor: '#8B5CF6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 30,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
