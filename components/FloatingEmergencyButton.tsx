import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateModal from './AuthGateModal';

interface FloatingEmergencyButtonProps {
  onPress: () => void;
}

export default function FloatingEmergencyButton({ onPress }: FloatingEmergencyButtonProps) {
  const { user } = useAuth();
  const [showAuthGate, setShowAuthGate] = useState(false);

  const handlePress = () => {
    // Check if user is logged in before allowing panic alert
    if (!user) {
      setShowAuthGate(true);
      return;
    }
    onPress();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <MaterialIcons name="favorite" size={28} color="#EF4444" />
      </TouchableOpacity>

      {/* Auth gate for unauthenticated users */}
      <AuthGateModal
        visible={showAuthGate}
        onClose={() => setShowAuthGate(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 100,
  },
});
