import React from 'react';
import { View, StyleSheet, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function DetailedReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Please share what happened
        </ThemedText>
        <ThemedText type="title" style={styles.subtitle}>
          in your own words.
        </ThemedText>
        
        <View style={styles.inputOptionsContainer}>
          {/* Voice Input Button */}
          <TouchableOpacity
            style={styles.inputOption}
            onPress={() => router.push({ pathname: '../record-past', params })}
            accessibilityLabel="Voice Input"
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="keyboard-voice" size={36} color="#6C63FF" />
            </View>
            <ThemedText style={styles.optionText}>Voice Input</ThemedText>
          </TouchableOpacity>

          {/* Text Input Button */}
          <TouchableOpacity
            style={styles.inputOption}
            onPress={() => router.push({ pathname: './text-report', params })}
            accessibilityLabel="Text Input"
          >
            <View style={styles.iconContainer}>
              <Feather name="edit" size={36} color="#6C63FF" />
            </View>
            <ThemedText style={styles.optionText}>Text Input</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E3057',
    textAlign: 'center',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E3057',
    textAlign: 'center',
    marginBottom: 60,
  },
  inputOptionsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  inputOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#6C63FF',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3057',
  },
});