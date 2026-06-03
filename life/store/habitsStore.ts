import { create } from 'zustand'
import { HabitsDB, generateId, todayISO } from '@/database'
import type { Habit } from '@/types'

interface HabitsState {
  habits:      Habit[]
  load:        () => void
  addHabit:    (name: string, emoji: string, identityStatement?: string, whenField?: string, whereField?: string) => void
  toggleHabit: (id: string) => void
  deleteHabit: (id: string) => void
  useFreeze:   (id: string) => void
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],

  load: () => {
    try {
      const today = todayISO()
      HabitsDB.checkStreaks(today)
      const raw   = HabitsDB.getAll()
      const habits: Habit[] = raw.map(h => ({
        ...h,
        completedToday:   h.lastCompletedDate === today,
        freezesAvailable: h.freezesAvailable  ?? 2,
        freezesUsed:      h.freezesUsed       ?? 0,
        missedYesterday:  h.missedYesterday   ?? 0,
        totalCompletions: h.totalCompletions  ?? 0,
        identityStatement: h.identityStatement ?? null,
        whenField:         h.whenField         ?? null,
        whereField:        h.whereField        ?? null,
      }))
      set({ habits })

      habits.forEach(async h => {
        if (h.streak >= 3 && !h.completedToday) {
          const { scheduleStreakDangerAlert } = await import('@/utils/notifications')
          await scheduleStreakDangerAlert(h.name, h.streak, h.whenField ?? undefined)
        }
      })
    } catch (e) {
      console.error('[HABITS LOAD ERROR]', e)
      set({ habits: [] })
    }
  },

  addHabit: (name, emoji, identityStatement, whenField, whereField) => {
    HabitsDB.insert({
      id: generateId(), name, emoji, streak: 0, createdAt: new Date().toISOString(),
      identityStatement: identityStatement || null,
      whenField:         whenField         || null,
      whereField:        whereField        || null,
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

  useFreeze: (id) => {
    HabitsDB.applyFreeze(id, todayISO())
    get().load()
  },
}))
