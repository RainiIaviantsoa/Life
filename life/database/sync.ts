import * as SQLite from 'expo-sqlite'
import type { Task, Workout, Exercise, FinanceEntry, BudgetRow, Habit } from '@/types'

const db = SQLite.openDatabaseSync('life.db')

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const todayISO  = () => new Date().toISOString().slice(0, 10)
export const monthISO  = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// ─── TasksDB ──────────────────────────────────────────────────────────────────

// Maps a raw SQLite row to a typed Task
function rowToTask(r: any): Task {
  return {
    ...r,
    completed: r.completed === 1,
    time:      r.time ?? undefined,
    parentId:  r.parentId ?? undefined,
  }
}

export const TasksDB = {
  // Returns tasks visible in the list:
  // - regular tasks (recurrence='none', no parentId)
  // - recurring children (have parentId)
  // Parent templates (recurrence!='none', no parentId) are hidden — they're just the source of truth.
  getAll: (): Task[] => {
    try {
      return db
        .getAllSync<any>(
          `SELECT * FROM tasks
           WHERE (parentId IS NOT NULL) OR (recurrence = 'none' AND parentId IS NULL)
           ORDER BY date ASC, time ASC, createdAt DESC`
        )
        .filter(r => r.date)
        .map(rowToTask)
    } catch { return [] }
  },

  getByDate: (date: string): Task[] => {
    try {
      return db
        .getAllSync<any>(
          `SELECT * FROM tasks
           WHERE date = ?
             AND ((parentId IS NOT NULL) OR (recurrence = 'none' AND parentId IS NULL))
           ORDER BY time ASC, priority DESC, createdAt DESC`,
          [date]
        )
        .map(rowToTask)
    } catch { return [] }
  },

  getRecurring: (): any[] => {
    try {
      return db.getAllSync<any>(
        `SELECT * FROM tasks WHERE recurrence != 'none' AND parentId IS NULL`
      )
    } catch { return [] }
  },

  existsForDate: (parentId: string, date: string): boolean => {
    try {
      const row = db.getFirstSync<{ id: string }>(
        `SELECT id FROM tasks WHERE parentId = ? AND date = ?`,
        [parentId, date]
      )
      return !!row
    } catch { return false }
  },

  getChildren: (parentId: string): Task[] => {
    try {
      return db
        .getAllSync<any>(
          `SELECT * FROM tasks WHERE parentId = ? ORDER BY date DESC`,
          [parentId]
        )
        .map(rowToTask)
    } catch { return [] }
  },

  deleteWithChildren: (id: string): void => {
    try { db.runSync(`DELETE FROM tasks WHERE id = ? OR parentId = ?`, [id, id]) } catch {}
  },

  cleanOldChildren: (cutoff: string): void => {
    try {
      db.runSync(
        `DELETE FROM tasks WHERE parentId IS NOT NULL AND date < ? AND completed = 1`,
        [cutoff]
      )
    } catch {}
  },

  insert: (task: Task): void => {
    try {
      db.runSync(
        'INSERT INTO tasks (id, title, date, time, priority, completed, recurrence, parentId, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
        [task.id, task.title, task.date, task.time ?? null, task.priority,
         task.completed ? 1 : 0, task.recurrence ?? 'none', task.parentId ?? null, task.createdAt]
      )
    } catch {}
  },

  update: (id: string, fields: Partial<Record<string, unknown>>): void => {
    try {
      const entries = Object.entries(fields)
      if (entries.length === 0) return
      const setClauses = entries.map(([k]) => `${k} = ?`).join(', ')
      const values     = [...entries.map(([, v]) => v), id]
      db.runSync(`UPDATE tasks SET ${setClauses} WHERE id = ?`, values as any)
    } catch {}
  },

  delete: (id: string): void => {
    try { db.runSync('DELETE FROM tasks WHERE id = ?', [id]) } catch {}
  },
}

// ─── WorkoutsDB ───────────────────────────────────────────────────────────────

export const WorkoutsDB = {
  getAll: (): Workout[] => {
    try {
      return db.getAllSync<Workout>(
        'SELECT * FROM workouts ORDER BY date DESC, createdAt DESC'
      )
    } catch { return [] }
  },

  getByDate: (date: string): Workout[] => {
    try {
      return db.getAllSync<Workout>(
        'SELECT * FROM workouts WHERE date = ? ORDER BY createdAt DESC',
        [date]
      )
    } catch { return [] }
  },

  insert: (workout: Workout): void => {
    try {
      db.runSync(
        'INSERT INTO workouts (id, name, type, duration, date, notes, createdAt) VALUES (?,?,?,?,?,?,?)',
        [workout.id, workout.name, workout.type, workout.duration ?? 0,
         workout.date, workout.notes ?? null, workout.createdAt]
      )
    } catch {}
  },

  delete: (id: string): void => {
    try { db.runSync('DELETE FROM workouts WHERE id = ?', [id]) } catch {}
  },
}

// ─── ExercisesDB ──────────────────────────────────────────────────────────────

export const ExercisesDB = {
  getAll: (): Exercise[] => {
    try {
      return db.getAllSync<Exercise>('SELECT * FROM exercises ORDER BY workoutId, orderIndex ASC')
    } catch { return [] }
  },

  getByWorkout: (workoutId: string): Exercise[] => {
    try {
      return db.getAllSync<Exercise>(
        'SELECT * FROM exercises WHERE workoutId = ? ORDER BY orderIndex ASC',
        [workoutId]
      )
    } catch { return [] }
  },

  insert: (exercise: Exercise): void => {
    try {
      db.runSync(
        'INSERT INTO exercises (id, workoutId, name, reps, sets, weight, orderIndex) VALUES (?,?,?,?,?,?,?)',
        [exercise.id, exercise.workoutId, exercise.name, exercise.reps ?? null,
         exercise.sets ?? null, exercise.weight ?? null, exercise.orderIndex ?? 0]
      )
    } catch {}
  },

  deleteByWorkout: (workoutId: string): void => {
    try { db.runSync('DELETE FROM exercises WHERE workoutId = ?', [workoutId]) } catch {}
  },
}

// ─── FinancesDB ───────────────────────────────────────────────────────────────

export const FinancesDB = {
  getAll: (): FinanceEntry[] => {
    try {
      return db.getAllSync<FinanceEntry>(
        'SELECT * FROM finances ORDER BY date DESC, createdAt DESC'
      )
    } catch { return [] }
  },

  getByDate: (date: string): FinanceEntry[] => {
    try {
      return db.getAllSync<FinanceEntry>(
        'SELECT * FROM finances WHERE date = ? ORDER BY createdAt DESC',
        [date]
      )
    } catch { return [] }
  },

  getByMonth: (month: string): FinanceEntry[] => {
    try {
      return db.getAllSync<FinanceEntry>(
        "SELECT * FROM finances WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC",
        [month]
      )
    } catch { return [] }
  },

  insert: (entry: FinanceEntry): void => {
    try {
      db.runSync(
        'INSERT INTO finances (id, amount, type, category, label, date, createdAt) VALUES (?,?,?,?,?,?,?)',
        [entry.id, entry.amount, entry.type, entry.category, entry.label, entry.date, entry.createdAt]
      )
    } catch {}
  },

  delete: (id: string): void => {
    try { db.runSync('DELETE FROM finances WHERE id = ?', [id]) } catch {}
  },

  sumExpensesByMonth: (month: string): number => {
    try {
      const row = db.getFirstSync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM finances WHERE type = 'expense' AND strftime('%Y-%m', date) = ?",
        [month]
      )
      return row?.total ?? 0
    } catch { return 0 }
  },

  sumIncomeByMonth: (month: string): number => {
    try {
      const row = db.getFirstSync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM finances WHERE type = 'income' AND strftime('%Y-%m', date) = ?",
        [month]
      )
      return row?.total ?? 0
    } catch { return 0 }
  },
}

// ─── BudgetsDB ────────────────────────────────────────────────────────────────

export const BudgetsDB = {
  getByMonth: (month: string): BudgetRow | null => {
    try {
      return db.getFirstSync<BudgetRow>(
        'SELECT * FROM budgets WHERE month = ?', [month]
      ) ?? null
    } catch { return null }
  },

  upsert: (month: string, limit: number): void => {
    try {
      const existing = db.getFirstSync<{ id: string }>(
        'SELECT id FROM budgets WHERE month = ?', [month]
      )
      if (existing) {
        db.runSync('UPDATE budgets SET monthlyLimit = ? WHERE month = ?', [limit, month])
      } else {
        db.runSync(
          'INSERT INTO budgets (id, month, monthlyLimit, currentSpent) VALUES (?,?,?,?)',
          [generateId(), month, limit, 0]
        )
      }
    } catch {}
  },
}

// ─── HabitsDB ─────────────────────────────────────────────────────────────────

export const HabitsDB = {
  getAll: (): Omit<Habit, 'completedToday'>[] => {
    try {
      return db.getAllSync<Omit<Habit, 'completedToday'>>(
        'SELECT * FROM habits ORDER BY createdAt ASC'
      )
    } catch { return [] }
  },

  insert: (habit: { id: string; name: string; emoji: string; streak: number; createdAt: string }): void => {
    try {
      db.runSync(
        'INSERT INTO habits (id, name, emoji, streak, lastCompletedDate, createdAt) VALUES (?,?,?,?,?,?)',
        [habit.id, habit.name, habit.emoji, habit.streak ?? 0, null, habit.createdAt]
      )
    } catch {}
  },

  delete: (id: string): void => {
    try { db.runSync('DELETE FROM habits WHERE id = ?', [id]) } catch {}
  },

  markCompleted: (id: string, date: string): void => {
    try {
      const row = db.getFirstSync<{ streak: number; lastCompletedDate: string | null }>(
        'SELECT streak, lastCompletedDate FROM habits WHERE id = ?', [id]
      )
      if (!row) return
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
      const newStreak = row.lastCompletedDate === yesterday ? row.streak + 1 : 1
      db.runSync(
        'UPDATE habits SET streak = ?, lastCompletedDate = ? WHERE id = ?',
        [newStreak, date, id]
      )
    } catch {}
  },

  resetIfMissed: (id: string, _today: string): void => {
    try { db.runSync('UPDATE habits SET streak = 0 WHERE id = ?', [id]) } catch {}
  },
}
