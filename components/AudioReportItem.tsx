import { Report } from "@/types/report";
import { getAvailableActions } from "@/utils/reportActions";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AudioReportItemProps {
  report: Report;
  isPlaying: boolean;
  isSubmitting?: boolean;
  onPlayPause: (report: Report) => void;
  onStop: (report: Report) => void;
  onDelete: (report: Report) => void;
  onResubmit: (report: Report) => void;
  onPlayingChange: (reportId: string | null) => void;
  onArchive?: (report: Report) => void;
  onEdit?: (report: Report) => void;
  openMenuReportId?: string | null;
  onMenuToggle?: (reportId: string) => void;
  onShare?: (report: Report) => void;
  onViewViewers?: (report: Report) => void;
  onViewDetails?: (report: Report) => void;
}

export default function AudioReportItem({
  report,
  isPlaying,
  isSubmitting = false,
  onPlayPause,
  onStop,
  onDelete,
  onResubmit,
  onPlayingChange,
  onArchive,
  onEdit,
  openMenuReportId,
  onMenuToggle,
  onShare,
  onViewViewers,
  onViewDetails,
}: AudioReportItemProps) {
  const isMenuOpen = openMenuReportId === report.id;

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
        } catch (err) {}
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

    if (
      status?.currentTime &&
      status?.duration &&
      status.currentTime >= status.duration
    ) {
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
      onPlayingChange(null);
    }
  };

  const seekBackward = () => {
    if (!player || !status) return;
    try {
      const newTime = Math.max(0, status.currentTime - 10);
      player.seekTo(newTime);
    } catch (err) {}
  };

  const seekForward = () => {
    if (!player || !status) return;
    try {
      const newTime = Math.min(status.duration, status.currentTime + 10);
      player.seekTo(newTime);
    } catch (err) {}
  };

  const formatTime = (seconds: number | null | undefined): string => {
    if (
      seconds === null ||
      seconds === undefined ||
      isNaN(seconds) ||
      seconds < 0
    )
      return "0:00";
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusDisplay = (): { color: string; label: string } => {
    // Archived reports
    if (report.isArchived) {
      return { color: "#795548", label: "Archived" };
    }

    // Draft or Saved (locally stored, not submitted)
    if (report.status === "draft" || report.status === "saved") {
      return { color: "#FFA500", label: "Draft" };
    }

    // Submitted (sent to backend, waiting for blockchain to process)
    if (report.status === "submitted") {
      return { color: "#2196F3", label: "Submitted" };
    }

    // Pending (blockchain is processing, waiting for confirmations)
    if (report.status === "pending") {
      const confirmations = report.confirmations || 0;
      return {
        color: "#8A4FFF",
        label: `Pending ${confirmations}/12`,
      };
    }

    // Confirmed (blockchain confirmed)
    if (report.status === "confirmed") {
      return { color: "#4CAF50", label: "Confirmed ✓" };
    }

    // Failed (blockchain failed)
    if (report.status === "failed") {
      return { color: "#FF3B30", label: "Failed" };
    }

    return { color: "#9E9E9E", label: "Unknown" };
  };

  const position = status?.currentTime || 0;
  // Use stored duration if player duration is not yet available (lazy loading)
  // audioDuration is stored in milliseconds, convert to seconds to match status.duration
  const duration =
    status?.duration ||
    (report.audioDuration ? report.audioDuration / 1000 : 0);
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={[styles.reportCard, isMenuOpen && styles.reportCardMenuOpen]}>
      {/* Click outside to close menu overlay */}
      {isMenuOpen && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => onMenuToggle?.(report.id)}
        />
      )}

      {/* Report Header */}
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
          <View style={styles.statusContainer}>
            {(() => {
              const statusDisplay = getStatusDisplay();
              return (
                <>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusDisplay.color },
                    ]}
                  >
                    <Text style={styles.statusText}>{statusDisplay.label}</Text>
                  </View>
                </>
              );
            })()}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {(() => {
            const actions = getAvailableActions(report);
            return (
              <>
                {actions.canDelete && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onDelete(report)}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={20}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                )}

                {actions.canRetry && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onResubmit(report)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#8A4FFF" />
                    ) : (
                      <MaterialIcons name="refresh" size={20} color="#8A4FFF" />
                    )}
                  </TouchableOpacity>
                )}

                {report.status === "submitted" && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onMenuToggle?.(report.id)}
                  >
                    <MaterialIcons name="more-vert" size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>

        {/* Dropdown Menu */}
        {report.status === "submitted" && isMenuOpen && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  onMenuToggle?.(report.id);
                  onViewDetails?.(report);
                }}
              >
                <Feather name="eye" size={18} color="#8B5CF6" />
                <Text style={styles.menuOptionText}>View Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  onMenuToggle?.(report.id);
                  onShare?.(report);
                }}
              >
                <Feather name="share-2" size={18} color="#8B5CF6" />
                <Text style={styles.menuOptionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  onMenuToggle?.(report.id);
                  onViewViewers?.(report);
                }}
              >
                <Feather name="users" size={18} color="#8B5CF6" />
                <Text style={styles.menuOptionText}>Viewers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOption, styles.menuOptionDanger]}
                onPress={() => {
                  onArchive?.(report);
                  onMenuToggle?.(report.id);
                }}
              >
                <Feather
                  name={report.isArchived ? "inbox" : "archive"}
                  size={18}
                  color="#FF3B30"
                />
                <Text
                  style={[styles.menuOptionText, styles.menuOptionDangerText]}
                >
                  {report.isArchived ? "Unarchive" : "Archive"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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

      {/* Submission Status and Submit/Resubmit */}
      {(report.status === "failed" || report.status === "saved") && (
        <View style={styles.submissionContainer}>
          {report.status === "failed" && report.submissionError && (
            <Text style={styles.errorText}>{report.submissionError}</Text>
          )}
          <TouchableOpacity
            style={[
              styles.resubmitButton,
              isSubmitting && styles.resubmitButtonDisabled,
            ]}
            onPress={() => onResubmit(report)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#8A4FFF" />
            ) : (
              <>
                <MaterialIcons
                  name={report.status === "saved" ? "cloud-upload" : "refresh"}
                  size={20}
                  color="#8A4FFF"
                />
                <Text style={styles.resubmitText}>
                  {report.status === "saved" ? "Submit" : "Resubmit"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {report.status === "submitted" && report.submittedAt && (
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
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "visible",
  },
  reportCardMenuOpen: {
    zIndex: 999,
    elevation: 50,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    position: "relative",
  },
  reportInfo: {
    flex: 1,
  },
  reportDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionButton: {
    padding: 4,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  progressBarContainer: {
    width: "100%",
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#8A4FFF",
    borderRadius: 2,
  },
  submissionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#FF3B30",
    marginRight: 8,
  },
  resubmitButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#8A4FFF",
    gap: 6,
  },
  resubmitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8A4FFF",
  },
  resubmitButtonDisabled: {
    opacity: 0.6,
  },
  submittedContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 6,
  },
  submittedText: {
    fontSize: 12,
    color: "#4CAF50",
  },
  progressBarSmall: {
    width: "100%",
    height: 3,
    backgroundColor: "#E0E0E0",
    borderRadius: 1.5,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFEB3B",
    borderRadius: 1.5,
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99998,
  },
  dropdownMenu: {
    position: "absolute",
    top: 35,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
    minWidth: 180,
    zIndex: 99999,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuOptionDanger: {
    borderBottomWidth: 0,
  },
  menuOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  menuOptionDangerText: {
    color: "#FF3B30",
  },
});
