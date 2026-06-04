import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { initSchema, TasksDB, todayISO } from '@/database';
import { Colors } from '@/constants/theme';
import {
  requestNotificationPermission,
  scheduleDailyMorningReminder,
  scheduleHabitReminder,
} from '@/utils/notifications';
import { generateRecurringTasks, cleanOldRecurringTasks } from '@/utils/recurrence';

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
  const [goOnboarding, setGoOnboarding] = useState(false);

  // Phase 1: DB init + onboarding check (no navigation here)
  useEffect(() => {
    const failsafe = setTimeout(() => {
      console.warn('[SETUP] failsafe triggered')
      setIsReady(true)
    }, 3000)

    const setup = async () => {
      try { initSchema() } catch (e) { console.error('[DB INIT ERROR]', e) }

      try {
        const onboarded = await AsyncStorage.getItem('onboarded')
        if (!onboarded) setGoOnboarding(true)
      } catch (e) {
        console.error('[ONBOARDING ERROR]', e)
      }

      clearTimeout(failsafe)
      setIsReady(true)
    }

    setup().catch(e => {
      console.error('[SETUP FATAL]', e)
      clearTimeout(failsafe)
      setIsReady(true)
    })

    return () => clearTimeout(failsafe)
  }, [])

  // Phase 2: navigate AFTER the Stack is mounted (isReady committed by React)
  useEffect(() => {
    if (!isReady) return

    if (goOnboarding) {
      router.replace('/onboarding')
      return
    }

    setTimeout(() => {
      try {
        generateRecurringTasks()
        cleanOldRecurringTasks()
      } catch (e) {
        console.error('[RECURRENCE ERROR]', e)
      }
    }, 500)

    requestNotificationPermission().then(async (granted) => {
      if (!granted) return
      try {
        const todayTasks = TasksDB.getByDate(todayISO())
        const pending    = todayTasks.filter((t: any) => !t.completed)
        await scheduleDailyMorningReminder(pending.length)
        await scheduleHabitReminder()
      } catch (e) {
        console.error('[NOTIFICATION ERROR]', e)
      }
    }).catch((e) => console.error('[NOTIFICATION PERMISSION ERROR]', e))
  }, [isReady])

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync()
  }, [isReady])

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#00BFA6', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 48 }}>⚡</Text>
        <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 16 }}>Life</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={AppTheme}>
          <View style={{ flex: 1, backgroundColor: Colors.bg0 }}>
            <Stack>
              <Stack.Screen name="index"  options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="settings"
                options={{
                  title:               'Paramètres',
                  headerStyle:         { backgroundColor: Colors.bg0 },
                  headerTintColor:     Colors.text,
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="modal"
                options={{
                  presentation:        'modal',
                  headerStyle:         { backgroundColor: Colors.bg0 },
                  headerTintColor:     Colors.text,
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen name="stats"      options={{ headerShown: false }} />
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
