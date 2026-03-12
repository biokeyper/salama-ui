import LockScreen from '@/app/lock-screen';
import AudioReportItem from '@/components/AudioReportItem';
import { hasPin } from '@/services/security';
import { getAuthToken } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { deleteReport, getAllReports, updateReportStatus, archiveReport, saveReport } from '@/services/storage';
import { submitReportToBackend, archiveReportOnBackend, decryptReportFromBackend, searchBackendReports, getReportStats } from '@/services/api';
import { startStatusPolling } from '@/services/statusPoller';
import { grantAccess, getReportViewers, revokeAccess, getSharedWithMe, getMySharedReports, getSharedReport, unarchiveReport } from '@/services/accessService';
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
  Clipboard,
  Modal,
  Platform,
  Pressable,
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
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingReportId, setPlayingReportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audio' | 'text'>('audio');
  const [showPinRequired, setShowPinRequired] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasNoAuthToken, setHasNoAuthToken] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showSharedTab, setShowSharedTab] = useState(false);
  const [sharedTabMode, setSharedTabMode] = useState<'with-me' | 'my-shared'>('with-me');
  const [openMenuReportId, setOpenMenuReportId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showSharedWithMeTab, setShowSharedWithMeTab] = useState(false);
  const [showDecryptedModal, setShowDecryptedModal] = useState(false);
  const [showSharedWithMeDetailsModal, setShowSharedWithMeDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedSharedWithMeReport, setSelectedSharedWithMeReport] = useState<any>(null);
  const [shareUserId, setShareUserId] = useState('');
  const [viewers, setViewers] = useState<any[]>([]);
  const [sharedReports, setSharedReports] = useState<any[]>([]);
  const [mySharedReports, setMySharedReports] = useState<any[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [isLoadingMyShared, setIsLoadingMyShared] = useState(false);
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<any>(null);
  const [isLoadingDecrypt, setIsLoadingDecrypt] = useState(false);
  const [isLoadingSharedWithMeDetails, setIsLoadingSharedWithMeDetails] = useState(false);
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
        setIsCheckingAuth(true);

        // Check if user is authenticated
        const token = await getAuthToken();
        const isAuthenticatedUser = token && user;

        if (!isAuthenticatedUser) {
          // Not authenticated - don't show PIN modals
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
          return;
        }

        // User is authenticated - check PIN status
        const pinIsSet = await hasPin();

        if (!pinIsSet) {
          // Authenticated but no PIN - show set PIN modal
          setShowSetPinModal(true);
          setIsAuthenticated(false);
        } else {
          // PIN exists - require verification
          setShowPinVerify(true);
          setIsAuthenticated(false);
        }
        setIsCheckingAuth(false);
      };
      checkPinStatus();

      // Reset authentication and stop audio when leaving the screen
      return () => {
        setIsAuthenticated(false);
        setPlayingReportId(null);
        setOpenMenuReportId(null);
      };
    }, [user])
  );

  const handlePinVerified = () => {
    setShowPinVerify(false);
    setIsAuthenticated(true);
  };

  const handlePinSet = (pin: string) => {
    // PIN has been set - mark as authenticated and load reports
    setShowSetPinModal(false);
    setIsAuthenticated(true);
  };

  // Load reports from local storage and sync with backend
  const loadReports = async () => {
    try {
      // Load local reports
      const allReports = await getAllReports();

      // Sync submitted reports with backend to get latest status
      if (isAuthenticated) {
        try {
          const backendResult = await searchBackendReports({
            limit: 100,
            offset: 0,
          });

          if (backendResult.success && backendResult.reports) {
            // Update local reports with backend data (status, confirmations, hashes only)
            for (const backendReport of backendResult.reports) {
              const localReportIndex = allReports.findIndex(r => r.id === backendReport.reportId);
              if (localReportIndex !== -1) {
                const localReport = allReports[localReportIndex];
                // Only update blockchain-related fields from backend
                if (backendReport.status) {
                  localReport.status = backendReport.status;
                }
                if (backendReport.confirmations !== undefined && backendReport.confirmations !== null) {
                  localReport.confirmations = backendReport.confirmations;
                }
                if (backendReport.txHash) {
                  localReport.txHash = backendReport.txHash;
                }
                if (backendReport.ipfsHash) {
                  localReport.ipfsHash = backendReport.ipfsHash;
                }
              }
            }
          }
        } catch (syncError) {
          console.error('Error syncing with backend:', syncError);
          // Continue with local reports if sync fails
        }
      }

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
          setHasNoAuthToken(true);
          // Silent - PIN screen handles guidance
          return;
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setHasNoAuthToken(true);
        // Silent - PIN screen handles guidance
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
                  'Report submitted successfully!',
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        setIsSubmittingReportId(null);
                        await loadReports();
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

  const handleUnarchive = (report: Report) => {
    Alert.alert(
      'Unarchive Report',
      'This report will be restored to your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: async () => {
            try {
              // Unarchive on backend
              if (report.submissionId) {
                const result = await unarchiveReport(report.submissionId);
                if (!result.success) {
                  Alert.alert('Error', result.error || 'Failed to unarchive on backend');
                  return;
                }
              }

              // Update local status
              await saveReport({
                ...report,
                isArchived: false,
                archivedAt: null,
                archivedReason: null,
              });
              await loadReports();
              Alert.alert('Success', 'Report restored successfully');
            } catch (error) {
              console.error('Error unarchiving report:', error);
              Alert.alert('Error', 'Failed to unarchive report');
            }
          },
        },
      ]
    );
  };

  const handleArchiveToggle = (report: Report) => {
    if (report.isArchived) {
      handleUnarchive(report);
    } else {
      handleArchive(report);
    }
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
    setShowDecryptedModal(true);

    try {
      const result = await decryptReportFromBackend(report.submissionId);
      console.log('View Details Response:', JSON.stringify(result, null, 2));
      console.log('Metadata:', result.data?.payload?.metadata);
      console.log('Responses:', result.data?.payload?.responses);
      if (result.success && result.data) {
        setDecryptedContent(result.data);
      } else {
        Alert.alert('Error', result.error || 'Failed to decrypt report');
        setShowDecryptedModal(false);
      }
    } catch (error) {
      console.error('Error viewing report details:', error);
      Alert.alert('Error', 'An error occurred while decrypting the report');
      setShowDecryptedModal(false);
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
      setIsLoadingShare(true);
      console.log('🔐 Granting access to user:', shareUserId.trim());
      const result = await grantAccess(selectedReport.submissionId!, shareUserId.trim());
      console.log('🔐 Grant access response:', result);

      if (result.success) {
        console.log('✅ Access granted successfully');
        Alert.alert('Success', 'Access granted to the user');
        setShowShareModal(false);
        setShareUserId('');
        setSelectedReport(null);
      } else {
        console.log('❌ Grant access failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to grant access');
      }
    } catch (error) {
      console.error('❌ Grant access error:', error);
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIsLoadingShare(false);
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
      console.log('👁️ Viewers response:', result);
      if (result.success) {
        console.log('👁️ Viewers list:', result.viewers);
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
              const reportId = selectedReport.submissionId || selectedReport.reportId;
              console.log('🔐 Revoking access for user:', userId);
              const result = await revokeAccess(reportId!, userId);
              console.log('🔐 Revoke access response:', result);

              if (result.success) {
                console.log('✅ Access revoked successfully');
                Alert.alert('Success', 'Access revoked successfully');
                // Refresh viewers list
                const viewersResult = await getReportViewers(reportId!);
                if (viewersResult.success) {
                  setViewers(viewersResult.viewers || []);
                }
              } else {
                console.log('❌ Revoke access failed:', result.error);
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
      console.log('📥 === SHARED WITH ME (getSharedWithMe) ===');
      console.log('📥 Full Response:', JSON.stringify(result, null, 2));
      console.log('📥 Reports Count:', result.reports?.length || 0);
      console.log('📥 First Report Example:', result.reports?.[0]);
      console.log('📥 All Reports:', result.reports);
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

  const loadMySharedReports = async () => {
    setIsLoadingMyShared(true);
    try {
      const result = await getMySharedReports();
      console.log('📤 === MY SHARED (getMySharedReports) ===');
      console.log('📤 Full Response:', JSON.stringify(result, null, 2));
      console.log('📤 Reports Count:', result.reports?.length || 0);
      console.log('📤 First Report Example:', result.reports?.[0]);
      console.log('📤 All Reports:', result.reports);
      if (result.success) {
        setMySharedReports(result.reports || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to load your shared reports');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setIsLoadingMyShared(false);
    }
  };

  const handleViewSharedWithMeReport = async (report: any) => {
    setSelectedSharedWithMeReport(report);
    setIsLoadingSharedWithMeDetails(true);
    try {
      const result = await getSharedReport(report.reportId);
      console.log('📄 Full response from getSharedReport (Shared With Me):', JSON.stringify(result, null, 2));
      console.log('📄 Payload (data):', result.data);
      if (result.success) {
        setDecryptedContent(result.data);
        setShowSharedWithMeDetailsModal(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to load report details');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while loading report details');
    } finally {
      setIsLoadingSharedWithMeDetails(false);
    }
  };

  // Show blank screen while checking auth status
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container} />
      </SafeAreaView>
    );
  }

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

    if (showSetPinModal) {
      return (
        <Modal
          visible={showSetPinModal}
          animationType="slide"
          transparent={false}
        >
          <LockScreen
            mode="set"
            onSetPin={(pin) => {
              handlePinSet(pin);
            }}
            onClose={() => {
              setShowSetPinModal(false);
              router.back();
            }}
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
              size={20}
              color="#8A4FFF"
            />
            <Text style={styles.archiveToggleText}>
              {showArchived ? 'Back to Library' : 'View Archived'}
            </Text>
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
              if (!showSharedWithMeTab) {
                if (sharedReports.length === 0) {
                  loadSharedReports();
                }
                if (mySharedReports.length === 0) {
                  loadMySharedReports();
                }
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
              refreshing={showSharedWithMeTab ? (sharedTabMode === 'with-me' ? isLoadingShared : isLoadingMyShared) : refreshing}
              onRefresh={showSharedWithMeTab ? (sharedTabMode === 'with-me' ? loadSharedReports : loadMySharedReports) : loadReports}
            />
          }
        >
          {showSharedWithMeTab ? (
            <>
              {/* Shared Tab Sub-tabs */}
              <View style={styles.sharedSubTabContainer}>
                <TouchableOpacity
                  style={[styles.sharedSubTab, sharedTabMode === 'with-me' && styles.activeSharedSubTab]}
                  onPress={() => setSharedTabMode('with-me')}
                >
                  <Text style={[styles.sharedSubTabText, sharedTabMode === 'with-me' && styles.activeSharedSubTabText]}>
                    Shared With Me
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sharedSubTab, sharedTabMode === 'my-shared' && styles.activeSharedSubTab]}
                  onPress={() => setSharedTabMode('my-shared')}
                >
                  <Text style={[styles.sharedSubTabText, sharedTabMode === 'my-shared' && styles.activeSharedSubTabText]}>
                    My Shared
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Shared With Me Mode */}
              {sharedTabMode === 'with-me' ? (
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
                      <TouchableOpacity
                        key={report.reportId || report.id}
                        style={styles.sharedReportCard}
                        onPress={() => handleViewSharedWithMeReport(report)}
                      >
                        <View style={styles.sharedReportHeader}>
                          <View>
                            <Text style={styles.sharedReportTitle}>
                              Report from {report.reporterPhone || report.reporterEmail || 'Unknown'}
                            </Text>
                            <Text style={styles.sharedReportSubtitle}>
                              {new Date(report.grantedAt).toLocaleDateString()} • ID: {report.reporterId?.substring(0, 8)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: report.isActive ? '#10B981' : '#EF4444',
                              },
                            ]}
                          >
                            <Text style={styles.statusBadgeText}>
                              {report.isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              ) : !mySharedReports || mySharedReports.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Feather name="share-2" size={64} color="#CCC" />
                  <Text style={styles.emptyText}>No reports shared yet</Text>
                  <Text style={styles.emptySubtext}>Reports you share will appear here</Text>
                </View>
              ) : (
                <View style={styles.reportsList}>
                  {(mySharedReports || []).map((report) => (
                    <TouchableOpacity
                      key={report.reportId || report.id}
                      style={styles.sharedReportCard}
                      onPress={async () => {
                        setSelectedReport(report as any);
                        setIsLoadingViewers(true);
                        try {
                          // Fetch latest viewers from backend
                          const result = await getReportViewers(report.reportId);
                          console.log('👁️ Viewers response for My Shared report:', result);
                          if (result.success) {
                            setViewers(result.viewers || []);
                            setShowViewersModal(true);
                          } else {
                            Alert.alert('Error', result.error || 'Failed to load viewers');
                          }
                        } catch (error) {
                          console.error('Error fetching viewers:', error);
                          Alert.alert('Error', 'Failed to load viewers');
                        } finally {
                          setIsLoadingViewers(false);
                        }
                      }}
                    >
                      <View style={styles.sharedReportHeader}>
                        <View>
                          <Text style={styles.sharedReportTitle}>
                            {report.reportId}
                          </Text>
                          <Text style={styles.sharedReportSubtitle}>
                            {new Date(report.createdAt).toLocaleDateString()} • {report.viewerCount} viewer{report.viewerCount !== 1 ? 's' : ''}
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
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
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
                      onArchive={handleArchiveToggle}
                      onEdit={handleEditReport}
                      openMenuReportId={openMenuReportId}
                      onMenuToggle={(id) => setOpenMenuReportId(openMenuReportId === id ? null : id)}
                      onShare={handleShareReport}
                      onViewViewers={handleViewViewers}
                      onViewDetails={handleViewSubmitted}
                    />
                  </View>
                ))
              ) : (
                filteredReports.map((report) => {
                  const actions = getAvailableActions(report);
                  return (
                    <View key={report.id} style={styles.textReportItem}>
                      <View style={styles.textReportHeaderWrapper}>
                        <View style={styles.textReportHeader}>
                          <View style={styles.textReportHeaderLeft}>
                            <Text style={styles.textReportDate}>{formatDate(report.createdAt)}</Text>
                            <View style={[
                              styles.statusBadge,
                              report.status === 'saved' && styles.draftBadge,
                              report.status === 'submitted' && styles.submittedBadge,
                              report.status === 'confirmed' && styles.confirmedBadge,
                              report.status === 'failed' && styles.failedBadge,
                            ]}>
                              <Text style={styles.statusBadgeText}>
                                {report.status === 'saved' ? 'Draft' : report.status?.charAt(0).toUpperCase() + report.status?.slice(1)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.actionIconsContainer}>
                            {actions.canEdit && (
                              <TouchableOpacity style={styles.actionIcon} onPress={() => handleEditReport(report)}>
                                <Feather name="edit-2" size={20} color="#8A4FFF" />
                              </TouchableOpacity>
                            )}
                            {actions.canDelete && (
                              <TouchableOpacity style={styles.actionIcon} onPress={() => handleDelete(report)}>
                                <MaterialIcons name="delete-outline" size={20} color="#FF3B30" />
                              </TouchableOpacity>
                            )}
                            {((report.status === 'submitted' || report.status === 'pending' || report.status === 'confirmed') || report.isArchived) && (
                              <TouchableOpacity
                                style={styles.actionIcon}
                                onPress={() => setOpenMenuReportId(openMenuReportId === report.id ? null : report.id)}
                              >
                                <MaterialIcons name="more-vert" size={24} color="#6B7280" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        {((report.status === 'submitted' || report.status === 'pending' || report.status === 'confirmed') || report.isArchived) && openMenuReportId === report.id && (
                          <>
                            <Pressable
                              style={styles.menuOverlay}
                              onPress={() => setOpenMenuReportId(null)}
                            />
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
                                handleArchiveToggle(report);
                                setOpenMenuReportId(null);
                              }}
                            >
                              <Feather name={report.isArchived ? "inbox" : "archive"} size={18} color="#FF3B30" />
                              <Text style={[styles.menuOptionText, styles.menuOptionDangerText]}>
                                {report.isArchived ? 'Unarchive' : 'Archive'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          </>
                        )}
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

                      {/* Submit Button Section */}
                      {actions.canSubmit && (
                        <View style={styles.submitButtonSection}>
                          <TouchableOpacity
                            style={[styles.primarySubmitButton, isSubmittingReportId === report.id && styles.buttonDisabled]}
                            onPress={() => handleResubmit(report)}
                            disabled={isSubmittingReportId === report.id}
                          >
                            {isSubmittingReportId === report.id ? (
                              <ActivityIndicator size="small" color="#8A4FFF" />
                            ) : (
                              <>
                                <MaterialIcons name={report.status === 'saved' ? 'cloud-upload' : 'refresh'} size={18} color="#8A4FFF" />
                                <Text style={styles.primarySubmitButtonText}>{report.status === 'saved' ? 'Submit' : 'Resubmit'}</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Unarchive Button for Archived Reports */}
                      {report.isArchived && (
                        <View style={styles.menuContainer}>
                          <TouchableOpacity
                            style={styles.unarchiveFullButton}
                            onPress={() => handleUnarchive(report)}
                          >
                            <Feather name="inbox" size={18} color="#8A4FFF" />
                            <Text style={styles.unarchiveButtonText}>Unarchive</Text>
                          </TouchableOpacity>
                        </View>
                      )}
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
            <Text style={styles.modalTitle}>Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {isLoadingDecrypt ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8A4FFF" />
            </View>
          ) : decryptedContent ? (
            <ScrollView style={styles.decryptedContent}>
              {/* Text Content */}
              {decryptedContent.payload?.text && (
                <View style={styles.contentSection}>
                  <Text style={styles.contentLabel}>Report Text:</Text>
                  <Text style={styles.contentText}>{decryptedContent.payload.text}</Text>
                </View>
              )}

              {/* Audio Content */}
              {decryptedContent.payload?.audio && (
                <View style={styles.contentSection}>
                  <Text style={styles.contentLabel}>Audio Recording:</Text>
                  <View style={styles.audioInfo}>
                    <MaterialIcons name="mic" size={20} color="#8A4FFF" />
                    <Text style={styles.audioText}>
                      {decryptedContent.metadata?.duration
                        ? `${decryptedContent.metadata.duration}s`
                        : 'Audio file available'}
                    </Text>
                    {decryptedContent.payload?.audioFormat && (
                      <Text style={styles.audioFormat}>{decryptedContent.payload.audioFormat}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Status */}
              <View style={styles.contentSection}>
                <Text style={styles.contentLabel}>Status:</Text>
                <View style={{ alignSelf: 'flex-start' }}>
                  <View style={[
                    styles.statusBadge,
                    decryptedContent.status === 'confirmed' && { backgroundColor: '#4CAF50' },
                    decryptedContent.status === 'pending' && { backgroundColor: '#FFEB3B' },
                    decryptedContent.status === 'failed' && { backgroundColor: '#FF3B30' },
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {decryptedContent.status?.charAt(0).toUpperCase() + decryptedContent.status?.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Metadata */}
              {decryptedContent.payload?.metadata && (
                <View style={styles.contentSection}>
                  <Text style={styles.contentLabel}>Metadata:</Text>
                  {decryptedContent.payload.metadata.location && (
                    <View style={styles.metadataItem}>
                      <MaterialIcons name="location-on" size={16} color="#8A4FFF" />
                      <Text style={styles.metadataText}>{decryptedContent.payload.metadata.location}</Text>
                    </View>
                  )}
                  {decryptedContent.payload.metadata.timestamp && (
                    <View style={styles.metadataItem}>
                      <MaterialIcons name="access-time" size={16} color="#8A4FFF" />
                      <Text style={styles.metadataText}>{formatDate(decryptedContent.payload.metadata.timestamp)}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Responses */}
              {decryptedContent.payload?.responses && decryptedContent.payload.responses.length > 0 && (
                <View style={styles.contentSection}>
                  <Text style={styles.contentLabel}>Survey Responses:</Text>
                  {decryptedContent.payload.responses.map((response: string, index: number) => (
                    response && (
                      <View key={index} style={styles.responseItem}>
                        <Text style={styles.responseIndex}>{index + 1}.</Text>
                        <Text style={styles.responseText}>{response}</Text>
                      </View>
                    )
                  ))}
                </View>
              )}

              {/* Timeline */}
              <View style={styles.contentSection}>
                <Text style={styles.contentLabel}>Timeline:</Text>
                {decryptedContent.timestamps?.createdAt && (
                  <View style={styles.timelineItem}>
                    <MaterialIcons name="schedule" size={18} color="#8A4FFF" />
                    <View style={styles.timelineText}>
                      <Text style={styles.timelineLabel}>Created</Text>
                      <Text style={styles.timelineDate}>{formatDate(decryptedContent.timestamps.createdAt)}</Text>
                    </View>
                  </View>
                )}
                {decryptedContent.timestamps?.submittedAt && (
                  <View style={styles.timelineItem}>
                    <MaterialIcons name="cloud-upload" size={18} color="#2196F3" />
                    <View style={styles.timelineText}>
                      <Text style={styles.timelineLabel}>Submitted</Text>
                      <Text style={styles.timelineDate}>{formatDate(decryptedContent.timestamps.submittedAt)}</Text>
                    </View>
                  </View>
                )}
                {decryptedContent.timestamps?.confirmedAt && (
                  <View style={styles.timelineItem}>
                    <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
                    <View style={styles.timelineText}>
                      <Text style={styles.timelineLabel}>Confirmed</Text>
                      <Text style={styles.timelineDate}>{formatDate(decryptedContent.timestamps.confirmedAt)}</Text>
                    </View>
                  </View>
                )}
                {decryptedContent.timestamps?.updatedAt && (
                  <View style={styles.timelineItem}>
                    <MaterialIcons name="edit" size={18} color="#FF9800" />
                    <View style={styles.timelineText}>
                      <Text style={styles.timelineLabel}>Updated</Text>
                      <Text style={styles.timelineDate}>{formatDate(decryptedContent.timestamps.updatedAt)}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Report ID */}
              <View style={styles.contentSection}>
                <Text style={styles.contentLabel}>Report ID:</Text>
                <Text style={styles.reportId}>{decryptedContent.reportId}</Text>
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
              style={[styles.shareButton, isLoadingShare && styles.shareButtonDisabled]}
              onPress={handleGrantAccess}
              disabled={isLoadingShare}
            >
              {isLoadingShare ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.shareButtonText}>Grant Access</Text>
              )}
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
                  {/* Header: ID and Revoke Button */}
                  <View style={styles.viewerItemHeader}>
                    <TouchableOpacity
                      style={styles.viewerIdContainer}
                      onPress={() => {
                        Clipboard.setString(viewer.viewerId);
                        Alert.alert('Copied', 'Viewer ID copied to clipboard');
                      }}
                    >
                      <Text style={styles.viewerIdLabel}>ID</Text>
                      <Text style={styles.viewerIdValue}>{viewer.viewerId}</Text>
                      <Feather name="copy" size={14} color="#8A4FFF" style={styles.copyIcon} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.revokeButtonContainer}
                      onPress={() => handleRevokeAccess(viewer.viewerId)}
                    >
                      <Text style={styles.revokeButtonText}>Revoke</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Details Grid */}
                  <View style={styles.viewerDetailsGrid}>
                    {viewer.phone && (
                      <View style={styles.viewerDetailItem}>
                        <Text style={styles.viewerDetailLabel}>Phone</Text>
                        <Text style={styles.viewerDetailValue}>{viewer.phone}</Text>
                      </View>
                    )}
                    {viewer.email && (
                      <View style={styles.viewerDetailItem}>
                        <Text style={styles.viewerDetailLabel}>Email</Text>
                        <Text style={styles.viewerDetailValue}>{viewer.email}</Text>
                      </View>
                    )}
                    <View style={styles.viewerDetailItem}>
                      <Text style={styles.viewerDetailLabel}>Status</Text>
                      <Text style={[styles.viewerDetailValue, viewer.isActive ? styles.statusActive : styles.statusInactive]}>
                        {viewer.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <View style={styles.viewerDetailItem}>
                      <Text style={styles.viewerDetailLabel}>Granted</Text>
                      <Text style={styles.viewerDetailValue}>
                        {new Date(viewer.grantedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {viewer.expiresAt && (
                      <View style={styles.viewerDetailItem}>
                        <Text style={styles.viewerDetailLabel}>Expires</Text>
                        <Text style={[styles.viewerDetailValue, styles.expiryColor]}>
                          {new Date(viewer.expiresAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
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

      {/* Shared With Me Report Details Modal */}
      <Modal
        visible={showSharedWithMeDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowSharedWithMeDetailsModal(false);
          setSelectedSharedWithMeReport(null);
          setDecryptedContent(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowSharedWithMeDetailsModal(false);
                setSelectedSharedWithMeReport(null);
                setDecryptedContent(null);
              }}
            >
              <MaterialIcons name="close" size={24} color="#8A4FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {isLoadingSharedWithMeDetails ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8A4FFF" />
            </View>
          ) : (
            <ScrollView style={styles.decryptedContent}>
              {selectedSharedWithMeReport && (
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Report ID</Text>
                    <Text style={styles.detailValue}>{selectedSharedWithMeReport.reportId}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From</Text>
                    <Text style={styles.detailValue}>
                      {selectedSharedWithMeReport.reporterPhone || selectedSharedWithMeReport.reporterEmail || 'Unknown'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reporter ID</Text>
                    <Text style={styles.detailValue}>{selectedSharedWithMeReport.reporterId}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Granted Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedSharedWithMeReport.grantedAt).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expires</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedSharedWithMeReport.expiresAt).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[styles.detailValue, selectedSharedWithMeReport.isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                      {selectedSharedWithMeReport.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>

                  {decryptedContent && (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.contentTitle}>Report Content</Text>
                      <Text style={styles.contentText}>
                        {decryptedContent.payload || decryptedContent.textContent || JSON.stringify(decryptedContent)}
                      </Text>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  archiveToggleText: {
    fontSize: 14,
    color: '#8A4FFF',
    fontWeight: '600',
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
  sharedSubTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sharedSubTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  activeSharedSubTab: {
    backgroundColor: '#8A4FFF',
  },
  sharedSubTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeSharedSubTabText: {
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
    overflow: 'visible',
    zIndex: 1,
  },
  textReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  textReportHeaderWrapper: {
    position: 'relative',
  },
  textReportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionIconsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionIcon: {
    padding: 4,
  },
  textReportDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  draftBadge: {
    backgroundColor: '#FFA500',
  },
  submittedBadge: {
    backgroundColor: '#2196F3',
  },
  confirmedBadge: {
    backgroundColor: '#4CAF50',
  },
  failedBadge: {
    backgroundColor: '#FF3B30',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
  submitButtonSection: {
    marginTop: 12,
    paddingTop: 12,
    alignSelf: 'flex-start',
  },
  primarySubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8A4FFF',
    gap: 6,
  },
  primarySubmitButtonText: {
    color: '#8A4FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  unarchiveFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8A4FFF',
    gap: 6,
  },
  unarchiveButtonText: {
    color: '#8A4FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  detailsSection: {
    paddingVertical: 16,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  statusActiveText: {
    color: '#10B981',
  },
  statusInactiveText: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
  },
  audioText: {
    fontSize: 14,
    color: '#8A4FFF',
    fontWeight: '600',
    flex: 1,
  },
  audioFormat: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  timelineText: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: '#333',
  },
  reportId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 6,
  },
  metadataText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  responseItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#8A4FFF',
  },
  responseIndex: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A4FFF',
    marginTop: 2,
  },
  responseText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
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
  shareButtonDisabled: {
    opacity: 0.6,
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
    color: '#fff',
  },
  editButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
    flexDirection: 'row',
    gap: 6,
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  unarchiveButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    flexDirection: 'row',
    gap: 6,
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewerItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  viewerIdContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  viewerIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  viewerIdValue: {
    fontSize: 11,
    color: '#1F2937',
    fontFamily: 'monospace',
    flex: 1,
  },
  copyIcon: {
    marginLeft: 4,
  },
  viewerDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  viewerDetailItem: {
    flex: 1,
    minWidth: 140,
  },
  viewerDetailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
  },
  viewerDetailValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  statusActive: {
    color: '#10B981',
  },
  statusInactive: {
    color: '#EF4444',
  },
  expiryColor: {
    color: '#F59E0B',
  },
  revokeButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revokeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  menuContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuButton: {
    padding: 8,
    marginRight: -8,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
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
    elevation: 20,
    minWidth: 180,
    zIndex: 99999,
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
