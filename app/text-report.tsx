import React, { useState } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function TextReportScreen() {
  const [report, setReport] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleSubmit = () => {
    if (!report.trim()) {
      Alert.alert('Please enter your report or details.');
      return;
    }
    // Handle saving/submitting the report, possibly with params.audioUri
    Alert.alert('Thank you', 'Your report has been saved.');
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Type your report
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Please describe what happened in your own words. You can write as much or as little as you want.
        </ThemedText>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type your report here..."
          placeholderTextColor="#aaa"
          value={report}
          onChangeText={setReport}
          textAlignVertical="top"
        />
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <ThemedText style={styles.buttonText}>Submit Report</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    minHeight: 120,
    borderColor: '#8A4FFF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 28,
    backgroundColor: '#faf8ff',
    color: '#222',
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