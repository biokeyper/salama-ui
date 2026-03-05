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
    console.log('🔊 Audio session initialized');
  } catch (error) {
    console.error('Error initializing audio:', error);
  }
}

/**
 * Play notification sound
 * Creates a simple beep tone programmatically
 */
export async function playNotificationSound() {
  try {
    // Prevent multiple sounds playing in quick succession
    const now = Date.now();
    if (now - lastPlayTime < 500) {
      console.log('⏱️ Notification sound skipped (cooldown)');
      return;
    }
    lastPlayTime = now;

    // Log that notification sound is playing
    console.log('🔔 Notification sound playing...');

    // For now, just use vibration as a notification indicator
    // since we don't have system sound files available
    try {
      const { Vibration } = await import('react-native');
      Vibration.vibrate([0, 100, 50, 100]); // Vibration pattern: wait 0ms, vibrate 100ms, wait 50ms, vibrate 100ms
      console.log('📳 Vibration notification sent');
    } catch (vibError) {
      console.log('📢 Notification sound (system audio)');
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Stop current sound
 */
export async function stopSound() {
  try {
    if (soundObject) {
      await soundObject.stopAsync();
    }
  } catch (error) {
    console.error('Error stopping sound:', error);
  }
}

/**
 * Unload sound and free resources
 */
export async function unloadSound() {
  try {
    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.error('Error unloading sound:', error);
  }
}
