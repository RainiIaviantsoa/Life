import { create } from 'zustand'
import { HabitsDB, generateId, todayISO } from '@/database'
import type { Habit } from '@/types'

interface HabitsState {
  habits:      Habit[]
  load:        () => void
  addHabit:    (name: string, emoji: string) => void
  toggleHabit: (id: string) => void
  deleteHabit: (id: string) => void
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],

  load: () => {
    const today = todayISO()
    const raw   = HabitsDB.getAll()
    const habits: Habit[] = raw.map(h => {
      const completedToday = h.lastCompletedDate === today
      // Reset streak si un jour a été manqué
      if (!completedToday && h.lastCompletedDate) {
        const last = new Date(h.lastCompletedDate)
        const diff = Math.floor((Date.now() - last.getTime()) / 86_400_000)
        if (diff > 1) HabitsDB.resetIfMissed(h.id, today)
      }
      return { ...h, completedToday }
    })
    set({ habits })

    // Fire-and-forget : alertes streak en danger pour habitudes non validées
    habits.forEach(async h => {
      if (h.streak >= 3 && !h.completedToday) {
        const { scheduleStreakDangerAlert } = await import('@/utils/notifications')
        await scheduleStreakDangerAlert(h.name, h.streak)
      }
    })
  },

  addHabit: (name, emoji) => {
    HabitsDB.insert({
      id:        generateId(),
      name,
      emoji,
      streak:    0,
      createdAt: new Date().toISOString(),
    })
    get().load()
  },

  toggleHabit: async (id) => {
    const today = todayISO()
    const habit = get().habits.find(h => h.id === id)
    if (!habit || habit.completedToday) return

    HabitsDB.markCompleted(id, today)
    get().load()

    // Annuler le rappel habitudes si toutes validées
    const allDone = get().habits.every(h => h.completedToday)
    if (allDone) {
      const { cancelHabitReminder } = await import('@/utils/notifications')
      await cancelHabitReminder()
    }
  },

  deleteHabit: (id) => {
    HabitsDB.delete(id)
    get().load()
  },
}))
