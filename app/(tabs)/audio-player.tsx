import LockScreen from '@/app/lock-screen';
import AudioReportItem from '@/components/AudioReportItem';
import { hasPin } from '@/services/security';
import { getAuthToken } from '@/services/authService';
import { deleteReport, getAllReports, updateReportStatus, archiveReport } from '@/services/storage';
import { submitReportToBackend, archiveReportOnBackend, decryptReportFromBackend, searchBackendReports, getReportStats } from '@/services/api';
import { startStatusPolling } from '@/services/statusPoller';
import { grantAccess, getReportViewers, revokeAccess, getSharedWithMe } from '@/services/accessService';
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
  TextInput,
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
  const [hasNoAuthToken, setHasNoAuthToken] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuReportId, setOpenMenuReportId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showSharedWithMeTab, setShowSharedWithMeTab] = useState(false);
  const [showDecryptedModal, setShowDecryptedModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [shareUserId, setShareUserId] = useState('');
  const [viewers, setViewers] = useState<any[]>([]);
  const [sharedReports, setSharedReports] = useState<any[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<any>(null);
  const [isLoadingDecrypt, setIsLoadingDecrypt] = useState(false);
  const [isSubmittingReportId, setIsSubmittingReportId] = useState<string | null>(null);

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<string>('all');
  const [backendReports, setBackendReports] = useState<any[]>([]);
  const [reportStats, setReportStats] = useState<any>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const searchLimit = 10;

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

  // Check if user has auth token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          console.log('❌ No auth token found, redirecting to login');
          setHasNoAuthToken(true);
          router.replace('/');
          return;
        }
        console.log('✅ Auth token found, user is logged in');
      } catch (error) {
        console.error('Error checking auth:', error);
        setHasNoAuthToken(true);
        router.replace('/');
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    // Only load reports if user is authenticated
    if (isAuthenticated) {
      loadReports();
    }
  }, [isAuthenticated, showArchived]);

  const filteredReports = useMemo(() => {
    let filtered = reports.filter(r => {
      if (activeTab === 'audio') {
        return (r.type === 'audio' || r.type === 'mixed') && r.audioUri;
      } else {
        return r.type === 'text' || (r.type === 'mixed' && r.textContent);
      }
    });

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const dateStr = new Date(r.createdAt).toLocaleDateString().toLowerCase();
        const contentStr = (r.textContent || '').toLowerCase();
        const idStr = (r.id || '').toLowerCase();
        return dateStr.includes(query) || contentStr.includes(query) || idStr.includes(query);
      });
    }

    return filtered;
  }, [reports, activeTab, searchQuery]);

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
      'Submit this report securely?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async () => {
            console.log('🔄 Setting submitting state for report:', report.id);
            setIsSubmittingReportId(report.id);
            try {
              const result = await submitReportToBackend(report);
              console.log('📊 Submit result:', result);

              if (result.success) {
                console.log('✅ Report submitted successfully');
                console.log('📋 Submission Details:', {
                  reportId: result.reportId,
                  txHash: result.txHash,
                  ipfsHash: result.ipfsHash,
                  status: result.status,
                });

                Alert.alert(
                  'Success',
                  `Report submitted!\n\nTx: ${result.txHash?.substring(0, 16)}...\nIPFS: ${result.ipfsHash?.substring(0, 16)}...`,
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        console.log('🔄 Clearing submitting state');
                        setIsSubmittingReportId(null);
                        await loadReports();
                        // Start polling for blockchain confirmation
                        if (result.submissionId) {
                          startStatusPolling(result.submissionId);
                        }
                      },
                    },
                  ]
                );
              } else if (result.requiresAuth) {
                Alert.alert(
                  'Login Required',
                  'You need to be logged in to submit reports.',
                  [
                    {
                      text: 'Login',
                      onPress: () => {
                        router.navigate('/login');
                      },
                    },
                    {
                      text: 'Sign Up',
                      onPress: () => {
                        router.navigate('/signup');
                      },
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
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
            } finally {
              setIsSubmittingReportId(null);
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

  const handleViewSubmitted = async (report: Report) => {
    if (!report.submissionId) {
      Alert.alert('Error', 'This report has not been submitted yet');
      return;
    }

    setSelectedReport(report);
    setIsLoadingDecrypt(true);

    try {
      const result = await decryptReportFromBackend(report.submissionId);
      if (result.success && result.data) {
        setDecryptedContent(result.data);
        setShowDecryptedModal(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to decrypt report');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while decrypting the report');
    } finally {
      setIsLoadingDecrypt(false);
    }
  };

  const handleShareReport = (report: Report) => {
    if (!report.submissionId) {
      Alert.alert('Error', 'Only submitted reports can be shared');
      return;
    }
    setSelectedReport(report);
    setShareUserId('');
    setShowShareModal(true);
  };

  const loadBackendReports = async () => {
    setIsLoadingSearch(true);
    try {
      // Load stats
      const statsResult = await getReportStats();
      if (statsResult.success) {
        setReportStats(statsResult.stats);
      }

      // Load reports based on selected status
      const params: any = { limit: searchLimit, offset: 0 };
      if (searchStatus !== 'all') {
        params.status = searchStatus;
      }
      const reportsResult = await searchBackendReports(params);
      if (reportsResult.success) {
        setBackendReports(reportsResult.reports || []);
        setSearchOffset(0);
      }
    } catch (error) {
      console.error('Error loading backend reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const loadMoreBackendReports = async () => {
    try {
      const params: any = { limit: searchLimit, offset: searchOffset + searchLimit };
      if (searchStatus !== 'all') {
        params.status = searchStatus;
      }
      const result = await searchBackendReports(params);
      if (result.success) {
        setBackendReports([...backendReports, ...(result.reports || [])]);
        setSearchOffset(searchOffset + searchLimit);
      }
    } catch (error) {
      console.error('Error loading more reports:', error);
      Alert.alert('Error', 'Failed to load more reports');
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedReport || !shareUserId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }

    try {
      const result = await grantAccess(selectedReport.submissionId!, shareUserId.trim());
      if (result.success) {
        Alert.alert('Success', 'Access granted to the user');
        setShowShareModal(false);
        setShareUserId('');
        setSelectedReport(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to grant access');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    }
  };

  const handleViewViewers = async (report: Report) => {
    if (!report.submissionId) {
      Alert.alert('Error', 'This report has not been submitted yet');
      return;
    }

    setSelectedReport(report);
    setIsLoadingViewers(true);

    try {
      const result = await getReportViewers(report.submissionId);
      if (result.success) {
        setViewers(result.viewers || []);
        setShowViewersModal(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to fetch viewers');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while fetching viewers');
    } finally {
      setIsLoadingViewers(false);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!selectedReport) {
      Alert.alert('Error', 'Report not selected');
      return;
    }

    Alert.alert(
      'Revoke Access',
      `Are you sure you want to revoke access for this user?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await revokeAccess(selectedReport.submissionId!, userId);
              if (result.success) {
                Alert.alert('Success', 'Access revoked successfully');
                // Refresh viewers list
                const viewersResult = await getReportViewers(selectedReport.submissionId!);
                if (viewersResult.success) {
                  setViewers(viewersResult.viewers || []);
                }
              } else {
                Alert.alert('Error', result.error || 'Failed to revoke access');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred');
            }
          },
        },
      ]
    );
  };

  const loadSharedReports = async () => {
    setIsLoadingShared(true);
    try {
      const result = await getSharedWithMe();
      if (result.success) {
        setSharedReports(result.reports || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to load shared reports');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIsLoadingShared(false);
    }
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

  // Show PIN screens if not authenticated
  if (!isAuthenticated) {
    if (showPinRequired) {
      return (
        <Modal
          visible={showPinRequired}
          animationType="slide"
          transparent={false}
        >
          <LockScreen
            mode="setup"
            onSetPin={() => {
              setShowPinRequired(false);
              setIsAuthenticated(true);
            }}
            onUnlock={() => { }}
          />
        </Modal>
      );
    }

    if (showPinVerify) {
      return (
        <Modal
          visible={showPinVerify}
          animationType="slide"
          transparent={false}
        >
          <LockScreen
            mode="verify"
            onUnlock={() => {
              setShowPinVerify(false);
              setIsAuthenticated(true);
            }}
            onSetPin={() => { }}
            onClose={() => setShowPinVerify(false)}
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
      );
    }
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

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reports..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, !showSharedWithMeTab && activeTab === 'audio' && styles.activeTab]}
            onPress={() => {
              setActiveTab('audio');
              setShowSharedWithMeTab(false);
            }}
          >
            <Text style={[styles.tabText, !showSharedWithMeTab && activeTab === 'audio' && styles.activeTabText]}>Audio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !showSharedWithMeTab && activeTab === 'text' && styles.activeTab]}
            onPress={() => {
              setActiveTab('text');
              setShowSharedWithMeTab(false);
            }}
          >
            <Text style={[styles.tabText, !showSharedWithMeTab && activeTab === 'text' && styles.activeTabText]}>Text Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, showSharedWithMeTab && styles.activeTab]}
            onPress={() => {
              setShowSharedWithMeTab(!showSharedWithMeTab);
              if (!showSharedWithMeTab && sharedReports.length === 0) {
                loadSharedReports();
              }
            }}
          >
            <Text style={[styles.tabText, showSharedWithMeTab && styles.activeTabText]}>Shared</Text>
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={showSharedWithMeTab ? isLoadingShared : refreshing}
              onRefresh={showSharedWithMeTab ? loadSharedReports : loadReports}
            />
          }
        >
          {showSharedWithMeTab ? (
            // Shared With Me tab
            isLoadingShared ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8A4FFF" />
              </View>
            ) : !sharedReports || sharedReports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="share-2" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No reports shared with you</Text>
                <Text style={styles.emptySubtext}>Reports others share will appear here</Text>
              </View>
            ) : (
              <View style={styles.reportsList}>
                {(sharedReports || []).map((report) => (
                  <View key={report.reportId || report.id} style={styles.sharedReportCard}>
                    <View style={styles.sharedReportHeader}>
                      <View>
                        <Text style={styles.sharedReportTitle}>
                          Report from {report.sharedBy?.substring(0, 8) || 'Unknown'}
                        </Text>
                        <Text style={styles.sharedReportSubtitle}>
                          {new Date(report.grantedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              report.status === 'confirmed'
                                ? '#10B981'
                                : report.status === 'pending'
                                  ? '#F59E0B'
                                  : '#EF4444',
                          },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {report.status?.charAt(0).toUpperCase() + report.status?.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )
          ) : filteredReports.length === 0 ? (
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
                  <View key={report.id}>
                    <AudioReportItem
                      report={report}
                      isPlaying={playingReportId === report.id}
                      isSubmitting={isSubmittingReportId === report.id}
                      onPlayPause={handlePlayPause}
                      onStop={handleStop}
                      onDelete={handleDelete}
                      onResubmit={handleResubmit}
                      onPlayingChange={setPlayingReportId}
                      onArchive={handleArchive}
                      onEdit={handleEditReport}
                    />
                    {(report.status === 'submitted' || report.status === 'confirmed') && (
                      <View style={styles.menuContainer}>
                        <TouchableOpacity
                          style={styles.menuButton}
                          onPress={() => setOpenMenuReportId(openMenuReportId === report.id ? null : report.id)}
                        >
                          <MaterialIcons name="more-vert" size={24} color="#6B7280" />
                        </TouchableOpacity>

                        {openMenuReportId === report.id && (
                          <View style={styles.dropdownMenu}>
                            <TouchableOpacity
                              style={styles.menuOption}
                              onPress={() => {
                                handleViewSubmitted(report);
                                setOpenMenuReportId(null);
                              }}
                            >
                              <Feather name="eye" size={18} color="#8B5CF6" />
                              <Text style={styles.menuOptionText}>View Details</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.menuOption}
                              onPress={() => {
                                handleShareReport(report);
                                setOpenMenuReportId(null);
                              }}
                            >
                              <Feather name="share-2" size={18} color="#8B5CF6" />
                              <Text style={styles.menuOptionText}>Share</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.menuOption}
                              onPress={() => {
                                handleViewViewers(report);
                                setOpenMenuReportId(null);
                              }}
                            >
                              <Feather name="users" size={18} color="#8B5CF6" />
                              <Text style={styles.menuOptionText}>Viewers</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.menuOption, styles.menuOptionDanger]}
                              onPress={() => {
                                handleArchive(report);
                                setOpenMenuReportId(null);
                              }}
                            >
                              <Feather name="archive" size={18} color="#FF3B30" />
                              <Text style={[styles.menuOptionText, styles.menuOptionDangerText]}>Archive</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ))
              ) : (
                filteredReports.map((report) => {
                  const actions = getAvailableActions(report.status || 'saved');
                  return (
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

                      {/* Action Menu */}
                      <View style={styles.menuContainer}>
                        {actions.canSubmit && (
                          <TouchableOpacity
                            style={[styles.reportActionButton, styles.submitButton]}
                            onPress={() => handleResubmit(report)}
                            disabled={isSubmittingReportId === report.id}
                          >
                            {isSubmittingReportId === report.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.reportActionButtonText}>Submit</Text>
                            )}
                          </TouchableOpacity>
                        )}

                        {(report.status === 'submitted' || report.status === 'confirmed') && (
                          <>
                            <TouchableOpacity
                              style={styles.menuButton}
                              onPress={() => setOpenMenuReportId(openMenuReportId === report.id ? null : report.id)}
                            >
                              <MaterialIcons name="more-vert" size={24} color="#6B7280" />
                            </TouchableOpacity>

                            {openMenuReportId === report.id && (
                              <View style={styles.dropdownMenu}>
                                <TouchableOpacity
                                  style={styles.menuOption}
                                  onPress={() => {
                                    handleViewSubmitted(report);
                                    setOpenMenuReportId(null);
                                  }}
                                >
                                  <Feather name="eye" size={18} color="#8B5CF6" />
                                  <Text style={styles.menuOptionText}>View Details</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.menuOption}
                                  onPress={() => {
                                    handleShareReport(report);
                                    setOpenMenuReportId(null);
                                  }}
                                >
                                  <Feather name="share-2" size={18} color="#8B5CF6" />
                                  <Text style={styles.menuOptionText}>Share</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.menuOption}
                                  onPress={() => {
                                    handleViewViewers(report);
                                    setOpenMenuReportId(null);
                                  }}
                                >
                                  <Feather name="users" size={18} color="#8B5CF6" />
                                  <Text style={styles.menuOptionText}>Viewers</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.menuOption, styles.menuOptionDanger]}
                                  onPress={() => {
                                    handleArchive(report);
                                    setOpenMenuReportId(null);
                                  }}
                                >
                                  <Feather name="archive" size={18} color="#FF3B30" />
                                  <Text style={[styles.menuOptionText, styles.menuOptionDangerText]}>Archive</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Decrypted Report Modal */}
      <Modal
        visible={showDecryptedModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDecryptedModal(false);
          setDecryptedContent(null);
          setSelectedReport(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowDecryptedModal(false);
                setDecryptedContent(null);
                setSelectedReport(null);
              }}
            >
              <MaterialIcons name="close" size={24} color="#8A4FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Decrypted Report</Text>
            <View style={{ width: 24 }} />
          </View>

          {isLoadingDecrypt ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8A4FFF" />
            </View>
          ) : decryptedContent ? (
            <ScrollView style={styles.decryptedContent}>
              {decryptedContent.payload?.text && (
                <View style={styles.contentSection}>
                  <Text style={styles.contentLabel}>Text Content:</Text>
                  <Text style={styles.contentText}>{decryptedContent.payload.text}</Text>
                </View>
              )}
              {decryptedContent.payload?.audio && (
                <View style={styles.contentSection}>
                  <Text style={styles.contentLabel}>Audio:</Text>
                  <Text style={styles.contentText}>Audio file available</Text>
                </View>
              )}
              <View style={styles.contentSection}>
                <Text style={styles.contentLabel}>Status:</Text>
                <Text style={styles.contentText}>{decryptedContent.status}</Text>
              </View>
              <View style={styles.contentSection}>
                <Text style={styles.contentLabel}>Created:</Text>
                <Text style={styles.contentText}>{formatDate(decryptedContent.createdAt)}</Text>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Share Report Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowShareModal(false);
          setShareUserId('');
          setSelectedReport(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowShareModal(false);
                setShareUserId('');
                setSelectedReport(null);
              }}
            >
              <MaterialIcons name="close" size={24} color="#8A4FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Report</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.shareContainer}>
            <Text style={styles.shareLabel}>Enter user ID to grant access:</Text>
            <TextInput
              style={styles.shareInput}
              placeholder="User ID"
              value={shareUserId}
              onChangeText={setShareUserId}
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleGrantAccess}
            >
              <Text style={styles.shareButtonText}>Grant Access</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Viewers Modal */}
      <Modal
        visible={showViewersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowViewersModal(false);
          setViewers([]);
          setSelectedReport(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowViewersModal(false);
                setViewers([]);
                setSelectedReport(null);
              }}
            >
              <MaterialIcons name="close" size={24} color="#8A4FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report Viewers</Text>
            <View style={{ width: 24 }} />
          </View>

          {isLoadingViewers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8A4FFF" />
            </View>
          ) : viewers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="eye-off" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No one has access</Text>
            </View>
          ) : (
            <ScrollView style={styles.decryptedContent}>
              {viewers.map((viewer, index) => (
                <View key={index} style={styles.viewerItem}>
                  <View style={styles.viewerInfo}>
                    <Text style={styles.viewerUserId}>User ID: {viewer.userId}</Text>
                    <Text style={styles.viewerGrantedAt}>
                      Granted: {new Date(viewer.grantedAt).toLocaleDateString()}
                    </Text>
                    {viewer.expiresAt && (
                      <Text style={styles.viewerExpiresAt}>
                        Expires: {new Date(viewer.expiresAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.revokeButton}
                    onPress={() => handleRevokeAccess(viewer.userId)}
                  >
                    <MaterialIcons name="clear" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

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
          onClose={() => setShowPinVerify(false)}
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  decryptedContent: {
    flex: 1,
    padding: 20,
  },
  contentSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contentText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  shareContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  shareInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  reportActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reportActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  // Search bar styles
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  // Sharing styles
  reportsList: {
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sharedReportCard: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#14B8A6',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  sharedReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharedReportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  sharedReportSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  viewerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewerInfo: {
    flex: 1,
  },
  viewerUserId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  viewerGrantedAt: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  viewerExpiresAt: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  revokeButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  menuContainer: {
    position: 'relative',
    marginTop: 12,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  menuButton: {
    padding: 8,
    marginRight: -8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 180,
    zIndex: 1000,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuOptionDanger: {
    borderBottomWidth: 0,
  },
  menuOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  menuOptionDangerText: {
    color: '#FF3B30',
  },
});
