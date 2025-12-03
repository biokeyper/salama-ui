import { Report } from '@/types/report';
import { MaterialIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AudioReportItemProps {
  report: Report;
  isPlaying: boolean;
  onPlayPause: (report: Report) => void;
  onStop: (report: Report) => void;
  onDelete: (report: Report) => void;
  onResubmit: (report: Report) => void;
  onPlayingChange: (reportId: string | null) => void;
}

export default function AudioReportItem({
  report,
  isPlaying,
  onPlayPause,
  onStop,
  onDelete,
  onResubmit,
  onPlayingChange,
}: AudioReportItemProps) {
  // Early return if no audio URI - this shouldn't render in the first place
  if (!report.audioUri) {
    return null;
  }

  const player = useAudioPlayer(report.audioUri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!player || !report.audioUri) return;

    if (isPlaying) {
      if (!player.playing) {
        try {
          player.play();
        } catch (err) {
          console.error('Play failed:', err);
        }
      }
    } else {
      if (player.playing) {
        try {
          player.pause();
        } catch (err) {
          // Ignore - player might be released
        }
      }
    }
  }, [isPlaying, player, report.audioUri]);

  // Auto-stop when playback finishes
  useEffect(() => {
    if (!player) return;

    if (status?.currentTime && status?.duration && status.currentTime >= status.duration) {
      try {
        player.pause();
        player.seekTo(0);
        onPlayingChange(null);
      } catch (err) {
        onPlayingChange(null);
      }
    }
  }, [status?.currentTime, status?.duration, player, onPlayingChange]);

  // Cleanup on unmount - but don't manually release, expo-audio handles it
  useEffect(() => {
    return () => {
      if (!player) return;
      try {
        if (player.playing) {
          player.pause();
        }
      } catch (err) {
        // Player already released, ignore
      }
    };
  }, [player]);

  const handleStopClick = async () => {
    if (!player) return;
    try {
      if (player.playing) {
        player.pause();
      }
      player.seekTo(0);
      onPlayingChange(null);
    } catch (error) {
      console.error('Stop error:', error);
      onPlayingChange(null);
    }
  };

  const seekBackward = () => {
    if (!player || !status) return;
    try {
      const newTime = Math.max(0, status.currentTime - 10);
      player.seekTo(newTime);
    } catch (err) {
      console.error('Seek backward failed:', err);
    }
  };

  const seekForward = () => {
    if (!player || !status) return;
    try {
      const newTime = Math.min(status.duration, status.currentTime + 10);
      player.seekTo(newTime);
    } catch (err) {
      console.error('Seek forward failed:', err);
    }
  };

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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

  const getStatusColor = (status: Report['status']): string => {
    switch (status) {
      case 'submitted':
        return '#4CAF50';
      case 'failed':
        return '#FF3B30';
      case 'saved':
        return '#FFA500';
      case 'draft':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: Report['status']): string => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'failed':
        return 'Failed';
      case 'saved':
        return 'Saved';
      case 'draft':
        return 'Draft';
      default:
        return 'Unknown';
    }
  };

  const position = status?.currentTime || 0;
  // Use stored duration if player duration is not yet available (lazy loading)
  // audioDuration is stored in milliseconds, convert to seconds to match status.duration
  const duration = status?.duration || (report.audioDuration ? report.audioDuration / 1000 : 0);
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.reportCard}>
      {/* Report Header */}
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(report.status) }
              ]}
            >
              <Text style={styles.statusText}>{getStatusLabel(report.status)}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(report)}
        >
          <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Playback Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={seekBackward} style={styles.seekButton}>
          <MaterialIcons name="replay-10" size={28} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => onPlayPause(report)}
        >
          <MaterialIcons
            name={isPlaying ? "pause-circle-filled" : "play-circle-filled"}
            size={48}
            color="#8A4FFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleStopClick}
        >
          <MaterialIcons name="stop-circle" size={48} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity onPress={seekForward} style={styles.seekButton}>
          <MaterialIcons name="forward-10" size={28} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.timeInfoContainer}>
        <Text style={styles.timeText}>
          {formatTime(position)} / {formatTime(duration > 0 ? duration : null)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Submission Status and Resubmit */}
      {(report.status === 'failed' || report.status === 'saved') && (
        <View style={styles.submissionContainer}>
          {report.status === 'failed' && report.submissionError && (
            <Text style={styles.errorText}>{report.submissionError}</Text>
          )}
          <TouchableOpacity
            style={styles.resubmitButton}
            onPress={() => onResubmit(report)}
          >
            <MaterialIcons name="refresh" size={20} color="#8A4FFF" />
            <Text style={styles.resubmitText}>Resubmit</Text>
          </TouchableOpacity>
        </View>
      )}

      {report.status === 'submitted' && report.submittedAt && (
        <View style={styles.submittedContainer}>
          <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.submittedText}>
            Submitted on {formatDate(report.submittedAt)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reportCard: {
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 12,
  },
  controlButton: {
    // Main play/pause button
  },
  seekButton: {
    padding: 8,
  },
  timeInfoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8A4FFF',
    borderRadius: 2,
  },
  submissionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#FF3B30',
    marginRight: 8,
  },
  resubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8A4FFF',
    gap: 6,
  },
  resubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A4FFF',
  },
  submittedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 6,
  },
  submittedText: {
    fontSize: 12,
    color: '#4CAF50',
  },
});
