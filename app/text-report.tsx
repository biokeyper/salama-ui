import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { saveReport, getReportById } from '@/services/storage';
import { submitReportToBackend } from '@/services/api';
import { startStatusPolling } from '@/services/statusPoller';
import { Report, ReportType } from '@/types/report';
import { getAvailableActions } from '@/utils/reportActions';

export default function TextReportScreen() {
  const [report, setReport] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const audioUri = params.audioUri as string | undefined;
  const editReportId = params.editReportId as string | undefined;

  // Load existing report if editing
  useEffect(() => {
    if (editReportId) {
      loadReportForEditing(editReportId);
    }
  }, [editReportId]);

  const loadReportForEditing = async (reportId: string) => {
    try {
      const existingReport = await getReportById(reportId);
      if (!existingReport) {
        Alert.alert('Error', 'Report not found');
        router.back();
        return;
      }

      // Can only edit draft/saved reports
      const actions = getAvailableActions(existingReport);
      if (!actions.canEdit) {
        Alert.alert('Error', 'Only draft and saved reports can be edited');
        router.back();
        return;
      }

      setEditingReport(existingReport);
      setReport(existingReport.textContent || '');
    } catch (error) {
      console.error('Error loading report for editing:', error);
      Alert.alert('Error', 'Failed to load report');
      router.back();
    }
  };

  const handleUpdate = async () => {
    if (!report.trim()) {
      Alert.alert('Please enter your report or details.');
      return;
    }

    if (!editingReport) return;

    setIsProcessing(true);
    try {
      await saveReport({
        id: editingReport.id,
        textContent: report.trim(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Report updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating report:', error);
      Alert.alert('Error', 'Failed to update report');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveLocally = async () => {
    if (!report.trim()) {
      Alert.alert('Please enter your report or details.');
      return;
    }

    setIsProcessing(true);
    try {
      const reportType: ReportType = audioUri ? 'mixed' : 'text';

      await saveReport({
        type: reportType,
        status: 'saved',
        textContent: report.trim(),
        audioUri: audioUri || undefined,
      });

      Alert.alert('Thank you', 'Your report has been saved locally.');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error saving report:', error);
      Alert.alert('Error', 'Failed to save your report. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitToBackend = async () => {
    if (!report.trim()) {
      Alert.alert('Please enter your report or details.');
      return;
    }

    setIsProcessing(true);
    try {
      const reportType: ReportType = audioUri ? 'mixed' : 'text';

      // First save locally
      const savedReport = await saveReport({
        type: reportType,
        status: 'saved',
        textContent: report.trim(),
        audioUri: audioUri || undefined,
      });

      // Then submit to backend
      const result = await submitReportToBackend(savedReport);

      if (result.success) {
        Alert.alert(
          'Success',
          'Your report has been submitted securely to the backend and will be stored on the blockchain.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Start polling for confirmation
                if (result.submissionId) {
                  startStatusPolling(result.submissionId);
                }
                router.replace('/(tabs)');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Submission Error',
          result.error || 'Failed to submit to backend. Your report has been saved locally and can be submitted later.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(tabs)');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Your report has been saved locally.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          {editingReport ? 'Edit your report' : 'Type your report'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {editingReport
            ? 'Update your report with any changes.'
            : 'Please describe what happened in your own words. You can write as much or as little as you want.'}
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
        <View style={styles.buttonContainer}>
          {editingReport ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, isProcessing && styles.buttonDisabled]}
                onPress={() => router.back()}
                disabled={isProcessing}
              >
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isProcessing && styles.buttonDisabled]}
                onPress={handleUpdate}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Update Report</ThemedText>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, isProcessing && styles.buttonDisabled]}
                onPress={handleSaveLocally}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#8A4FFF" />
                ) : (
                  <ThemedText style={styles.secondaryButtonText}>Save Locally</ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isProcessing && styles.buttonDisabled]}
                onPress={handleSubmitToBackend}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Submit Report</ThemedText>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
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
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#8A4FFF',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#8A4FFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#8A4FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});