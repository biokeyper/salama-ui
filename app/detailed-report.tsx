import { ThemedText } from "@/components/ThemedText";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import AuthGateModal from "@/components/AuthGateModal";

export default function DetailedReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [showAuthGate, setShowAuthGate] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowAuthGate(true);
    }
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AuthGateModal
          visible={showAuthGate}
          onClose={() => {
            router.back();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Please share what happened
        </ThemedText>
        <ThemedText type="title" style={styles.subtitle}>
          in your own words.
        </ThemedText>

        <View style={styles.inputOptionsContainer}>
          {/* Voice Input Button */}
          <TouchableOpacity
            style={styles.inputOption}
            onPress={() => router.push({ pathname: "/record", params })}
            accessibilityLabel="Voice Input"
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="keyboard-voice" size={36} color="#6C63FF" />
            </View>
            <ThemedText style={styles.optionText}>Voice Input</ThemedText>
          </TouchableOpacity>

          {/* Text Input Button */}
          <TouchableOpacity
            style={styles.inputOption}
            onPress={() => router.push({ pathname: "/text-report", params })}
            accessibilityLabel="Text Input"
          >
            <View style={styles.iconContainer}>
              <Feather name="edit" size={36} color="#6C63FF" />
            </View>
            <ThemedText style={styles.optionText}>Text Input</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Decoy Apps Section - Positioned at bottom */}
        <View style={styles.decoyAppsSection}>
          <ThemedText style={styles.decoyAppsTitle}>
            You don&#39;t feel safe? Launch an app
          </ThemedText>
          <View style={styles.decoyAppsRow}>
            <TouchableOpacity
              style={styles.decoyAppButton}
              onPress={() => router.push("/fake-calculator")}
            >
              <Text style={styles.decoyAppIcon}>🔢</Text>
              <ThemedText style={styles.decoyAppText}>Calculator</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.decoyAppButton}
              onPress={() => router.push("/fake-calendar")}
            >
              <Text style={styles.decoyAppIcon}>📅</Text>
              <ThemedText style={styles.decoyAppText}>Calendar</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.decoyAppButton}
              onPress={() => router.push("/tracker")}
            >
              <Text style={styles.decoyAppIcon}>💖</Text>
              <ThemedText style={styles.decoyAppText}>Tracker</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FE",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 40 : 0,
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2E3057",
    textAlign: "center",
    marginTop: 40,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2E3057",
    textAlign: "center",
    marginBottom: 60,
  },
  inputOptionsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  inputOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "47%",
    shadowColor: "#6C63FF",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E3057",
  },
  decoyAppsSection: {
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  decoyAppsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C63FF",
    textAlign: "center",
    marginBottom: 16,
  },
  decoyAppsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  decoyAppButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "30%",
    shadowColor: "#6C63FF",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  decoyAppIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  decoyAppText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2E3057",
    textAlign: "center",
  },
});
