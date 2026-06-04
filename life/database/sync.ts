import * as SQLite from 'expo-sqlite'
import type { Task, Workout, Exercise, FinanceEntry, BudgetRow, Habit, Pot, Subscription, WishlistItem } from '@/types'

const db = SQLite.openDatabaseSync('life.db')

// ─── Schema init (sync, même connexion que les stores) ────────────────────────

export function initSchema(): void {
  const run = (sql: string) => { try { db.execSync(sql) } catch {} }

  run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT '', time TEXT,
    priority TEXT NOT NULL DEFAULT 'medium', completed INTEGER NOT NULL DEFAULT 0,
    recurrence TEXT NOT NULL DEFAULT 'none',
    parentId TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    createdAt TEXT NOT NULL
  )`)
  run(`CREATE INDEX IF NOT EXISTS idx_tasks_date      ON tasks(date)`)
  run(`CREATE INDEX IF NOT EXISTS idx_tasks_parentId  ON tasks(parentId)`)
  run(`CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)`)

  run(`CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'classic', duration INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL, notes TEXT, createdAt TEXT NOT NULL
  )`)
  run(`CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date)`)

  run(`CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY NOT NULL,
    workoutId TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL, reps INTEGER, sets INTEGER, weight REAL,
    orderIndex INTEGER NOT NULL DEFAULT 0
  )`)
  run(`CREATE INDEX IF NOT EXISTS idx_exercises_workoutId ON exercises(workoutId)`)

  run(`CREATE TABLE IF NOT EXISTS finances (
    id TEXT PRIMARY KEY NOT NULL, amount REAL NOT NULL,
    type TEXT NOT NULL, category TEXT NOT NULL, label TEXT NOT NULL,
    date TEXT NOT NULL, createdAt TEXT NOT NULL
  )`)
  run(`CREATE INDEX IF NOT EXISTS idx_finances_date     ON finances(date)`)
  run(`CREATE INDEX IF NOT EXISTS idx_finances_type     ON finances(type)`)
  run(`CREATE INDEX IF NOT EXISTS idx_finances_category ON finances(category)`)

  run(`CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY NOT NULL, month TEXT NOT NULL UNIQUE,
    monthlyLimit REAL NOT NULL DEFAULT 0, currentSpent REAL NOT NULL DEFAULT 0
  )`)

  run(`CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '✅', streak INTEGER NOT NULL DEFAULT 0,
    lastCompletedDate TEXT, createdAt TEXT NOT NULL
  )`)

  run(`CREATE TABLE IF NOT EXISTS highlights (
    id TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL,
    date TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
  )`)
  run(`CREATE INDEX IF NOT EXISTS idx_highlights_date ON highlights(date)`)

  run(`CREATE TABLE IF NOT EXISTS pots (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🏦', color TEXT NOT NULL DEFAULT '#6C47FF',
    targetAmount REAL NOT NULL DEFAULT 0, currentAmount REAL NOT NULL DEFAULT 0,
    deadline TEXT, createdAt TEXT NOT NULL
  )`)
  run(`CREATE INDEX IF NOT EXISTS idx_pots_createdAt ON pots(createdAt)`)

  run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '📱', amount REAL NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly', nextDate TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other', active INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL
  )`)

  run(`CREATE TABLE IF NOT EXISTS wishlist (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
    amount REAL NOT NULL, emoji TEXT DEFAULT '🛍️',
    addedDate TEXT NOT NULL, unlockDate TEXT NOT NULL,
    purchased INTEGER DEFAULT 0, skipped INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  )`)

  run(`ALTER TABLE tasks     ADD COLUMN time              TEXT`)
  run(`ALTER TABLE tasks     ADD COLUMN isMIT             INTEGER DEFAULT 0`)
  run(`ALTER TABLE habits    ADD COLUMN freezesAvailable  INTEGER DEFAULT 2`)
  run(`ALTER TABLE habits    ADD COLUMN freezesUsed       INTEGER DEFAULT 0`)
  run(`ALTER TABLE habits    ADD COLUMN missedYesterday   INTEGER DEFAULT 0`)
  run(`ALTER TABLE habits    ADD COLUMN identityStatement TEXT`)
  run(`ALTER TABLE habits    ADD COLUMN totalCompletions  INTEGER DEFAULT 0`)
  run(`ALTER TABLE habits    ADD COLUMN whenField         TEXT`)
  run(`ALTER TABLE habits    ADD COLUMN whereField        TEXT`)
  run(`ALTER TABLE exercises ADD COLUMN rpe               REAL`)
  run(`ALTER TABLE exercises ADD COLUMN rir               INTEGER`)
}

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

  toggleMIT: (id: string): void => {
    try {
      db.runSync(`UPDATE tasks SET isMIT = CASE WHEN isMIT = 1 THEN 0 ELSE 1 END WHERE id = ?`, [id])
    } catch {}
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
        'INSERT INTO exercises (id, workoutId, name, reps, sets, weight, orderIndex, rpe, rir) VALUES (?,?,?,?,?,?,?,?,?)',
        [exercise.id, exercise.workoutId, exercise.name, exercise.reps ?? null,
         exercise.sets ?? null, exercise.weight ?? null, exercise.orderIndex ?? 0,
         exercise.rpe ?? null, exercise.rir ?? null]
      )
    } catch {}
  },

  deleteByWorkout: (workoutId: string): void => {
    try { db.runSync('DELETE FROM exercises WHERE workoutId = ?', [workoutId]) } catch {}
  },

  getLastPerformance: (exerciseName: string): any => {
    try {
      return db.getFirstSync(`
        SELECT e.* FROM exercises e
        JOIN workouts w ON e.workoutId = w.id
        WHERE e.name = ?
        ORDER BY w.date DESC, w.createdAt DESC
        LIMIT 1
      `, [exerciseName])
    } catch { return null }
  },

  isPR: (exerciseName: string, weight: number, reps: number): { weightPR: boolean; repsPR: boolean; volumePR: boolean } => {
    try {
      const best = db.getFirstSync(`
        SELECT MAX(weight) as maxWeight, MAX(reps) as maxReps, MAX(weight * reps) as maxVolume
        FROM exercises e
        JOIN workouts w ON e.workoutId = w.id
        WHERE e.name = ?
      `, [exerciseName]) as any
      return {
        weightPR: weight > (best?.maxWeight ?? 0),
        repsPR:   reps > (best?.maxReps ?? 0) && weight >= (best?.maxWeight ?? 0),
        volumePR: (weight * reps) > (best?.maxVolume ?? 0),
      }
    } catch { return { weightPR: false, repsPR: false, volumePR: false } }
  },

  e1RM: (weight: number, reps: number): number => {
    if (reps === 1) return weight
    return Math.round(weight * (1 + reps / 30))
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

  update: (id: string, fields: { amount?: number; type?: string; category?: string; label?: string }): void => {
    try {
      const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
      if (!entries.length) return
      const setClauses = entries.map(([k]) => `${k} = ?`).join(', ')
      const values     = [...entries.map(([, v]) => v), id]
      db.runSync(`UPDATE finances SET ${setClauses} WHERE id = ?`, values as any)
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

  insert: (habit: {
    id: string; name: string; emoji: string; streak: number; createdAt: string
    identityStatement?: string | null; whenField?: string | null; whereField?: string | null
  }): void => {
    try {
      db.runSync(
        `INSERT INTO habits
          (id, name, emoji, streak, lastCompletedDate, createdAt, identityStatement, whenField, whereField)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [habit.id, habit.name, habit.emoji, habit.streak ?? 0, null, habit.createdAt,
         habit.identityStatement ?? null, habit.whenField ?? null, habit.whereField ?? null]
      )
    } catch {}
  },

  delete: (id: string): void => {
    try { db.runSync('DELETE FROM habits WHERE id = ?', [id]) } catch {}
  },

  markCompleted: (id: string, date: string): void => {
    try {
      db.runSync(
        `UPDATE habits SET lastCompletedDate = ?, streak = streak + 1,
         missedYesterday = 0, totalCompletions = totalCompletions + 1 WHERE id = ?`,
        [date, id]
      )
    } catch {}
  },

  checkStreaks: (today: string): void => {
    try {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
      const habits = db.getAllSync<any>('SELECT * FROM habits')
      habits.forEach(h => {
        if (!h.lastCompletedDate) return
        if (h.lastCompletedDate === today)      return
        if (h.lastCompletedDate === yesterday)  return
        if (h.missedYesterday === 1) {
          if (h.freezesAvailable > 0) {
            db.runSync(
              `UPDATE habits SET freezesAvailable = freezesAvailable - 1,
               freezesUsed = freezesUsed + 1, missedYesterday = 0 WHERE id = ?`,
              [h.id]
            )
          } else {
            db.runSync('UPDATE habits SET streak = 0, missedYesterday = 0 WHERE id = ?', [h.id])
          }
        } else {
          db.runSync('UPDATE habits SET missedYesterday = 1 WHERE id = ?', [h.id])
        }
      })
    } catch {}
  },

  applyFreeze: (id: string, date: string): void => {
    try {
      db.runSync(
        `UPDATE habits SET freezesAvailable = freezesAvailable - 1,
         freezesUsed = freezesUsed + 1, streak = streak + 1,
         lastCompletedDate = ?, missedYesterday = 0
         WHERE id = ? AND freezesAvailable > 0`,
        [date, id]
      )
    } catch {}
  },

  rechargeFreeze: (id: string): void => {
    try {
      db.runSync('UPDATE habits SET freezesAvailable = MIN(freezesAvailable + 1, 3) WHERE id = ?', [id])
    } catch {}
  },
}

// ─── SubscriptionsDB ─────────────────────────────────────────────────────────

export const SubscriptionsDB = {
  getAll: (): Subscription[] => {
    try { return db.getAllSync<Subscription>(`SELECT * FROM subscriptions ORDER BY createdAt`) }
    catch { return [] }
  },

  insert: (sub: { id: string; name: string; emoji: string; amount: number; frequency: string; nextDate: string; category: string; createdAt: string }): void => {
    try {
      db.runSync(
        `INSERT INTO subscriptions (id, name, emoji, amount, frequency, nextDate, category, active, createdAt) VALUES (?,?,?,?,?,?,?,1,?)`,
        [sub.id, sub.name, sub.emoji, sub.amount, sub.frequency, sub.nextDate, sub.category, sub.createdAt]
      )
    } catch {}
  },

  toggleActive: (id: string): void => {
    try { db.runSync(`UPDATE subscriptions SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?`, [id]) }
    catch {}
  },

  delete: (id: string): void => {
    try { db.runSync(`DELETE FROM subscriptions WHERE id = ?`, [id]) }
    catch {}
  },

  getMonthlyTotal: (): number => {
    try {
      const subs = db.getAllSync<Subscription>(`SELECT * FROM subscriptions WHERE active = 1`)
      return subs.reduce((sum, s) => {
        const monthly = s.frequency === 'monthly' ? s.amount
          : s.frequency === 'yearly' ? s.amount / 12
          : s.amount * 52 / 12
        return sum + monthly
      }, 0)
    } catch { return 0 }
  },
}

// ─── WishlistDB ───────────────────────────────────────────────────────────────

export const WishlistDB = {
  getAll: (): WishlistItem[] => {
    try { return db.getAllSync<WishlistItem>(`SELECT * FROM wishlist WHERE purchased = 0 AND skipped = 0 ORDER BY addedDate DESC`) }
    catch { return [] }
  },

  insert: (item: { id: string; name: string; amount: number; emoji: string; addedDate: string; unlockDate: string; createdAt: string }): void => {
    try {
      db.runSync(
        `INSERT INTO wishlist (id, name, amount, emoji, addedDate, unlockDate, purchased, skipped, createdAt) VALUES (?,?,?,?,?,?,0,0,?)`,
        [item.id, item.name, item.amount, item.emoji, item.addedDate, item.unlockDate, item.createdAt]
      )
    } catch {}
  },

  markPurchased: (id: string): void => {
    try { db.runSync(`UPDATE wishlist SET purchased = 1 WHERE id = ?`, [id]) }
    catch {}
  },

  markSkipped: (id: string): void => {
    try { db.runSync(`UPDATE wishlist SET skipped = 1 WHERE id = ?`, [id]) }
    catch {}
  },

  getSavings: (): number => {
    try {
      const row = db.getFirstSync<{ total: number }>(`SELECT COALESCE(SUM(amount), 0) as total FROM wishlist WHERE skipped = 1`)
      return row?.total ?? 0
    } catch { return 0 }
  },
}

// ─── PotsDB ───────────────────────────────────────────────────────────────────

export const PotsDB = {
  getAll: (): Pot[] => {
    try { return db.getAllSync<Pot>(`SELECT * FROM pots ORDER BY createdAt`) }
    catch { return [] }
  },

  insert: (pot: { id: string; name: string; emoji: string; color: string; targetAmount: number; deadline?: string | null; createdAt: string }): void => {
    try {
      db.runSync(
        `INSERT INTO pots (id, name, emoji, color, targetAmount, currentAmount, deadline, createdAt) VALUES (?,?,?,?,?,0,?,?)`,
        [pot.id, pot.name, pot.emoji, pot.color, pot.targetAmount, pot.deadline ?? null, pot.createdAt]
      )
    } catch {}
  },

  addAmount: (id: string, amount: number): void => {
    try { db.runSync(`UPDATE pots SET currentAmount = currentAmount + ? WHERE id = ?`, [amount, id]) }
    catch {}
  },

  delete: (id: string): void => {
    try { db.runSync(`DELETE FROM pots WHERE id = ?`, [id]) }
    catch {}
  },
}

// ─── HighlightsDB ─────────────────────────────────────────────────────────────

export const HighlightsDB = {
  getByDate: (date: string): any => {
    try { return db.getFirstSync(`SELECT * FROM highlights WHERE date = ?`, [date]) ?? null }
    catch { return null }
  },

  upsert: (date: string, text: string): void => {
    try {
      const existing = db.getFirstSync<{ id: string }>(`SELECT id FROM highlights WHERE date = ?`, [date])
      if (existing) {
        db.runSync(`UPDATE highlights SET text = ? WHERE date = ?`, [text, date])
      } else {
        db.runSync(
          `INSERT INTO highlights (id, text, date, completed, createdAt) VALUES (?, ?, ?, 0, ?)`,
          [generateId(), text, date, new Date().toISOString()]
        )
      }
    } catch {}
  },

  complete: (date: string): void => {
    try { db.runSync(`UPDATE highlights SET completed = 1 WHERE date = ?`, [date]) }
    catch {}
  },
}
