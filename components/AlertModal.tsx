/**
 * Custom Alert Modal Component
 * Replaces React Native's basic Alert.alert()
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from './ThemedText';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertModalProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message?: string;
  buttonText?: string;
  onPress: () => void;
}

export function AlertModal({
  visible,
  type,
  title,
  message,
  buttonText = 'OK',
  onPress,
}: AlertModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '•';
      case 'warning':
        return '!';
      case 'info':
      default:
        return '•';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return { accent: '#22c55e', text: '#16a34a' };
      case 'error':
        return { accent: '#ef4444', text: '#dc2626' };
      case 'warning':
        return { accent: '#f59e0b', text: '#d97706' };
      case 'info':
      default:
        return { accent: '#8A4FFF', text: '#7c3aed' };
    }
  };

  const colors = getColors();
  const icon = getIcon();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onPress}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <View style={[styles.iconContainer, { borderColor: colors.accent }]}>
            <ThemedText style={[styles.icon, { color: colors.accent }]}>{icon}</ThemedText>
          </View>

          <ThemedText style={styles.title}>{title}</ThemedText>

          {message && <ThemedText style={styles.message}>{message}</ThemedText>}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={onPress}
          >
            <ThemedText style={styles.buttonText}>{buttonText}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertBox: {
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 20,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
