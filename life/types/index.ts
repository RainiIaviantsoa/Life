export type Priority   = 'high' | 'medium' | 'low'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'
export type WorkoutMode     = 'classic' | 'emom'
export type FinanceType     = 'expense' | 'income'
export type FinanceCategory =
  | 'food' | 'transport' | 'sport' | 'health' | 'entertainment'
  | 'shopping' | 'bills' | 'salary' | 'freelance' | 'other'

export interface Task {
  id:         string
  title:      string
  date:       string        // YYYY-MM-DD, always present
  time?:      string        // HH:MM optionnel
  priority:   Priority
  completed:  boolean
  recurrence: Recurrence
  parentId?:  string
  createdAt:  string
}

export interface Workout {
  id:        string
  name:      string
  type:      string
  duration:  number
  date:      string
  notes:     string | null
  createdAt: string
}

export interface Exercise {
  id:         string
  workoutId:  string
  name:       string
  sets:       number | null
  reps:       number | null
  weight:     number | null
  orderIndex: number
}

export interface FinanceEntry {
  id:        string
  amount:    number
  type:      FinanceType
  category:  FinanceCategory
  label:     string
  date:      string
  createdAt: string
}

export interface BudgetRow {
  id:           string
  month:        string
  monthlyLimit: number
  currentSpent: number
}

export interface Habit {
  id:                string
  name:              string
  emoji:             string
  streak:            number
  lastCompletedDate: string | null
  createdAt:         string
  completedToday:    boolean
}
