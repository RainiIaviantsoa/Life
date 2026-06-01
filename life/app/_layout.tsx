import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { initDatabase } from '@/database';
import { TasksDB, todayISO } from '@/database';
import { Colors } from '@/constants/theme';
import {
  requestNotificationPermission,
  scheduleDailyMorningReminder,
  scheduleHabitReminder,
} from '@/utils/notifications';
import { generateRecurringTasks, cleanOldRecurringTasks } from '@/utils/recurrence';
import { SplashScreen as AppSplashScreen } from '@/components/SplashScreen';

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
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        generateRecurringTasks();
        setTimeout(() => cleanOldRecurringTasks(), 2000);

        const onboarded = await AsyncStorage.getItem('onboarded');
        if (!onboarded) {
          setIsReady(true);
          router.replace('/onboarding');
          return;
        }
      } catch (e) {
        console.error('DB init failed', e);
      }
      setIsReady(true);
    };
    setup();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !isReady) return;
    SplashScreen.hideAsync();

    const setup = async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      const today      = todayISO();
      const todayTasks = TasksDB.getByDate(today);
      const pending    = todayTasks.filter(t => !t.completed);
      await scheduleDailyMorningReminder(pending.length);
      await scheduleHabitReminder();
    };
    setup();
  }, [fontsLoaded, isReady]);

  if (!fontsLoaded || !isReady) {
    return <AppSplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            <Stack.Screen
              name="stats"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
        <StatusBar style="dark" />
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
