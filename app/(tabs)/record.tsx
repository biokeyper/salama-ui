import { useBackgroundRecording } from '@/contexts/BackgroundRecordingContext';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveReport } from '../../services/storage';

export default function RecordScreen() {
  const router = useRouter();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const { enterDecoyMode } = useBackgroundRecording();

  // Animation value for pulsing effect
  const pulseScale = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission needed', 'Please grant microphone permission to record audio.');
      }
    })();
    // No manual cleanup needed - expo-audio handles it
  }, []);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1, // Infinite repeat
        true // Reverse
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordingStartTime(Date.now());
      setIsRecording(true);
      setReportId(null); // Reset report ID for new recording
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      const endTime = Date.now();
      const durationMs = recordingStartTime ? (endTime - recordingStartTime) : 0;

      setIsRecording(false);
      const uri = audioRecorder.uri ?? null;
      setRecordedUri(uri);
      console.log('Recording saved to:', uri, 'Duration:', durationMs);

      if (uri) {
        try {
          const savedReport = await saveReport({
            type: 'audio',
            status: 'saved',
            audioUri: uri,
            audioDuration: durationMs, // Save duration in milliseconds
          });
          setReportId(savedReport.id);
        } catch (error) {
          console.error('Error auto-saving audio report:', error);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const handleEmergencyExit = async () => {
    if (isExiting) return;
    setIsExiting(true);

    // 1. Stop recording if active
    if (isRecording) {
      try {
        await audioRecorder.stop();
        const endTime = Date.now();
        const durationMs = recordingStartTime ? (endTime - recordingStartTime) : 0;
        const uri = audioRecorder.uri ?? null;

        // 2. Save the recording
        if (uri) {
          await saveReport({
            type: 'audio',
            status: 'saved',
            audioUri: uri,
            audioDuration: durationMs,
          });
          console.log('Emergency exit: Recording saved');
        }
      } catch (error) {
        console.error('Error saving on emergency exit:', error);
      }
    } else if (recordedUri && !reportId) {
      // If stopped but not yet saved (rare race condition), try to save
      try {
        await saveReport({
          type: 'audio',
          status: 'saved',
          audioUri: recordedUri,
        });
      } catch (error) {
        console.error('Error saving existing recording on exit:', error);
      }
    }

    // 3. Enter decoy mode and navigate
    try {
      enterDecoyMode();
      router.replace('/fake-calculator');
    } catch (error) {
      console.error('Error navigating to decoy mode:', error);
      // Fallback: try to navigate even if context update fails or something else happens
      router.replace('/fake-calculator');
    }
  };

  const navigateToDetailedReport = async () => {
    // If we haven't saved yet (e.g. auto-save failed), try again
    let currentReportId = reportId;

    if (recordedUri && !currentReportId) {
      try {
        const savedReport = await saveReport({
          type: 'audio',
          status: 'saved',
          audioUri: recordedUri,
        });
        currentReportId = savedReport.id;
      } catch (error) {
        console.error('Error saving audio report:', error);
        // Continue navigation even if save fails
      }
    }

    router.push({
      pathname: '../safety-check',
      params: {
        audioUri: recordedUri || '',
        reportId: currentReportId || ''
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToDetailedReport} style={styles.skipButton}>
          <Feather name="edit-3" size={16} color="#8A4FFF" />
          <Text style={styles.skipText}>Skip and type instead</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Record something happening now</Text>
      <Text style={styles.subtitle}>You can describe what is happening in your own words</Text>

      <TouchableOpacity
        onPress={isRecording ? stopRecording : startRecording}
        disabled={!!recordedUri && !isRecording}
        style={styles.buttonContainer}
      >
        <Animated.View style={[styles.recordingButton, isRecording && pulseStyle]}>
          {recordedUri && !isRecording ? (
            <View style={styles.recordingSaved}>
              <Feather name="check-circle" size={48} color="#4CAF50" />
            </View>
          ) : (
            <Feather
              name={isRecording ? "mic" : "mic-off"}
              size={48}
              color={isRecording ? "white" : "#8A4FFF"}
            />
          )}
        </Animated.View>

        <Text style={styles.recordingText}>
          {recordedUri && !isRecording
            ? "Recording saved"
            : isRecording
              ? "Recording... Tap to stop"
              : "Tap to start recording"}
        </Text>
      </TouchableOpacity>

      {recordedUri && !isRecording && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => router.push({
              pathname: './audio-player',
              params: { audioUri: recordedUri || '' }
            })}
          >
            <MaterialIcons name="play-arrow" size={24} color="white" />
            <Text style={styles.playButtonText}>Listen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={navigateToDetailedReport}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={24} color="#8A4FFF" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={handleEmergencyExit}
        accessibilityLabel="Emergency exit button"
        accessibilityHint="Immediately closes the app and clears history"
      >
        <Text style={styles.emergencyText}>EXIT NOW</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'flex-end',
    paddingVertical: 16,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0D0FF',
  },
  skipText: {
    color: '#8A4FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    maxWidth: '80%',
    alignSelf: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0e6ff', // Light purple background
    borderWidth: 2,
    borderColor: '#8A4FFF',
    marginBottom: 16,
    shadowColor: "#8A4FFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  recordingSaved: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 20,
    justifyContent: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8A4FFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  playButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#8A4FFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  continueButtonText: {
    color: '#8A4FFF',
    fontWeight: '600',
  },
  emergencyButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 3,
  },
  emergencyText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});