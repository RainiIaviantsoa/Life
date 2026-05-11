import { getDb, uid, nowIso } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Habit {
  id:                string;
  name:              string;
  emoji:             string;
  streak:            number;
  lastCompletedDate: string | null;
  createdAt:         string;
}

type CreateHabitInput = Pick<Habit, 'name'> & Partial<Pick<Habit, 'emoji'>>;
type UpdateHabitInput = Partial<Pick<Habit, 'name' | 'emoji'>>;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const db    = await getDb();
  const habit: Habit = {
    id:                uid(),
    name:              input.name,
    emoji:             input.emoji ?? '✅',
    streak:            0,
    lastCompletedDate: null,
    createdAt:         nowIso(),
  };

  await db.runAsync(
    `INSERT INTO habits (id, name, emoji, streak, lastCompletedDate, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [habit.id, habit.name, habit.emoji, habit.streak, habit.lastCompletedDate, habit.createdAt]
  );

  return habit;
}

export async function getAllHabits(): Promise<Habit[]> {
  const db = await getDb();
  return db.getAllAsync<Habit>('SELECT * FROM habits ORDER BY createdAt ASC');
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const db = await getDb();
  return db.getFirstAsync<Habit>('SELECT * FROM habits WHERE id=?', [id]);
}

export async function updateHabit(id: string, input: UpdateHabitInput): Promise<void> {
  const db      = await getDb();
  const current = await getHabitById(id);
  if (!current) return;
  const m = { ...current, ...input };
  await db.runAsync('UPDATE habits SET name=?, emoji=? WHERE id=?', [m.name, m.emoji, id]);
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM habits WHERE id=?', [id]);
}

/**
 * Marks a habit as completed for today.
 * Increments streak if last completion was yesterday, resets to 1 otherwise.
 * No-ops if already completed today.
 */
export async function markHabitCompleted(id: string): Promise<Habit | null> {
  const db    = await getDb();
  const habit = await getHabitById(id);
  if (!habit) return null;

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  if (habit.lastCompletedDate === today) return habit;

  const newStreak =
    habit.lastCompletedDate === yesterday
      ? habit.streak + 1
      : 1;

  await db.runAsync(
    'UPDATE habits SET streak=?, lastCompletedDate=? WHERE id=?',
    [newStreak, today, id]
  );

  return { ...habit, streak: newStreak, lastCompletedDate: today };
}

/**
 * Resets streak to 0 and clears lastCompletedDate (manual reset).
 */
export async function resetHabitStreak(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE habits SET streak=0, lastCompletedDate=NULL WHERE id=?',
    [id]
  );
}

export async function isHabitCompletedToday(id: string): Promise<boolean> {
  const habit = await getHabitById(id);
  if (!habit) return false;
  const today = new Date().toISOString().slice(0, 10);
  return habit.lastCompletedDate === today;
}

export async function getCompletedHabitsToday(): Promise<Habit[]> {
  const db    = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.getAllAsync<Habit>(
    'SELECT * FROM habits WHERE lastCompletedDate=? ORDER BY streak DESC',
    [today]
  );
}

export async function getLongestStreakHabit(): Promise<Habit | null> {
  const db = await getDb();
  return db.getFirstAsync<Habit>('SELECT * FROM habits ORDER BY streak DESC LIMIT 1');
}
