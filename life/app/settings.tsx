import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import {
  cancelNotification,
  scheduleDailyMorningReminder,
  scheduleHabitReminder,
  cancelHabitReminder,
} from '@/utils/notifications'
import { TasksDB, todayISO } from '@/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifPrefs {
  morningReminder: boolean
  habitReminder:   boolean
  streakAlert:     boolean
  taskReminders:   boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  morningReminder: true,
  habitReminder:   true,
  streakAlert:     true,
  taskReminders:   true,
}

const STORAGE_KEY = 'notif-prefs'

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label, description, value, onValueChange,
}: { label: string; description: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={st.toggleRow}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={st.toggleLabel}>{label}</Text>
        <Text style={st.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#C5D5DC', true: '#00BFA6' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#C5D5DC"
      />
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)

  // Charger préférences au montage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setPrefs(JSON.parse(val))
    })
  }, [])

  const updatePref = async (key: keyof NotifPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    if (key === 'morningReminder') {
      if (!value) {
        await cancelNotification('morning-reminder')
      } else {
        const pending = TasksDB.getByDate(todayISO()).filter(t => !t.completed)
        await scheduleDailyMorningReminder(pending.length)
      }
    }

    if (key === 'habitReminder') {
      if (!value) {
        await cancelHabitReminder()
      } else {
        await scheduleHabitReminder()
      }
    }

    if (key === 'streakAlert') {
      if (!value) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync()
        for (const n of scheduled) {
          if (n.identifier.startsWith('streak-danger-')) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier)
          }
        }
      }
      // Si activé, sera reprogrammé au prochain chargement de habitsStore
    }

    if (key === 'taskReminders') {
      if (!value) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync()
        for (const n of scheduled) {
          if (n.identifier.startsWith('task-')) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier)
          }
        }
      }
      // Si activé, les nouvelles tâches avec heure obtiendront leurs notifications
    }
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      {/* Header custom */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={st.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={st.title}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Section notifications */}
        <Text style={st.sectionTitle}>Notifications</Text>

        <View style={st.card}>
          <ToggleRow
            label="Rappel du matin"
            description="Résumé de tes tâches du jour à 8h00"
            value={prefs.morningReminder}
            onValueChange={v => updatePref('morningReminder', v)}
          />
          <View style={st.divider} />
          <ToggleRow
            label="Rappel habitudes"
            description="Rappel à 21h si toutes les habitudes ne sont pas validées"
            value={prefs.habitReminder}
            onValueChange={v => updatePref('habitReminder', v)}
          />
          <View style={st.divider} />
          <ToggleRow
            label="Streak en danger"
            description="Alerte à 20h si un streak de 3+ jours risque de se briser"
            value={prefs.streakAlert}
            onValueChange={v => updatePref('streakAlert', v)}
          />
          <View style={st.divider} />
          <ToggleRow
            label="Rappels tâches"
            description="Notification à l'heure définie pour chaque tâche planifiée"
            value={prefs.taskReminders}
            onValueChange={v => updatePref('taskReminders', v)}
          />
        </View>

        {/* Section infos */}
        <Text style={st.sectionTitle}>À propos</Text>
        <View style={st.card}>
          <View style={st.infoRow}>
            <Text style={st.infoLabel}>Version</Text>
            <Text style={st.infoValue}>1.0.0</Text>
          </View>
          <View style={st.divider} />
          <View style={st.infoRow}>
            <Text style={st.infoLabel}>Données</Text>
            <Text style={st.infoValue}>Stockées localement</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#FFF8F0' },
  scroll:{ paddingHorizontal: 16, paddingBottom: 40 },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop:     12,
    paddingBottom:  8,
  },
  backBtn:   { width: 40, alignItems: 'flex-start' },
  backArrow: { fontSize: 22, color: '#00BFA6', fontWeight: '600' },
  title:     { fontSize: 18, fontWeight: '800', color: '#264653' },

  sectionTitle: {
    fontSize:   12,
    fontWeight: '700',
    color:      '#7A9AAB',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop:  20,
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius:    20,
    paddingHorizontal: 16,
    shadowColor:     '#00BFA6',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       2,
  },

  toggleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 14,
  },
  toggleLabel: {
    fontSize:   15,
    fontWeight: '600',
    color:      '#264653',
    marginBottom: 3,
  },
  toggleDesc: {
    fontSize: 12,
    color:    '#4A7080',
    lineHeight: 16,
  },

  divider: { height: 0.5, backgroundColor: '#E0EDF2' },

  infoRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 15, fontWeight: '600', color: '#264653' },
  infoValue: { fontSize: 13, color: '#4A7080' },
})
