import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

export default function RecordPastScreen() {
  const router = useRouter();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }
    })();
    // Clean up on unmount
    return () => {
      audioRecorder.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      setIsRecording(false);
      setRecordedUri(audioRecorder.uri ?? null);
      console.log('Recording saved to:', audioRecorder.uri);
    } catch (err) {
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const handleEmergencyExit = () => {
    Alert.alert(
      'Exit immediately?',
      'The app will close and your history will be cleared.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Exit Now',
          style: 'destructive',
          onPress: () => {
            // Clear any recordings
            if (recordedUri) {
              FileSystem.deleteAsync(recordedUri).catch(() => {});
            }
            router.replace('./fake-calculator');
          },
        },
      ],
      { cancelable: false }
    );
  };

  const navigateToDetailedReport = () => {
    router.push({
      pathname: '../safety-check',
      params: { audioUri: recordedUri || '' }
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with skip option */}
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToDetailedReport}>
          <Text style={styles.skipText}>Skip and type instead</Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.title}>Record what happened in the past</Text>
        <Text style={styles.subtitle}>You can describe what happened in your own words, in your own voice.</Text>
        
        {/* Recording UI */}
        <TouchableOpacity 
          style={styles.recordingButton}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={!!recordedUri}
        >
          {recordedUri ? (
            <View style={styles.recordingSaved}>
              <Feather name="check-circle" size={48} color="#4CAF50" />
              <Text style={styles.recordingText}>Recording saved</Text>
            </View>
          ) : (
            <>
              <Feather 
                name={isRecording ? "mic" : "mic-off"} 
                size={48} 
                color={isRecording ? "#FF3B30" : "#8A4FFF"} 
              />
              <Text style={styles.recordingText}>
                {isRecording ? "Recording... Tap to stop" : "Tap to start recording"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Playback and continue options */}
        {recordedUri && (
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
      </View>

      {/* Emergency exit button */}
      <TouchableOpacity 
        style={styles.emergencyButton}
        onPress={handleEmergencyExit}
        accessibilityLabel="Emergency exit button"
        accessibilityHint="Immediately closes the app and clears history"
      >
        <Text style={styles.emergencyText}>EXIT NOW</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  header: {
    width: '100%',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  skipText: {
    color: '#8A4FFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    maxWidth: '80%',
  },
  recordingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderWidth: 2,
    borderColor: '#8A4FFF',
    borderRadius: 20,
    borderStyle: 'dashed',
    width: '80%',
  },
  recordingSaved: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 20,
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