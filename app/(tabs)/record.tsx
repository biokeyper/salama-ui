import { useBackgroundRecording } from '@/contexts/BackgroundRecordingContext';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioRecorder, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { saveReport } from '../../services/storage';
import { submitReportToBackend } from '@/services/api';
import { startStatusPolling } from '@/services/statusPoller';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/services/authService';
import AuthGateModal from '@/components/AuthGateModal';

export default function RecordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStopping, setIsStopping] = useState(false); // Prevent multiple stop calls
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const { enterDecoyMode } = useBackgroundRecording();

  // Audio player for listening to recorded audio
  // Must call hooks unconditionally - use a fallback URI if recordedUri is not set
  const audioPlayer = useAudioPlayer(recordedUri || '', { updateInterval: 100 });
  const playerStatus = useAudioPlayerStatus(audioPlayer);

  // Animation value for pulsing effect
  const pulseScale = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  // Check if user is logged in - if not, show auth gate
  useEffect(() => {
    if (!user) {
      setShowAuthGate(true);
    }
  }, [user]);

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

  // Handle audio playback
  useEffect(() => {
    if (!audioPlayer || !recordedUri) return;

    if (isPlayingRecording) {
      try {
        if (!audioPlayer.playing) {
          audioPlayer.play();
        }
      } catch (err) {
        setIsPlayingRecording(false);
      }
    } else {
      try {
        if (audioPlayer.playing) {
          audioPlayer.pause();
        }
      } catch (err) {
        // Player already released
      }
    }
  }, [isPlayingRecording, audioPlayer, recordedUri]);

  // Auto-stop when playback finishes
  useEffect(() => {
    if (!audioPlayer || !playerStatus || !recordedUri) return;

    if (playerStatus.currentTime && playerStatus.duration && playerStatus.currentTime >= playerStatus.duration) {
      try {
        audioPlayer.pause();
        audioPlayer.seekTo(0);
        setIsPlayingRecording(false);
      } catch (err) {
        setIsPlayingRecording(false);
      }
    }
  }, [playerStatus?.currentTime, playerStatus?.duration, audioPlayer, recordedUri]);

  const startRecording = async () => {
    // No auth check - users can record offline!
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
      const endTime = Date.now();
      const durationMs = recordingStartTime ? (endTime - recordingStartTime) : 0;

      setIsRecording(false);
      const uri = audioRecorder.uri ?? null;
      setRecordedUri(uri);

      if (uri) {
        try {
          const now = new Date().toISOString();
          const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const savedReport = await saveReport({
            id: reportId,
            ...(user?.userId && { userId: user.userId }),
            type: 'audio',
            status: 'saved',
            audioUri: uri,
            audioDuration: durationMs, // Save duration in milliseconds
            createdAt: now,
            updatedAt: now,
          });
          setReportId(savedReport.id);
        } catch (error) {
          // Silently ignore auto-save errors
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
      setShowAuthGate(true);
      return;
    }

    if (isExiting) return;
    setIsExiting(true);

    // 1. Stop recording if active (use stopRecording to avoid duplicate stop calls)
    if (isRecording && !isStopping) {
      try {
        await stopRecording();
      } catch (error) {
        // Silently ignore stop errors on emergency exit
      }
    } else if (recordedUri && !reportId) {
      // If stopped but not yet saved (rare race condition), try to save
      try {
        const now = new Date().toISOString();
        const tempReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await saveReport({
          id: tempReportId,
          ...(user?.userId && { userId: user.userId }),
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
      // Fallback: try to navigate even if context update fails or something else happens
      router.replace('/fake-calculator');
    }
  };

  const handleSaveDraft = async () => {
    // Check if user is logged in
    if (!user) {
      setShowAuthGate(true);
      return;
    }

    if (!recordedUri) {
      Alert.alert('Error', 'No recording available');
      return;
    }

    setIsSavingDraft(true);
    try {
      // If report was already auto-saved when recording stopped, just clear it
      if (reportId) {
        Alert.alert('Success', 'Your draft has been saved.', [
          {
            text: 'OK',
            onPress: () => {
              // Clear recording and stay on page
              setRecordedUri(null);
              setReportId(null);
            },
          },
        ]);
        setIsSavingDraft(false);
        return;
      }

      // Otherwise save the report locally (in case auto-save failed)
      const now = new Date().toISOString();
      const draftReportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const savedReport = await saveReport({
        id: draftReportId,
        ...(user?.userId && { userId: user.userId }),
        type: 'audio',
        status: 'saved',
        audioUri: recordedUri,
        createdAt: now,
        updatedAt: now,
      });

      Alert.alert('Success', 'Your draft has been saved.', [
        {
          text: 'OK',
          onPress: () => {
            // Clear recording and stay on page
            setRecordedUri(null);
            setReportId(null);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!recordedUri || !reportId) {
      Alert.alert('Error', 'Recording not available');
      return;
    }

    // Check authentication BEFORE allowing submission
    const token = await getAuthToken();
    if (!token || !user) {
      setShowAuthGate(true);
      return;
    }

    // Show confirmation modal first
    Alert.alert(
      'Submit Report?',
      'Are you sure you want to submit this report?',
      [
        {
          text: 'Cancel',
          onPress: () => {
            // Do nothing, stay on page
          },
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async () => {
            await performSubmission();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const performSubmission = async () => {
    setIsSubmitting(true);
    try {
      // Get the saved report for submission
      const { getReportById } = require('@/services/storage');
      const report = await getReportById(reportId);

      if (!report) {
        Alert.alert('Error', 'Report not found');
        return;
      }


      // Capture location if available
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const mapLink = `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            mapLink,
            timestamp: new Date().toISOString(),
          };


          // Add location to report metadata
          if (!report.metadata) {
            report.metadata = {};
          }
          report.metadata.location = JSON.stringify(locationData);
        } else {
        }
      } catch (locError) {
        // Continue without location if permission denied or GPS fails
      }

      const result = await submitReportToBackend(report);


      if (result.success) {
        Alert.alert(
          'Success',
          'Your recording has been submitted to the backend securely.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Delete the old local draft (frontend-generated ID)
                if (reportId) {
                  try {
                    const { deleteReport } = require('@/services/storage');
                    await deleteReport(reportId);
                  } catch (deleteError) {
                    // Continue anyway - backend report is what matters
                  }
                }

                if (result.submissionId) {
                  startStatusPolling(result.submissionId);
                }
                router.replace('/(tabs)');
              },
            },
          ]
        );
      } else if (result.requiresAuth) {
        // Authentication required - redirect to login
        Alert.alert(
          'Login Required',
          'You need to be logged in to submit reports.',
          [
            {
              text: 'Login',
              onPress: () => {
                router.navigate('/login');
              },
            },
            {
              text: 'Sign Up',
              onPress: () => {
                router.navigate('/signup');
              },
            },
            {
              text: 'Cancel',
              onPress: () => {
                // Recording stays saved locally
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Submission Error',
          result.error || 'Failed to submit. Your recording has been saved locally.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(tabs)');
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'An error occurred. Your recording has been saved locally.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } finally {
      setIsSubmitting(false);
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
          ...(user?.userId && { userId: user.userId }),
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
      pathname: '../safety-check',
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
        <TouchableOpacity onPress={() => router.navigate('/text-report')} style={styles.skipButton}>
          <Text style={styles.skipText}>📝 Type Instead</Text>
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
        <>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => setIsPlayingRecording(!isPlayingRecording)}
            >
              <MaterialIcons
                name={isPlayingRecording ? "pause" : "play-arrow"}
                size={24}
                color="white"
              />
              <Text style={styles.playButtonText}>{isPlayingRecording ? 'Pause' : 'Listen'}</Text>
            </TouchableOpacity>
          </View>

          {playerStatus && (
            <View style={styles.playbackProgressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        playerStatus.duration && playerStatus.duration > 0
                          ? (playerStatus.currentTime / playerStatus.duration) * 100
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.playbackTime}>
                {Math.floor((playerStatus.currentTime || 0) / 1000)}s / {Math.floor((playerStatus.duration || 0) / 1000)}s
              </Text>
            </View>
          )}
        </>
      )}

      {recordedUri && !isRecording && (
        <View style={styles.submissionButtons}>
          <TouchableOpacity
            style={[styles.draftButton, isSavingDraft && styles.buttonDisabled]}
            onPress={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting}
          >
            {isSavingDraft ? (
              <ActivityIndicator color="#8A4FFF" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#8A4FFF" />
                <Text style={styles.draftButtonText}>Save Draft</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmitReport}
            disabled={isSubmitting || isSavingDraft}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="cloud-upload" size={20} color="white" />
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </>
            )}
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
  playbackProgressContainer: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8A4FFF',
    borderRadius: 2,
  },
  playbackTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  submissionButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
    paddingHorizontal: 16,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#8A4FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  draftButtonText: {
    color: '#8A4FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8A4FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});