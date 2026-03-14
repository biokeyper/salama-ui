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
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/services/authService';
import AuthGateModal from '@/components/AuthGateModal';
import * as Location from 'expo-location';

export default function TextReportScreen() {
  const [report, setReport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingLocally, setIsSavingLocally] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const audioUri = params.audioUri as string | undefined;
  const editReportId = params.editReportId as string | undefined;

  // Check if user is logged in - if not, show auth gate
  useEffect(() => {
    if (!user) {
      setShowAuthGate(true);
    }
  }, [user]);

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

    setIsSubmitting(true);
    try {
      await saveReport({
        ...editingReport,
        textContent: report.trim(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Report updated successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    // Check if user is logged in
    if (!user) {
      setShowAuthGate(true);
      return;
    }

    if (!report.trim()) {
      Alert.alert('Please enter your report or details.');
      return;
    }

    setIsSavingLocally(true);
    try {
      const reportType: ReportType = audioUri ? 'mixed' : 'text';
      const now = new Date().toISOString();
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await saveReport({
        id: reportId,
        ...(user?.userId && { userId: user.userId }),
        type: reportType,
        status: 'saved',
        textContent: report.trim(),
        audioUri: audioUri || undefined,
        createdAt: now,
        updatedAt: now,
      });

      Alert.alert('Success', 'Your draft has been saved.', [
        {
          text: 'OK',
          onPress: () => {
            // Clear input and stay on same page
            setReport('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save your report. Please try again.');
    } finally {
      setIsSavingLocally(false);
    }
  };

  const handleSubmitToBackend = async () => {
    if (!report.trim()) {
      Alert.alert('Please enter your report or details.');
      return;
    }

    // Check authentication BEFORE allowing submission
    const token = await getAuthToken();
    if (!token || !user) {
      setShowAuthGate(true);
      return;
    }

    // Show confirmation modal
    Alert.alert(
      'Submit Report?',
      'Are you sure you want to submit this report?',
      [
        {
          text: 'Cancel',
          onPress: () => {
            // Do nothing, stay on page
          },
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async () => {
            await performSubmission();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const performSubmission = async () => {
    setIsSubmitting(true);
    try {
      const reportType: ReportType = audioUri ? 'mixed' : 'text';
      const now = new Date().toISOString();
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;


      // Capture location if available
      let metadata: any = {};
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const mapLink = `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            mapLink,
            timestamp: new Date().toISOString(),
          };

          metadata.location = JSON.stringify(locationData);
        } else {
        }
      } catch (locError) {
        // Continue without location if permission denied or GPS fails
      }

      // First save locally
      const savedReport = await saveReport({
        id: reportId,
        ...(user?.userId && { userId: user.userId }),
        type: reportType,
        status: 'saved',
        textContent: report.trim(),
        audioUri: audioUri || undefined,
        createdAt: now,
        updatedAt: now,
        metadata,
      });

      // Then submit to backend
      const result = await submitReportToBackend(savedReport);


      if (result.success) {
        Alert.alert(
          'Success',
          'Your report has been submitted successfully.',
          [
            {
              text: 'OK',
              onPress: async () => {
                router.replace('/');
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
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1 }}>
        {/* Show auth gate - user must log in to continue */}
        <AuthGateModal
          visible={showAuthGate}
          onClose={() => {
            // Close modal and redirect back
            router.back();
          }}
        />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ThemedView style={styles.container}>
          {!editingReport && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => router.navigate('/record')}
            >
              <ThemedText style={styles.toggleButtonText}>🎤 Record</ThemedText>
            </TouchableOpacity>
          )}
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
                  style={[styles.button, styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                >
                  <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                  onPress={handleUpdate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Update Report</ThemedText>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton, isSavingLocally && styles.buttonDisabled]}
                  onPress={handleSaveDraft}
                  disabled={isSavingLocally || isSubmitting}
                >
                  {isSavingLocally ? (
                    <ActivityIndicator color="#8A4FFF" />
                  ) : (
                    <ThemedText style={styles.secondaryButtonText}>Save Draft</ThemedText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                  onPress={handleSubmitToBackend}
                  disabled={isSubmitting || isSavingLocally}
                >
                  {isSubmitting ? (
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
    </>
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
  toggleButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8A4FFF',
  },
  toggleButtonText: {
    color: '#8A4FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});