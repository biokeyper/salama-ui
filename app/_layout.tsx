import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View, ActivityIndicator } from 'react-native';

import { BackgroundRecordingProvider } from '@/contexts/BackgroundRecordingContext';
import { PinProtectionProvider } from '@/contexts/PinProtectionContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeProvider as CustomThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { EmergencyAlertProvider } from '@/contexts/EmergencyAlertContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { initDatabase } from '@/services/database';
import FloatingEmergencyButton from '@/components/FloatingEmergencyButton';
import EmergencyAlertModal from '@/components/EmergencyAlertModal';

interface RootNavigatorProps {
  emergencyModalVisible: boolean;
  onOpenEmergencyModal: () => void;
  onCloseEmergencyModal: () => void;
}

function RootNavigator({
  emergencyModalVisible,
  onOpenEmergencyModal,
  onCloseEmergencyModal,
}: RootNavigatorProps) {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
              title: 'SafeGirls',
              animation: 'fade_from_bottom',
            }}
          />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />

          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="fake-calculator" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="fake-calendar" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="tracker" options={{ headerShown: false }} />

          <Stack.Screen
            name="safety-check"
            options={{
              title: 'Safety Check',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="detailed-report"
            options={{
              title: 'Detailed Report',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="text-report"
            options={{
              title: 'Text Report',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="record-past"
            options={{
              title: 'Record Past Event',
              headerBackTitle: 'Back'
            }}
          />

          <Stack.Screen
            name="settings"
            options={{
              headerShown: false
            }}
          />

          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
              animationEnabled: true,
            }}
          />
          <Stack.Screen
            name="signup"
            options={{
              headerShown: false,
              animationEnabled: true,
            }}
          />

          <Stack.Screen
            name="account"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="panic-history"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="notifications"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen name="+not-found" />
        </Stack>
        <FloatingEmergencyButton onPress={onOpenEmergencyModal} />
        <EmergencyAlertModal visible={emergencyModalVisible} onClose={onCloseEmergencyModal} />
      </View>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [dbInitialized, setDbInitialized] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);

  // Initialize database on app launch
  useEffect(() => {
    initDatabase()
      .then(() => {
        console.log('Database initialized successfully');
        setDbInitialized(true);
      })
      .catch((error) => {
        console.error('Error initializing database:', error);
        // Retry after a delay
        setTimeout(() => {
          initDatabase()
            .then(() => {
              console.log('Database initialized successfully (retry)');
              setDbInitialized(true);
            })
            .catch((retryError) => {
              console.error('Database initialization failed after retry:', retryError);
              setDbInitialized(true); // Allow app to continue anyway
            });
        }, 1000);
      });
  }, []);

  if (!loaded || !dbInitialized) {
    // Show loading screen while fonts and database are loading
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <EmergencyAlertProvider>
          <CustomThemeProvider>
            <PinProtectionProvider>
              <SettingsProvider>
                <BackgroundRecordingProvider>
                  <RootNavigator
                    emergencyModalVisible={emergencyModalVisible}
                    onOpenEmergencyModal={() => setEmergencyModalVisible(true)}
                    onCloseEmergencyModal={() => setEmergencyModalVisible(false)}
                  />
                </BackgroundRecordingProvider>
              </SettingsProvider>
            </PinProtectionProvider>
          </CustomThemeProvider>
        </EmergencyAlertProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
