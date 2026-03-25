import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getPanicAlertHistory, PanicAlertHistoryItem } from '@/services/panicService';
import { AlertModal, type AlertType } from '@/components/AlertModal';

export default function PanicAlertDetailsScreen() {
  const router = useRouter();
  const { alertId } = useLocalSearchParams();
  const [alert, setAlert] = useState<PanicAlertHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLink, setMapLink] = useState<string | null>(null);
  const [modalAlert, setModalAlert] = useState<{ visible: boolean; type: AlertType; title: string; message?: string }>({
    visible: false,
    type: 'info',
    title: '',
  });

  useEffect(() => {
    loadAlertDetails();
  }, [alertId]);

  const loadAlertDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPanicAlertHistory(50, 0);
      if (result.success && result.alerts) {
        const foundAlert = result.alerts.find(
          (a) => a.id === parseInt(alertId as string)
        );
        if (foundAlert) {
          setAlert(foundAlert);
          console.log("Panic Alert Details:", foundAlert);
        } else {
          setError("Alert not found");
        }
      } else {
        setError("Failed to load alert details");
      }
    } catch (_err) {
      setError("An error occurred while loading alert details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panic Alert Details</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadAlertDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : alert ? (
        <ScrollView style={styles.content}>
          {/* Alert Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Alert Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  alert.status === "confirmed" && styles.statusBadgeConfirmed,
                  alert.status === "pending" && styles.statusBadgePending,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {alert.status?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Timestamp */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sent At</Text>
            <Text style={styles.sectionValue}>
              {new Date(alert.createdAt).toLocaleString()}
            </Text>
          </View>

          {/* Panic Message */}
          {(alert as any).panicMessage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Panic Message</Text>
              <Text style={styles.messageText}>{(alert as any).panicMessage}</Text>
            </View>
          )}

          {/* Location Data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {(() => {
              if (!alert.locationData) {
                return <Text style={styles.sectionValue}>Location not provided</Text>;
              }

              if (typeof alert.locationData === 'string') {
                if (alert.locationData.startsWith('{')) {
                  try {
                    const locationObj = JSON.parse(alert.locationData);
                    if (locationObj.mapLink) {
                      return (
                        <TouchableOpacity
                          onPress={() => {
                            setMapLink(locationObj.mapLink);
                            setShowMapModal(true);
                            setTimeout(() => {
                              Linking.openURL(locationObj.mapLink).catch(() => {
                                setModalAlert({ visible: true, type: 'error', title: 'Error', message: 'Could not open map' });
                              });
                              setShowMapModal(false);
                            }, 1500);
                          }}
                        >
                          <Text style={styles.mapLink}>📍 View on Map</Text>
                        </TouchableOpacity>
                      );
                    }
                  } catch {
                    return <Text style={styles.sectionValue}>Location not provided</Text>;
                  }
                } else if (alert.locationData === 'emergency-alert-triggered') {
                  return <Text style={styles.sectionValue}>Location not provided</Text>;
                }
                return <Text style={styles.sectionValue}>{alert.locationData}</Text>;
              }

              return <Text style={styles.sectionValue}>{JSON.stringify(alert.locationData)}</Text>;
            })()}
          </View>

          {/* Emergency Contacts */}
          {alert.emergencyContacts && alert.emergencyContacts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency Contacts Notified</Text>
              {alert.emergencyContacts.map((contact: any, index: number) => (
                <View key={index} style={styles.contactCard}>
                  <View style={styles.contactCardHeader}>
                    <Feather name="user" size={18} color="#8B5CF6" />
                    <View style={styles.contactCardInfo}>
                      {contact.name && (
                        <Text style={styles.contactCardName}>{contact.name}</Text>
                      )}
                      {contact.relationship && (
                        <Text style={styles.contactCardRelationship}>{contact.relationship}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.contactCardDetails}>
                    {contact.phone && (
                      <View style={styles.contactDetail}>
                        <Feather name="phone" size={14} color="#6B7280" />
                        <Text style={styles.contactDetailText}>{contact.phone}</Text>
                      </View>
                    )}
                    {contact.email && (
                      <View style={styles.contactDetail}>
                        <Feather name="mail" size={14} color="#6B7280" />
                        <Text style={styles.contactDetailText}>{contact.email}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* Map Opening Modal */}
      <Modal
        visible={showMapModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalContent}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.mapModalText}>Opening Google Maps...</Text>
          </View>
        </View>
      </Modal>

      <AlertModal
        visible={modalAlert.visible}
        type={modalAlert.type}
        title={modalAlert.title}
        message={modalAlert.message}
        onDismiss={() => setModalAlert({ ...modalAlert, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  statusBadgeConfirmed: {
    backgroundColor: "#ECFDF5",
  },
  statusBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  messageText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    fontStyle: "italic",
  },
  hashValue: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "monospace",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 6,
    overflow: "hidden",
  },
  contactCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  contactCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  contactCardInfo: {
    flex: 1,
  },
  contactCardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  contactCardRelationship: {
    fontSize: 12,
    color: "#8B5CF6",
    fontWeight: "500",
    marginTop: 2,
  },
  contactCardDetails: {
    gap: 6,
  },
  contactDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactDetailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  mapLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B5CF6",
    textDecorationLine: "underline",
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    minWidth: 200,
  },
  mapModalText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
});
