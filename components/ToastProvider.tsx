import React from 'react';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

export function ToastProvider() {
  return (
    <Toast
      config={{
        success: (props) => (
          <BaseToast
            {...props}
            style={{ borderLeftColor: '#8B5CF6' }}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            text1Style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#1f2937',
            }}
            text2Style={{
              fontSize: 13,
              color: '#6b7280',
            }}
          />
        ),
        error: (props) => (
          <ErrorToast
            {...props}
            style={{ borderLeftColor: '#ef4444' }}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            text1Style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#1f2937',
            }}
            text2Style={{
              fontSize: 13,
              color: '#6b7280',
            }}
          />
        ),
        info: (props) => (
          <BaseToast
            {...props}
            style={{ borderLeftColor: '#3b82f6' }}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            text1Style={{
              fontSize: 15,
              fontWeight: '600',
              color: '#1f2937',
            }}
            text2Style={{
              fontSize: 13,
              color: '#6b7280',
            }}
          />
        ),
      }}
      topOffset={50}
      visibilityTime={3000}
    />
  );
}
