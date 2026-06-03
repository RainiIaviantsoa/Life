import { create } from 'zustand'
import { WorkoutsDB, ExercisesDB, generateId, todayISO } from '@/database'
import type { Workout, Exercise } from '@/types'

interface WorkoutState {
  workouts:            Workout[]
  exercises:           Record<string, Exercise[]>
  load:                () => void
  addWorkout:          (name: string, type: string, duration: number) => string
  addExercise:         (workoutId: string, name: string, sets: number, reps: number, weight?: number) => void
  deleteWorkout:       (id: string) => void
  loadExercises:       (workoutId: string) => void
  clearExercisesCache: () => void
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  workouts:  [],
  exercises: {},

  load: () => {
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      set({ workouts: WorkoutsDB.getAll().filter(w => w.date >= cutoffStr) })
    } catch (e) {
      console.error('[WORKOUTS LOAD ERROR]', e)
      set({ workouts: [] })
    }
  },

  addWorkout: (name, type, duration) => {
    const id = generateId()
    WorkoutsDB.insert({
      id, name, type, duration,
      date:      todayISO(),
      notes:     null,
      createdAt: new Date().toISOString(),
    })
    get().load()
    return id
  },

  addExercise: (workoutId, name, sets, reps, weight) => {
    const existing = ExercisesDB.getByWorkout(workoutId)
    ExercisesDB.insert({
      id:         generateId(),
      workoutId,
      name,
      sets,
      reps,
      weight:     weight ?? null,
      rpe:        null,
      rir:        null,
      orderIndex: existing.length,
    })
    get().loadExercises(workoutId)
  },

  deleteWorkout: (id) => {
    WorkoutsDB.delete(id)
    get().load()
  },

  loadExercises: (workoutId) => {
    const exs = ExercisesDB.getByWorkout(workoutId)
    set(s => ({ exercises: { ...s.exercises, [workoutId]: exs } }))
  },

  clearExercisesCache: () => set({ exercises: {} }),
}))
