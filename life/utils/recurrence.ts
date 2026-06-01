import { TasksDB, generateId, todayISO } from '@/database'
import { format, addDays, isWeekend, parseISO } from 'date-fns'
import type { Recurrence } from '@/types'

function shouldCreateForDate(recurrence: Recurrence, today: Date, parentDate: string): boolean {
  switch (recurrence) {
    case 'daily':
      return true
    case 'weekly': {
      // Same day of week as the parent's original date
      const parent = parseISO(parentDate)
      return today.getDay() === parent.getDay()
    }
    default:
      return false
  }
}

export function generateRecurringTasks(): void {
  const today = todayISO()
  // Use local midnight to avoid timezone shifts when comparing day-of-week
  const todayDate = new Date(today + 'T00:00:00')
  const recurringTasks = TasksDB.getRecurring()

  recurringTasks.forEach((parent: any) => {
    if (TasksDB.existsForDate(parent.id, today)) return
    if (!shouldCreateForDate(parent.recurrence, todayDate, parent.date)) return

    const child = {
      id:         generateId(),
      title:      parent.title,
      date:       today,
      time:       parent.time ?? undefined,
      priority:   parent.priority,
      completed:  false,
      recurrence: 'none' as Recurrence,
      parentId:   parent.id,
      createdAt:  new Date().toISOString(),
    }

    TasksDB.insert(child)
    console.log(`[Recurrence] Créé: "${parent.title}" pour ${today}`)
  })
}

export function cleanOldRecurringTasks(): void {
  const cutoff = format(addDays(new Date(), -30), 'yyyy-MM-dd')
  TasksDB.cleanOldChildren(cutoff)
  console.log(`[Recurrence] Nettoyage des tâches avant ${cutoff}`)
}
