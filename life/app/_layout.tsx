import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { initDatabase } from '@/database';
import { TasksDB, todayISO } from '@/database';
import { Colors } from '@/constants/theme';
import {
  requestNotificationPermission,
  scheduleDailyMorningReminder,
  scheduleHabitReminder,
} from '@/utils/notifications';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary:      Colors.violet,
    background:   Colors.bg0,
    card:         Colors.bg0,
    text:         Colors.text,
    border:       Colors.border,
    notification: Colors.violet,
  },
};

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch(e => {
        console.error('DB init failed', e);
        setDbReady(true);
      });
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !dbReady) return;
    SplashScreen.hideAsync();

    // Setup notifications après initialisation DB
    const setup = async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      const today        = todayISO();
      const todayTasks   = TasksDB.getByDate(today);
      const pending      = todayTasks.filter(t => !t.completed);
      await scheduleDailyMorningReminder(pending.length);
      await scheduleHabitReminder();
    };
    setup();
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg0 }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={AppTheme}>
        <View style={{ flex: 1, backgroundColor: Colors.bg0 }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings"
              options={{
                title: 'Paramètres',
                headerStyle: { backgroundColor: Colors.bg0 },
                headerTintColor: Colors.text,
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation:    'modal',
                headerStyle:     { backgroundColor: Colors.bg0 },
                headerTintColor: Colors.text,
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
        <StatusBar style="dark" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
