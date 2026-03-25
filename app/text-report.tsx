import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertModal, type AlertType, type AlertButton } from '@/components/AlertModal';
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
import * as Location from 'expo-location';

export default function TextReportScreen() {
  const [report, setReport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingLocally, setIsSavingLocally] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message?: string; buttons?: AlertButton[] }>({
    visible: false,
    type: 'info',
    title: '',
  });
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const audioUri = params.audioUri as string | undefined;
  const editReportId = params.editReportId as string | undefined;


  useEffect(() => {
    if (editReportId) {
      loadReportForEditing(editReportId);
    }
  }, [editReportId]);

  const loadReportForEditing = async (reportId: string) => {
    try {
      const existingReport = await getReportById(reportId);
      if (!existingReport) {
        setAlert({ visible: true, type: 'error', title: 'Error', message: 'Report not found' });
        router.back();
        return;
      }

      // Can only edit draft/saved reports
      const actions = getAvailableActions(existingReport);
      if (!actions.canEdit) {
        setAlert({ visible: true, type: 'error', title: 'Error', message: 'Only draft and saved reports can be edited' });
        router.back();
        return;
      }

      setEditingReport(existingReport);
      setReport(existingReport.textContent || '');
    } catch (error) {
      setAlert({ visible: true, type: 'error', title: 'Error', message: 'Failed to load report' });
      router.back();
    }
  };

  const handleUpdate = async () => {
    if (!report.trim()) {
      setAlert({ visible: true, type: 'error', title: 'Error', message: 'Please enter your report or details.' });
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

      setAlert({ visible: true, type: 'success', title: 'Success', message: 'Report updated successfully' });
      router.back();
    } catch (error) {
      setAlert({ visible: true, type: 'error', title: 'Error', message: 'Failed to update report' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!report.trim()) {
      setAlert({ visible: true, type: 'error', title: 'Error', message: 'Please enter your report or details.' });
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

      setAlert({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Your draft has been saved.',
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              setReport('');
            },
          },
        ],
      });
    } catch (error) {
      setAlert({ visible: true, type: 'error', title: 'Error', message: 'Failed to save your report. Please try again.' });
    } finally {
      setIsSavingLocally(false);
    }
  };

  const handleSubmitToBackend = async () => {
    if (!report.trim()) {
      setAlert({ visible: true, type: 'error', title: 'Error', message: 'Please enter your report or details.' });
      return;
    }

    const token = await getAuthToken();
    if (!token || !user) {
      setAlert({
        visible: true,
        type: 'warning',
        title: 'Sign In Required',
        message: 'You need to sign in to submit reports.',
        buttons: [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign In',
            onPress: () => {
              router.push('/login');
            },
          },
        ],
      });
      return;
    }

    setAlert({
      visible: true,
      type: 'warning',
      title: 'Submit Report?',
      message: 'Are you sure you want to submit this report?',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            await performSubmission();
          },
        },
      ],
    });
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

      const result = await submitReportToBackend(savedReport);


      if (result.success) {
        setAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Your report has been submitted successfully.',
          buttons: [
            {
              text: 'OK',
              onPress: async () => {
                router.replace('/');
              },
            },
          ],
        });
      } else {
        setAlert({
          visible: true,
          type: 'error',
          title: 'Submission Error',
          message: result.error || 'Failed to submit to backend. Your report has been saved locally and can be submitted later.',
          buttons: [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(tabs)');
              },
            },
          ],
        });
      }
    } catch (error) {
      setAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred. Your report has been saved locally.',
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={() => setAlert({ ...alert, visible: false })}
      />
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