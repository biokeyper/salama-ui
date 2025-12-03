import AudioReportItem from '@/components/AudioReportItem';
import { deleteReport, getAllReports, updateReportStatus } from '@/services/storage';
import { Report } from '@/types/report';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

  // Load reports on mount and refresh
  const loadReports = async () => {
    try {
      const allReports = await getAllReports();
      // Sort by most recent first
      allReports.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReports(allReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

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

              // Delete report from storage
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
      'Resubmit Report',
      'This will mark the report for resubmission. Backend submission functionality will be implemented in the future.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark for Resubmission',
          onPress: async () => {
            try {
              await updateReportStatus(report.id, 'saved');
              await loadReports();
              Alert.alert('Success', 'Report marked for resubmission');
            } catch (error) {
              console.error('Error updating report status:', error);
              Alert.alert('Error', 'Failed to update report status');
            }
          },
        },
      ]
    );
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

  if (loading) {
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
          <Text style={styles.headerTitle}>Library</Text>
          <View style={styles.placeholder} />
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
});
