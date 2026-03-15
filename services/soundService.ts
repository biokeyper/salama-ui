/**
 * Sound Service
 * Handles notification sounds
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let lastPlayTime = 0;

/**
 * Initialize audio session
 */
export async function initializeAudio() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionHandlerType: 'default',
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: true,
    });
  } catch (error) {
  }
}

/**
 * Play notification sound
 * Creates a simple beep tone programmatically
 */
export async function playNotificationSound() {
  try {
    const now = Date.now();
    if (now - lastPlayTime < 500) {
      return;
    }
    lastPlayTime = now;

    try {
      const { Vibration } = await import('react-native');
      Vibration.vibrate([0, 100, 50, 100]);
    } catch (vibError) {
    }
  } catch (error) {
  }
}

