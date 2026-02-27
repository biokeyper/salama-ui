import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { verifyPin } from '@/services/security';

interface LockScreenProps {
    onUnlock: () => void;
    mode?: 'verify' | 'set';
    onSetPin?: (pin: string) => void;
}

export default function LockScreen({ onUnlock, mode = 'verify', onSetPin }: LockScreenProps) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const router = useRouter();

    const handleNumberPress = (num: string) => {
        if (mode === 'set') {
            if (isConfirming) {
                if (confirmPin.length < 6) {
                    setConfirmPin(confirmPin + num);
                }
            } else {
                if (pin.length < 6) {
                    setPin(pin + num);
                }
            }
        } else {
            if (pin.length < 6) {
                setPin(pin + num);
            }
        }
    };

    const handleDelete = () => {
        if (mode === 'set') {
            if (isConfirming) {
                setConfirmPin(confirmPin.slice(0, -1));
            } else {
                setPin(pin.slice(0, -1));
            }
        } else {
            setPin(pin.slice(0, -1));
        }
    };

    const handleSubmit = async () => {
        if (mode === 'set') {
            if (!isConfirming) {
                if (pin.length >= 4) {
                    setIsConfirming(true);
                } else {
                    Alert.alert('Error', 'PIN must be at least 4 digits');
                }
            } else {
                if (pin === confirmPin) {
                    onSetPin?.(pin);
                } else {
                    Alert.alert('Error', 'PINs do not match');
                    setPin('');
                    setConfirmPin('');
                    setIsConfirming(false);
                }
            }
        } else {
            // Verify mode
            const isValid = await verifyPin(pin);
            if (isValid) {
                onUnlock();
            } else {
                Alert.alert('Incorrect PIN', 'Please try again');
                setPin('');
            }
        }
    };

    const currentPin = mode === 'set' && isConfirming ? confirmPin : pin;

    return (
        <SafeAreaView style={styles.container}>
            <ThemedView style={styles.content}>
                <View style={styles.header}>
                    <Ionicons name="lock-closed" size={60} color="#8B5CF6" />
                    <ThemedText type="title" style={styles.title}>
                        {mode === 'set'
                            ? (isConfirming ? 'Confirm PIN' : 'Set PIN')
                            : 'Enter PIN'}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {mode === 'set'
                            ? (isConfirming ? 'Re-enter your PIN' : 'Create a 4-6 digit PIN')
                            : 'Unlock to access your data'}
                    </ThemedText>
                </View>

                {/* PIN Display */}
                <View style={styles.pinDisplay}>
                    {[...Array(6)].map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.pinDot,
                                index < currentPin.length && styles.pinDotFilled,
                            ]}
                        />
                    ))}
                </View>

                {/* Number Pad */}
                <View style={styles.numberPad}>
                    {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.numberRow}>
                            {row.map((num) => (
                                <TouchableOpacity
                                    key={num}
                                    style={styles.numberButton}
                                    onPress={() => handleNumberPress(String(num))}
                                >
                                    <Text style={styles.numberText}>{num}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                    <View style={styles.numberRow}>
                        <View style={styles.numberButton} />
                        <TouchableOpacity
                            style={styles.numberButton}
                            onPress={() => handleNumberPress('0')}
                        >
                            <Text style={styles.numberText}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.numberButton}
                            onPress={handleDelete}
                        >
                            <Ionicons name="backspace-outline" size={28} color="#333" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    currentPin.length < 4 && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={currentPin.length < 4}
                >
                  <ThemedText
                    style={[
                      styles.submitButtonText,
                      currentPin.length < 4 && styles.submitButtonTextDisabled,
                    ]}
                  >
                    {mode === 'set' ? (isConfirming ? 'Confirm' : 'Next') : 'Unlock'}
                  </ThemedText>
                </TouchableOpacity>

                {/* Cancel (only in verify mode) */}
                {mode === 'verify' && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                    >
                        <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                    </TouchableOpacity>
                )}
            </ThemedView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 24,
        marginTop: 20,
        color: '#8B5CF6',
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 8,
        color: '#666',
        textAlign: 'center',
    },
    pinDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 40,
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#8B5CF6',
        backgroundColor: 'transparent',
    },
    pinDotFilled: {
        backgroundColor: '#8B5CF6',
    },
    numberPad: {
        alignItems: 'center',
    },
    numberRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
    },
    numberButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    numberText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
    },
    submitButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 16,
        borderRadius: 30,
        marginTop: 20,
        marginHorizontal: 40,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    cancelButton: {
        marginTop: 20,
        paddingVertical: 12,
    },
    cancelButtonText: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
    },
    submitButtonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0.1,
    },
    submitButtonTextDisabled: {
        color: '#9CA3AF',
    },
});
