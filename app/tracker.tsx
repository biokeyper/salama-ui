import { IconSymbol } from '@/components/ui/IconSymbol';
import { getHealthLogs, saveHealthLog } from '@/services/storage';
import { CycleFlow, CycleMood, CyclePain, HealthLog } from '@/types/report';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TrackerScreen() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [logs, setLogs] = useState<HealthLog[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Log State
    const [flow, setFlow] = useState<CycleFlow | undefined>(undefined);
    const [mood, setMood] = useState<CycleMood | undefined>(undefined);
    const [pain, setPain] = useState<CyclePain[]>([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        const loadedLogs = await getHealthLogs();
        setLogs(loadedLogs);
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
                <Text style={styles.headerTitle}>My Cycle</Text>
                <View style={{ width: 28 }} />
            </View>

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

            <ScrollView contentContainerStyle={styles.calendarGrid}>
                {renderCalendar()}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
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
