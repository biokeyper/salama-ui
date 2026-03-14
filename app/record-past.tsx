import { useBackgroundRecording } from '@/contexts/BackgroundRecordingContext';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveReport } from '../services/storage';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateModal from '@/components/AuthGateModal';

export default function RecordPastScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false); // Prevent multiple stop calls
  const [showAuthGate, setShowAuthGate] = useState(false);
  const { enterDecoyMode } = useBackgroundRecording();

  // Check if user is logged in - if not, show auth gate
  useEffect(() => {
    if (!user) {
      console.log('[RECORD-PAST] User not logged in - showing auth gate');
      setShowAuthGate(true);
    }
  }, [user]);

  // Animation value for pulsing effect
  const pulseScale = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1, // Infinite repeat
        true // Reverse
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isRecording]);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }
    })();
    // No manual cleanup needed - expo-audio handles it
  }, []);

  const startRecording = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setReportId(null); // Reset report ID for new recording
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      // Prevent multiple simultaneous stop calls
      if (isStopping || !isRecording) {
        return;
      }

      setIsStopping(true);

      // Verify recorder exists and hasn't been released
      if (!audioRecorder) {
        setIsRecording(false);
        setIsStopping(false);
        return;
      }

      await audioRecorder.stop();
      setIsRecording(false);
      const uri = audioRecorder.uri ?? null;
      setRecordedUri(uri);

      if (uri) {
        try {
          const now = new Date().toISOString();
          const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const savedReport = await saveReport({
            id: reportId,
            type: 'audio',
            status: 'saved',
            audioUri: uri,
            createdAt: now,
            updatedAt: now,
          });
          setReportId(savedReport.id);
        } catch (error) {
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save recording');
    } finally {
      setIsStopping(false);
    }
  };

  const handleEmergencyExit = async () => {
    // Check if user is logged in before allowing emergency exit
    if (!user) {
      console.log('[RECORD-PAST] Cannot use emergency exit - user not logged in');
      setShowAuthGate(true);
      return;
    }

    // 1. Stop recording if active (use stopRecording to avoid duplicate stop calls)
    if (isRecording && !isStopping) {
      try {
        await stopRecording();
      } catch (error) {
      }
    } else if (recordedUri && !reportId) {
      // If stopped but not yet saved (rare race condition), try to save
      try {
        const now = new Date().toISOString();
        const tempReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await saveReport({
          id: tempReportId,
          type: 'audio',
          status: 'saved',
          audioUri: recordedUri,
          createdAt: now,
          updatedAt: now,
        });
      } catch (error) {
      }
    }

    // 3. Enter decoy mode and navigate
    try {
      enterDecoyMode();
      router.replace('/fake-calculator');
    } catch (error) {
      // Fallback
      router.replace('/fake-calculator');
    }
  };

  const navigateToDetailedReport = async () => {
    // If we haven't saved yet (e.g. auto-save failed), try again
    let currentReportId = reportId;

    if (recordedUri && !currentReportId) {
      try {
        const now = new Date().toISOString();
        const tempReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const savedReport = await saveReport({
          id: tempReportId,
          type: 'audio',
          status: 'saved',
          audioUri: recordedUri,
          createdAt: now,
          updatedAt: now,
        });
        currentReportId = savedReport.id;
      } catch (error) {
        // Continue navigation even if save fails
      }
    }

    router.push({
      pathname: './safety-check',
      params: {
        audioUri: recordedUri || '',
        reportId: currentReportId || ''
      }
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Show auth gate - user must log in to continue */}
        <AuthGateModal
          visible={showAuthGate}
          onClose={() => {
            // Close modal and redirect back
            router.back();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToDetailedReport} style={styles.skipButton}>
          <Feather name="edit-3" size={16} color="#8A4FFF" />
          <Text style={styles.skipText}>Skip and type instead</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Record what happened in the past</Text>
      <Text style={styles.subtitle}>You can describe what happened in your own words, in your own voice.</Text>

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
              pathname: '/(tabs)/audio-player',
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