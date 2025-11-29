import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

export default function AudioPlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const audioUri = params.audioUri as string | undefined;
  
  const player = useAudioPlayer(audioUri || null, { updateInterval: 100 }); // 100ms update interval
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!audioUri) {
      Alert.alert('Error', 'No audio file found');
      router.back();
      return;
    }

    // Cleanup on unmount
    return () => {
      if (player.playing) {
        player.pause();
      }
    };
  }, [audioUri, player, router]);

  const togglePlayback = () => {
    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const isPlaying = status?.playing || false;
  const position = status?.currentTime || 0;
  const duration = status?.duration || 0;
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#8A4FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Audio Playback</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <View style={styles.playerContainer}>
            {/* Audio icon */}
            <View style={styles.iconContainer}>
              <Feather name="headphones" size={64} color="#8A4FFF" />
            </View>

            {/* Play/Pause button */}
            <TouchableOpacity 
              style={styles.playPauseButton}
              onPress={togglePlayback}
              disabled={!audioUri}
            >
              <MaterialIcons 
                name={isPlaying ? "pause-circle-filled" : "play-circle-filled"} 
                size={80} 
                color="#8A4FFF" 
              />
            </TouchableOpacity>

            {/* Time display */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration > 0 ? duration : null)}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>

            {/* Status text */}
            <Text style={styles.statusText}>
              {!audioUri ? 'No audio available' : isPlaying ? 'Playing...' : 'Paused'}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(138, 79, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  playPauseButton: {
    marginBottom: 30,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8A4FFF',
    borderRadius: 2,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  actions: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
  },
  button: {
    backgroundColor: '#8A4FFF',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

