import { getDb, uid, nowIso } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskPriority   = 'low' | 'medium' | 'high';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id:         string;
  title:      string;
  date:       string | null;
  priority:   TaskPriority;
  completed:  boolean;
  recurrence: TaskRecurrence;
  parentId:   string | null;
  createdAt:  string;
}

type TaskRow = Omit<Task, 'completed'> & { completed: number };

function rowToTask(row: TaskRow): Task {
  return { ...row, completed: row.completed === 1 };
}

type CreateTaskInput = Pick<Task, 'title'> &
  Partial<Pick<Task, 'date' | 'priority' | 'recurrence' | 'parentId'>>;

type UpdateTaskInput = Partial<Pick<Task, 'title' | 'date' | 'priority' | 'completed' | 'recurrence'>>;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db   = await getDb();
  const task: Task = {
    id:         uid(),
    title:      input.title,
    date:       input.date       ?? null,
    priority:   input.priority   ?? 'medium',
    completed:  false,
    recurrence: input.recurrence ?? 'none',
    parentId:   input.parentId   ?? null,
    createdAt:  nowIso(),
  };

  await db.runAsync(
    `INSERT INTO tasks (id, title, date, priority, completed, recurrence, parentId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.id, task.title, task.date, task.priority, 0, task.recurrence, task.parentId, task.createdAt]
  );

  return task;
}

export async function getAllTasks(): Promise<Task[]> {
  const db   = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE parentId IS NULL ORDER BY date ASC, createdAt DESC'
  );
  return rows.map(rowToTask);
}

export async function getTasksByDate(date: string): Promise<Task[]> {
  const db   = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE date = ? ORDER BY priority DESC, createdAt DESC',
    [date]
  );
  return rows.map(rowToTask);
}

export async function getSubtasks(parentId: string): Promise<Task[]> {
  const db   = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE parentId = ? ORDER BY createdAt ASC',
    [parentId]
  );
  return rows.map(rowToTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db  = await getDb();
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  return row ? rowToTask(row) : null;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<void> {
  const db      = await getDb();
  const current = await getTaskById(id);
  if (!current) return;

  const merged = { ...current, ...input };

  await db.runAsync(
    `UPDATE tasks SET title=?, date=?, priority=?, completed=?, recurrence=?
     WHERE id=?`,
    [merged.title, merged.date, merged.priority, merged.completed ? 1 : 0, merged.recurrence, id]
  );
}

export async function toggleTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE tasks SET completed = CASE WHEN completed=1 THEN 0 ELSE 1 END WHERE id=?',
    [id]
  );
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id=?', [id]);
}

export async function getPendingTasksCount(): Promise<number> {
  const db  = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tasks WHERE completed=0'
  );
  return row?.count ?? 0;
}

export async function getCompletedTasksByDate(date: string): Promise<Task[]> {
  const db   = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE date=? AND completed=1 ORDER BY createdAt DESC',
    [date]
  );
  return rows.map(rowToTask);
}
