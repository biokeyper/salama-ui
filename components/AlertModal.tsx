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
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#f0fdf4', icon: '#22c55e', border: '#86efac' };
      case 'error':
        return { bg: '#fef2f2', icon: '#ef4444', border: '#fca5a5' };
      case 'warning':
        return { bg: '#fffbeb', icon: '#f59e0b', border: '#fcd34d' };
      case 'info':
      default:
        return { bg: '#f0f9ff', icon: '#3b82f6', border: '#93c5fd' };
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
        <View style={[styles.alertBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.icon }]}>
            <ThemedText style={styles.icon}>{icon}</ThemedText>
          </View>

          <ThemedText style={styles.title}>{title}</ThemedText>

          {message && <ThemedText style={styles.message}>{message}</ThemedText>}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.icon }]}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertBox: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    width: '100%',
    maxWidth: 320,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
