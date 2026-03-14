import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateModal from '@/components/AuthGateModal';

export default function SafetyCheckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [showAuthGate, setShowAuthGate] = useState(false);

  // Check if user is logged in - if not, show auth gate
  useEffect(() => {
    if (!user) {
      setShowAuthGate(true);
    }
  }, [user]);

  const handleYes = () => {
    // Continue to detailed report (choose Voice or Text)
    router.push({
      pathname: '/detailed-report',
      params,
    });
  };

  const handleNo = () => {
    // Go back to home if not safe
    router.replace('/(tabs)');
  };

  if (!user) {
    return (
      <View style={styles.container}>
        {/* Show auth gate - user must log in to continue */}
        <AuthGateModal
          visible={showAuthGate}
          onClose={() => {
            // Close modal and redirect back
            router.back();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        “Before we continue, take a deep breath. You are safe here, and you can stop at any time.”
      </Text>
      <Text style={styles.question}>
        Do you feel safe right now?
      </Text>
      <TouchableOpacity style={styles.buttonYes} onPress={handleYes}>
        <Text style={styles.buttonTextYes}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.buttonNo} onPress={handleNo}>
        <Text style={styles.buttonTextNo}>No</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  message: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  question: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '400',
  },
  buttonYes: {
    width: '100%',
    backgroundColor: '#8A4FFF',
    paddingVertical: 18,
    borderRadius: 25,
    marginBottom: 18,
    alignItems: 'center',
  },
  buttonTextYes: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonNo: {
    width: '100%',
    backgroundColor: '#FF3B30',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonTextNo: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});