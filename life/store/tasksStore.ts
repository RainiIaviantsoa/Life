import { create } from 'zustand'
import { TasksDB, generateId } from '@/database'
import { generateRecurringTasks } from '@/utils/recurrence'
import type { Task, Priority, Recurrence } from '@/types'

interface TasksState {
  tasks:      Task[]
  load:       () => void
  addTask:    (title: string, priority: Priority, recurrence: Recurrence, date: string, time?: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string, deleteAll?: boolean) => void
  updateTask: (id: string, fields: Partial<Task>) => void
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],

  load: () => {
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 60)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      set({ tasks: TasksDB.getAll().filter(t => t.date >= cutoffStr) })
    } catch (e) {
      console.error('[TASKS LOAD ERROR]', e)
      set({ tasks: [] })
    }
  },

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

    // For recurring tasks: generate today's child immediately
    if (recurrence !== 'none') {
      generateRecurringTasks()
    }

    if (task.time) {
      try {
        const { scheduleTaskNotification } = await import('@/utils/notifications')
        await scheduleTaskNotification({ id: task.id, title: task.title, date: task.date, time: task.time })
      } catch {}
    }

    get().load()
  },

  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    TasksDB.update(id, { completed: task.completed ? 0 : 1 })
    get().load()

    if (!task.completed) {
      try {
        const { cancelTaskNotification } = await import('@/utils/notifications')
        await cancelTaskNotification(id)
      } catch {}
    }
  },

  updateTask: (id, fields) => {
    TasksDB.update(id, fields)
    get().load()
  },

  deleteTask: async (id, deleteAll = false) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    const { cancelTaskNotification } = await import('@/utils/notifications')
    await cancelTaskNotification(id)

    if (deleteAll) {
      // If it's a child, delete its parent + all siblings. If it's a parent, delete itself + children.
      const rootId = task.parentId ?? id
      TasksDB.deleteWithChildren(rootId)
    } else {
      TasksDB.delete(id)
    }

    get().load()
  },
}))
