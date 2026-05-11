import { create } from 'zustand'
import { TasksDB, generateId } from '@/database'
import type { Task, Priority, Recurrence } from '@/types'

interface TasksState {
  tasks:      Task[]
  load:       () => void
  addTask:    (title: string, priority: Priority, recurrence: Recurrence, date: string, time?: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],

  load: () => set({ tasks: TasksDB.getAll() }),

  addTask: async (title, priority, recurrence, date, time?) => {
    const task: Task = {
      id:         generateId(),
      title,
      date,
      time:       time ?? undefined,
      priority,
      completed:  false,
      recurrence,
      parentId:   undefined,
      createdAt:  new Date().toISOString(),
    }
    TasksDB.insert(task)
    get().load()

    // Programmer notification si heure définie
    if (task.time) {
      const { scheduleTaskNotification } = await import('@/utils/notifications')
      await scheduleTaskNotification({
        id:    task.id,
        title: task.title,
        date:  task.date,
        time:  task.time,
      })
    }
  },

  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    // Annuler la notification si la tâche devient complétée
    if (!task.completed) {
      const { cancelTaskNotification } = await import('@/utils/notifications')
      await cancelTaskNotification(id)
    }

    TasksDB.update(id, { completed: task.completed ? 0 : 1 })
    get().load()
  },

  deleteTask: async (id) => {
    const { cancelTaskNotification } = await import('@/utils/notifications')
    await cancelTaskNotification(id)
    TasksDB.delete(id)
    get().load()
  },
}))
