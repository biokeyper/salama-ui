import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  const quickActions = [
    {
      icon: '🎤',
      label: 'Record',
      description: 'Document an incident',
      route: '/(tabs)/record' as const,
      color: '#8B5CF6'
    },
    {
      icon: '📚',
      label: 'Library',
      description: 'View your reports',
      route: '/(tabs)/audio-player' as const,
      color: '#EC4899'
    },
    {
      icon: '🌍',
      label: 'Explore',
      description: 'Find support',
      route: '/(tabs)/explore' as const,
      color: '#14B8A6'
    },
  ];

  // Pulsating Heart Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://www.biokeyper.com/privacy-policy');
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F5F3FF', dark: '#1F1B2E' }}
      headerImage={
        <View style={styles.headerWaveContainer}>
          <HelloWave />
        </View>
      }>

      {/* Welcome Section */}
      <ThemedView style={styles.welcomeSection}>
        <ThemedText type="title" style={styles.welcomeTitle}>
          Welcome back, Msichana!
        </ThemedText>
        <View style={styles.heartContainer}>
          <ThemedText style={styles.welcomeSubtitle}>
            You're safe here{' '}
          </ThemedText>
          <Animated.Text style={[styles.heartEmoji, { transform: [{ scale: pulseAnim }] }]}>
            ❤️
          </Animated.Text>
        </View>
      </ThemedView>

      {/* Check-in */}
      <ThemedView style={styles.checkInSection}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          How are you feeling today?
        </ThemedText>
        <View style={styles.moodRow}>
          {['😊', '😐', '😔', '😰', '😡'].map((emoji, index) => (
            <TouchableOpacity key={index} style={styles.moodButton} onPress={() => router.push('/tracker')}>
              <Text style={styles.moodEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          What would you like to do?
        </ThemedText>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => router.push(action.route)}
            >
              <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.actionLabel}>
                {action.label}
              </ThemedText>
              <ThemedText style={styles.actionDescription}>
                {action.description}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      {/* Safe Space Message */}
      <ThemedView style={styles.messageSection}>
        <View style={styles.messageCard}>
          <Text style={styles.messageIcon}>🛡️</Text>
          <ThemedText style={styles.messageText}>
            This is your safe space. You can record incidents, document your feelings, or just take a moment for yourself.
          </ThemedText>
        </View>
      </ThemedView>

      {/* Privacy Reminder */}
      <ThemedView style={styles.privacySection}>
        <View style={styles.privacyRow}>
          <Text style={styles.privacyIcon}>🔐</Text>
          <ThemedText style={styles.privacyText}>Everything stays on your device</ThemedText>
        </View>
        <View style={styles.privacyRow}>
          <Text style={styles.privacyIcon}>👁️</Text>
          <ThemedText style={styles.privacyText}>Disguised for your safety</ThemedText>
        </View>
      </ThemedView>

      {/* Privacy Policy Link */}
      <TouchableOpacity style={styles.privacyLink} onPress={handlePrivacyPolicy}>
        <ThemedText style={styles.privacyLinkText}>Privacy Policy</ThemedText>
      </TouchableOpacity>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerWaveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  welcomeTitle: {
    fontSize: 28,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  heartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartEmoji: {
    fontSize: 16,
    opacity: 0.8,
  },
  checkInSection: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  moodEmoji: {
    fontSize: 28,
  },
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 11,
    opacity: 0.7,
    textAlign: 'center',
  },
  messageSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  messageIcon: {
    fontSize: 32,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  privacySection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    opacity: 0.7,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privacyIcon: {
    fontSize: 18,
  },
  privacyText: {
    fontSize: 13,
  },
  privacyLink: {
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  privacyLinkText: {
    fontSize: 14,
    color: '#8B5CF6',
    textDecorationLine: 'underline',
  },
});