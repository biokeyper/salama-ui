import { useBackgroundRecording } from '@/contexts/BackgroundRecordingContext';
import { useSettings } from '@/contexts/SettingsContext';
import { saveReport } from '@/services/storage';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const buttons = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '=', '+'],
];

export default function FakeCalculatorScreen() {
  const [display, setDisplay] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const router = useRouter();
  const { exitDecoyMode, setBackgroundRecordingUri } = useBackgroundRecording();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { settings } = useSettings();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start recording immediately on launch if settings allow
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const initRecording = async () => {
      if (!isRecording && settings.backgroundRecording.calculator) {
        timer = setTimeout(() => {
          startRecording();
        }, 500);
      }
    };
    initRecording();
    return () => clearTimeout(timer);
  }, [settings.backgroundRecording.calculator]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        try {
          audioRecorder.stop().catch(() => { });
        } catch (error) {
        }
      }
    };
  }, [isRecording]);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRecording) {
        setShowCursor((prev) => !prev);
      } else {
        setShowCursor(true);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        return;
      }

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordingStartTime(Date.now());
      setIsRecording(true);
    } catch (error) {
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return null;

    try {
      // Verify recorder exists and hasn't been released
      if (!audioRecorder) {
        setIsRecording(false);
        return null;
      }

      await audioRecorder.stop();
      const endTime = Date.now();
      const durationMs = recordingStartTime ? (endTime - recordingStartTime) : 0;

      const uri = audioRecorder.uri ?? null;
      setIsRecording(false);

      if (uri) {
        const now = new Date().toISOString();
        const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const savedReport = await saveReport({
          id: reportId,
          type: 'audio',
          status: 'saved',
          audioUri: uri,
          audioDuration: durationMs,
          createdAt: now,
          updatedAt: now,
          metadata: { notes: 'Background recording from calculator' },
        });
        setBackgroundRecordingUri(uri);
        return uri;
      }
    } catch (error) {
    }

    return null;
  };

  const handlePress = (value: string) => {
    if (value === '=') {
      try {
        // eslint-disable-next-line no-eval
        const result = eval(display);
        setDisplay(String(result));
      } catch {
        setDisplay('Error');
      }
    } else {
      setDisplay(display + value);
    }
  };

  const handleClear = () => setDisplay('');

  // Secret gesture: Long press "C" button for 3 seconds
  const handleClearPressIn = () => {
    longPressTimer.current = setTimeout(async () => {
      await stopRecording();
      exitDecoyMode();
      router.replace('/(tabs)');
    }, 3000);
  };

  const handleClearPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const displayText = display || '0';
  const cursor = showCursor ? '|' : ' ';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.displayContainer}>
          <Text style={styles.displayText}>
            {displayText}{cursor}
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          {buttons.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.buttonRow}>
              {row.map((btn) => (
                <TouchableOpacity
                  key={btn}
                  style={styles.button}
                  onPress={() => handlePress(btn)}
                >
                  <Text style={styles.buttonText}>{btn}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
            onPressIn={handleClearPressIn}
            onPressOut={handleClearPressOut}
          >
            <Text style={styles.buttonText}>C</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  displayContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'flex-end',
    minHeight: 60,
    justifyContent: 'center',
  },
  displayText: {
    fontSize: 32,
    color: '#333',
    fontFamily: 'monospace',
  },
  buttonsContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    minWidth: 60,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    marginTop: 10,
    alignSelf: 'center',
    minWidth: 260,
  },
  buttonText: {
    fontSize: 22,
    color: '#222',
    fontWeight: 'bold',
  },
});