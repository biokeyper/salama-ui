import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

export default function BootScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 5000);

    return () => clearTimeout(timer);
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