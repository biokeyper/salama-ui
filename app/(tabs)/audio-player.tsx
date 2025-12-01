import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  Alert, 
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getAllReports, deleteReport, updateReportStatus } from '@/services/storage';
import { Report } from '@/types/report';
import * as FileSystem from 'expo-file-system';
import AudioReportItem from '@/components/AudioReportItem';

export default function AudioPlayerScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingReportId, setPlayingReportId] = useState<string | null>(null);

  // Load reports on mount and refresh
  const loadReports = async () => {
    try {
      const allReports = await getAllReports();
      // Filter to only show audio or mixed reports
      const audioReports = allReports.filter(
        r => (r.type === 'audio' || r.type === 'mixed') && r.audioUri
      );
      // Sort by most recent first
      audioReports.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReports(audioReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load audio reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);


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
      'Are you sure you want to delete this audio report? This action cannot be undone.',
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


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A4FFF" />
          <Text style={styles.loadingText}>Loading audio reports...</Text>
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
          <Text style={styles.headerTitle}>Audio Reports</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Reports List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadReports} />
          }
        >
          {reports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="mic-off" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No audio reports found</Text>
              <Text style={styles.emptySubtext}>Record an incident to see it here</Text>
            </View>
          ) : (
            reports.map((report) => (
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
});
