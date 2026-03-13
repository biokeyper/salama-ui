import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { getAuthToken } from '@/services/authService';

export default function BootScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkBootStatus = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');

        // Add a small delay for the splash screen effect
        setTimeout(() => {
          if (hasSeenOnboarding !== 'true') {
            // Never seen onboarding → go to onboarding
            router.replace('/onboarding');
          } else {
            // Seen onboarding → go to home (whether logged in or not)
            // Auth check happens on protected routes
            router.replace('/(tabs)');
          }
        }, 2000);
      } catch (error) {
        // Still go to home on error - auth checks will catch it
        router.replace('/(tabs)');
      }
    };

    checkBootStatus();
  }, []);

  return (
    <ImageBackground
      source={require('@/assets/images/boot-portrait.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.text}>Loading Salama Msichana...</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  text: { marginTop: 16, fontSize: 18, fontWeight: 'bold', color: '#fff' },
});