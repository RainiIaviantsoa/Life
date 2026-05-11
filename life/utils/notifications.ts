import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

// Configuration affichage notification quand app ouverte
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
})

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return false

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C47FF',
    })
    await Notifications.setNotificationChannelAsync('habits', {
      name: 'Habitudes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00C896',
    })
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Tâches',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#6C47FF',
    })
  }

  return true
}

// ─── Annulations ──────────────────────────────────────────────────────────────

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id)
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// ─── Tâches ───────────────────────────────────────────────────────────────────

export async function scheduleTaskNotification(task: {
  id:    string
  title: string
  date:  string   // YYYY-MM-DD
  time:  string   // HH:MM
}): Promise<void> {
  const [year, month, day] = task.date.split('-').map(Number)
  const [hour, minute]     = task.time.split(':').map(Number)

  const trigger = new Date(year, month - 1, day, hour, minute, 0)
  if (trigger <= new Date()) return  // date passée, on skip

  await Notifications.scheduleNotificationAsync({
    identifier: `task-${task.id}`,
    content: {
      title: '📋 Tâche à faire',
      body:   task.title,
      sound:  true,
      data:   { type: 'task', id: task.id },
    },
    trigger: trigger as any,
  })
}

export async function cancelTaskNotification(taskId: string) {
  await cancelNotification(`task-${taskId}`)
}

// ─── Récapitulatif matin ──────────────────────────────────────────────────────

export async function scheduleDailyMorningReminder(taskCount: number) {
  await cancelNotification('morning-reminder')
  if (taskCount === 0) return

  await Notifications.scheduleNotificationAsync({
    identifier: 'morning-reminder',
    content: {
      title: '☀️ Bonne journée !',
      body: taskCount === 1
        ? "Tu as 1 tâche aujourd'hui"
        : `Tu as ${taskCount} tâches aujourd'hui`,
      sound: true,
      data: { type: 'morning' },
    },
    trigger: {
      hour:    8,
      minute:  0,
      repeats: true,
    } as any,
  })
}

// ─── Habitudes ────────────────────────────────────────────────────────────────

export async function scheduleHabitReminder() {
  await cancelNotification('habit-reminder')

  await Notifications.scheduleNotificationAsync({
    identifier: 'habit-reminder',
    content: {
      title: '⚡ Tes habitudes t\'attendent',
      body:   "Tu n'as pas encore validé toutes tes habitudes aujourd'hui 🔥",
      sound:  true,
      data:   { type: 'habits' },
    },
    trigger: {
      hour:    21,
      minute:  0,
      repeats: true,
    } as any,
  })
}

export async function cancelHabitReminder() {
  await cancelNotification('habit-reminder')
}

// ─── Streak en danger ─────────────────────────────────────────────────────────

export async function scheduleStreakDangerAlert(habitName: string, streak: number) {
  const id = `streak-danger-${habitName}`
  await cancelNotification(id)

  if (streak < 3) return

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: '🔥 Streak en danger !',
      body:   `Ta série de ${streak} jours pour "${habitName}" risque de se casser !`,
      sound:  true,
      data:   { type: 'streak' },
    },
    trigger: {
      hour:    20,
      minute:  0,
      repeats: true,
    } as any,
  })
}
