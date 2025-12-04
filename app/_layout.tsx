import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { BackgroundRecordingProvider } from '@/contexts/BackgroundRecordingContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeProvider as CustomThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';

function RootNavigator() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            title: 'SafeGirls',
            animation: 'fade_from_bottom',
          }}
        />

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

        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <CustomThemeProvider>
      <SettingsProvider>
        <BackgroundRecordingProvider>
          <RootNavigator />
        </BackgroundRecordingProvider>
      </SettingsProvider>
    </CustomThemeProvider>
  );
}
