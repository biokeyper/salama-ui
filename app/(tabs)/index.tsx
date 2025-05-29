import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome, Msichana!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">You Are In Control</ThemedText>
        <ThemedText>
          You are in control of what you choose to share. Your safety and comfort are our top priority throughout this process.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Your Choices Matter</ThemedText>
        <ThemedText>
          You can skip any question that makes you uncomfortable. There are no wrong answers here - only what you feel ready to share.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Safety First</ThemedText>
        <ThemedText>
          Remember, your safety comes first. At any time, you can exit discreetly using the emergency button.
          {Platform.select({
            ios: ' On iOS, shake your device',
            android: ' On Android, press the emergency button',
            web: ' Press F12 for help',
          })}
          {' '}if you need immediate assistance.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});