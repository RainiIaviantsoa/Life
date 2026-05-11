import { create } from 'zustand'
import { TasksDB, FinancesDB, BudgetsDB, HabitsDB, WorkoutsDB, todayISO, monthISO } from '@/database'

interface DashboardState {
  todayTasks:   any[]
  todayExpenses: number
  monthBudget:  { limit: number; spent: number }
  habits:       any[]
  todayWorkout: any | null
  load:         () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  todayTasks:    [],
  todayExpenses: 0,
  monthBudget:   { limit: 0, spent: 0 },
  habits:        [],
  todayWorkout:  null,

  load: () => {
    const today   = todayISO()
    const month   = monthISO()
    const tasks    = TasksDB.getByDate(today)
    const spent    = FinancesDB.sumExpensesByMonth(month)
    const budget   = BudgetsDB.getByMonth(month)
    const habits   = HabitsDB.getAll()
    const workouts = WorkoutsDB.getByDate(today)
    set({
      todayTasks:    tasks,
      todayExpenses: spent,
      monthBudget:   { limit: budget?.monthlyLimit ?? 0, spent },
      habits,
      todayWorkout:  workouts[0] ?? null,
    })
  },
}))
