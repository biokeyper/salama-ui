import LockScreen from '@/app/lock-screen';
import AudioReportItem from '@/components/AudioReportItem';
import { hasPin } from '@/services/security';
import { deleteReport, getAllReports, updateReportStatus, archiveReport } from '@/services/storage';
import { submitReportToBackend, archiveReportOnBackend } from '@/services/api';
import { startStatusPolling } from '@/services/statusPoller';
import { Report } from '@/types/report';
import { getAvailableActions } from '@/utils/reportActions';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LibraryScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingReportId, setPlayingReportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audio' | 'text'>('audio');
  const [showPinRequired, setShowPinRequired] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Check PIN status every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const checkPinStatus = async () => {
        const pinIsSet = await hasPin();
        if (!pinIsSet) {
          // No PIN set - show modal to set PIN
          setShowPinRequired(true);
          setIsAuthenticated(false);
        } else {
          // PIN exists - require verification
          setShowPinVerify(true);
          setIsAuthenticated(false);
        }
      };
      checkPinStatus();

      // Reset authentication and stop audio when leaving the screen
      return () => {
        setIsAuthenticated(false);
        setPlayingReportId(null);
      };
    }, [])
  );

  const handlePinVerified = () => {
    setShowPinVerify(false);
    setIsAuthenticated(true);
  };

  // Load reports on mount and refresh
  const loadReports = async () => {
    try {
      const allReports = await getAllReports();

      // Filter based on archived status
      const filteredReports = showArchived
        ? allReports.filter(r => r.isArchived)
        : allReports.filter(r => !r.isArchived);

      // Sort by most recent first
      filteredReports.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReports(filteredReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Only load reports if user is authenticated
    if (isAuthenticated) {
      loadReports();
    }
  }, [isAuthenticated, showArchived]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (activeTab === 'audio') {
        return (r.type === 'audio' || r.type === 'mixed') && r.audioUri;
      } else {
        return r.type === 'text' || (r.type === 'mixed' && r.textContent);
      }
    });
  }, [reports, activeTab]);

  const handlePlayPause = (report: Report) => {
    // If clicking on a different report, stop the currently playing one
    if (playingReportId && playingReportId !== report.id) {
      setPlayingReportId(null);
    }

    if (!report.audioUri) {
      return;
    }

    try {
      if (playingReportId === report.id) {
        setPlayingReportId(null);
      } else {
        setPlayingReportId(report.id);
      }
    } catch (error) {
      console.error('Playback error:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleStop = async (report: Report) => {
    // Stop is handled in AudioReportItem component
    setPlayingReportId(null);
  };

  const handleDelete = (report: Report) => {
    const actions = getAvailableActions(report);

    if (!actions.canDelete) {
      Alert.alert(
        'Cannot Delete',
        actions.message || 'This report cannot be deleted. You can archive it instead.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop playback if playing
              if (playingReportId === report.id) {
                setPlayingReportId(null);
              }

              // Delete audio file if it exists
              if (report.audioUri) {
                try {
                  await FileSystem.deleteAsync(report.audioUri);
                } catch (error) {
                  console.error('Error deleting audio file:', error);
                }
              }

              // Delete report from storage (local only)
              await deleteReport(report.id);

              // Reload reports
              await loadReports();

              Alert.alert('Success', 'Report deleted successfully');
            } catch (error) {
              console.error('Error deleting report:', error);
              Alert.alert('Error', 'Failed to delete report');
            }
          },
        },
      ]
    );
  };

  const handleResubmit = async (report: Report) => {
    Alert.alert(
      'Submit Report',
      'This will encrypt and submit your report to the backend. It will be stored on IPFS and timestamped on the blockchain.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              const result = await submitReportToBackend(report);

              if (result.success) {
                Alert.alert(
                  'Success',
                  `Report submitted successfully.\nSubmission ID: ${result.submissionId}\nIPFS Hash: ${result.ipfsHash || 'Pending'}`,
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        await loadReports();
                        // Start polling for blockchain confirmation
                        if (result.submissionId) {
                          startStatusPolling(result.submissionId);
                        }
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Submission Failed',
                  result.error || 'Failed to submit report. Please try again.',
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        await loadReports();
                      },
                    },
                  ]
                );
              }
            } catch (error) {
              console.error('Error submitting report:', error);
              Alert.alert('Error', 'An unexpected error occurred while submitting the report');
              await loadReports();
            }
          },
        },
      ]
    );
  };

  const handleArchive = (report: Report) => {
    const actions = getAvailableActions(report);

    if (!actions.canArchive) {
      Alert.alert(
        'Cannot Archive',
        actions.message || 'This report cannot be archived',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Archive Report',
      'Archiving will hide this report from your library but keep the blockchain record.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              // Archive on backend (for submitted reports with submissionId)
              if (report.submissionId) {
                const result = await archiveReportOnBackend(report.submissionId, 'User archived');
                if (!result.success) {
                  Alert.alert('Error', result.error || 'Failed to archive on backend');
                  return;
                }
              }

              // Archive locally
              await archiveReport(report.id, 'User archived');
              await loadReports();
              Alert.alert('Success', 'Report archived successfully');
            } catch (error) {
              console.error('Error archiving report:', error);
              Alert.alert('Error', 'Failed to archive report');
            }
          },
        },
      ]
    );
  };

  const handleEditReport = (report: Report) => {
    const actions = getAvailableActions(report);

    if (!actions.canEdit) {
      Alert.alert(
        'Cannot Edit',
        actions.message || 'This report cannot be edited',
        [{ text: 'OK' }]
      );
      return;
    }

    if (report.type === 'text' || report.type === 'mixed') {
      router.push({
        pathname: '/text-report',
        params: { editReportId: report.id },
      });
    } else {
      Alert.alert('Note', 'Audio reports cannot be edited yet');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Only show loading spinner if authenticated (not during PIN entry)
  if (loading && isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A4FFF" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#8A4FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{showArchived ? 'Archived' : 'Library'}</Text>
          <TouchableOpacity
            onPress={() => setShowArchived(!showArchived)}
            style={styles.archiveToggleButton}
          >
            <MaterialIcons
              name={showArchived ? 'inbox' : 'archive'}
              size={24}
              color="#8A4FFF"
            />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'audio' && styles.activeTab]}
            onPress={() => setActiveTab('audio')}
          >
            <Text style={[styles.tabText, activeTab === 'audio' && styles.activeTabText]}>Audio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'text' && styles.activeTab]}
            onPress={() => setActiveTab('text')}
          >
            <Text style={[styles.tabText, activeTab === 'text' && styles.activeTabText]}>Text Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadReports} />
          }
        >
          {filteredReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name={activeTab === 'audio' ? "mic-off" : "file-text"} size={64} color="#CCC" />
              <Text style={styles.emptyText}>No {activeTab} reports found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'audio' ? "Record an incident to see it here" : "Create a text report to see it here"}
              </Text>
            </View>
          ) : (
            <>
              {activeTab === 'audio' ? (
                filteredReports.map((report) => (
                  <AudioReportItem
                    key={report.id}
                    report={report}
                    isPlaying={playingReportId === report.id}
                    onPlayPause={handlePlayPause}
                    onStop={handleStop}
                    onDelete={handleDelete}
                    onResubmit={handleResubmit}
                    onPlayingChange={setPlayingReportId}
                    onArchive={handleArchive}
                    onEdit={handleEditReport}
                  />
                ))
              ) : (
                filteredReports.map((report) => (
                  <View key={report.id} style={styles.textReportItem}>
                    <View style={styles.textReportHeader}>
                      <Text style={styles.textReportDate}>{formatDate(report.createdAt)}</Text>
                      <TouchableOpacity onPress={() => handleDelete(report)}>
                        <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.textReportContent} numberOfLines={3}>
                      {report.textContent || 'No content'}
                    </Text>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => {
                        // Navigate to detail view (to be implemented)
                        Alert.alert('Report Details', report.textContent || 'No content');
                      }}
                    >
                      <Text style={styles.viewButtonText}>View Full Report</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Blur overlay when PIN modal is shown */}
      {(showPinRequired || showPinVerify) && (
        <BlurView
          intensity={90}
          style={StyleSheet.absoluteFill}
          tint="dark"
        />
      )}

      {/* PIN Required Modal */}
      <Modal
        visible={showPinRequired}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Feather name="lock" size={60} color="#8B5CF6" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>PIN Required</Text>
            <Text style={styles.modalMessage}>
              To protect your privacy and sensitive data, you must set a PIN before accessing the library.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPinRequired(false);
                router.push('/settings');
              }}
            >
              <Text style={styles.modalButtonText}>Set PIN Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowPinRequired(false);
                router.back();
              }}
            >
              <Text style={styles.modalCancelText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN Verification Modal */}
      <Modal
        visible={showPinVerify}
        animationType="slide"
        transparent={false}
      >
        <LockScreen
          mode="verify"
          onUnlock={handlePinVerified}
          onSetPin={() => { }}
        />
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={() => {
            setShowPinVerify(false);
            router.back();
          }}
        >
          <Feather name="x" size={24} color="#666" />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  archiveToggleButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  activeTab: {
    backgroundColor: '#8A4FFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  textReportItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  textReportDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  textReportContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  viewButton: {
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    color: '#8A4FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '90%',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#999',
    fontSize: 14,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
});
