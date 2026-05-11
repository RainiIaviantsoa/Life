import { getDb, uid, nowIso } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'yoga' | 'other';

export interface Workout {
  id:        string;
  name:      string;
  type:      WorkoutType;
  duration:  number;
  date:      string;
  notes:     string | null;
  createdAt: string;
}

export interface Exercise {
  id:         string;
  workoutId:  string;
  name:       string;
  reps:       number | null;
  sets:       number | null;
  weight:     number | null;
  orderIndex: number;
}

export interface WorkoutWithExercises extends Workout {
  exercises: Exercise[];
}

type CreateWorkoutInput = Pick<Workout, 'name' | 'type' | 'date'> &
  Partial<Pick<Workout, 'duration' | 'notes'>>;

type UpdateWorkoutInput = Partial<Pick<Workout, 'name' | 'type' | 'duration' | 'date' | 'notes'>>;

type CreateExerciseInput = Pick<Exercise, 'workoutId' | 'name'> &
  Partial<Pick<Exercise, 'reps' | 'sets' | 'weight' | 'orderIndex'>>;

type UpdateExerciseInput = Partial<Pick<Exercise, 'name' | 'reps' | 'sets' | 'weight' | 'orderIndex'>>;

// ─── Workouts CRUD ────────────────────────────────────────────────────────────

export async function createWorkout(input: CreateWorkoutInput): Promise<Workout> {
  const db      = await getDb();
  const workout: Workout = {
    id:        uid(),
    name:      input.name,
    type:      input.type,
    duration:  input.duration ?? 0,
    date:      input.date,
    notes:     input.notes ?? null,
    createdAt: nowIso(),
  };

  await db.runAsync(
    `INSERT INTO workouts (id, name, type, duration, date, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [workout.id, workout.name, workout.type, workout.duration, workout.date, workout.notes, workout.createdAt]
  );

  return workout;
}

export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDb();
  return db.getAllAsync<Workout>('SELECT * FROM workouts ORDER BY date DESC');
}

export async function getWorkoutsByDate(date: string): Promise<Workout[]> {
  const db = await getDb();
  return db.getAllAsync<Workout>(
    'SELECT * FROM workouts WHERE date=? ORDER BY createdAt DESC',
    [date]
  );
}

export async function getWorkoutById(id: string): Promise<Workout | null> {
  const db = await getDb();
  return db.getFirstAsync<Workout>('SELECT * FROM workouts WHERE id=?', [id]);
}

export async function getWorkoutWithExercises(id: string): Promise<WorkoutWithExercises | null> {
  const workout = await getWorkoutById(id);
  if (!workout) return null;
  const exercises = await getExercisesByWorkout(id);
  return { ...workout, exercises };
}

export async function updateWorkout(id: string, input: UpdateWorkoutInput): Promise<void> {
  const db      = await getDb();
  const current = await getWorkoutById(id);
  if (!current) return;
  const m = { ...current, ...input };

  await db.runAsync(
    'UPDATE workouts SET name=?, type=?, duration=?, date=?, notes=? WHERE id=?',
    [m.name, m.type, m.duration, m.date, m.notes, id]
  );
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM workouts WHERE id=?', [id]);
}

export async function getWorkoutCountByMonth(month: string): Promise<number> {
  const db  = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM workouts WHERE strftime('%Y-%m', date) = ?",
    [month]
  );
  return row?.count ?? 0;
}

export async function getTotalDurationByMonth(month: string): Promise<number> {
  const db  = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT SUM(duration) as total FROM workouts WHERE strftime('%Y-%m', date) = ?",
    [month]
  );
  return row?.total ?? 0;
}

// ─── Exercises CRUD ───────────────────────────────────────────────────────────

export async function createExercise(input: CreateExerciseInput): Promise<Exercise> {
  const db = await getDb();

  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises WHERE workoutId=?',
    [input.workoutId]
  );
  const orderIndex = input.orderIndex ?? (countRow?.count ?? 0);

  const exercise: Exercise = {
    id:         uid(),
    workoutId:  input.workoutId,
    name:       input.name,
    reps:       input.reps   ?? null,
    sets:       input.sets   ?? null,
    weight:     input.weight ?? null,
    orderIndex,
  };

  await db.runAsync(
    `INSERT INTO exercises (id, workoutId, name, reps, sets, weight, orderIndex)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [exercise.id, exercise.workoutId, exercise.name, exercise.reps, exercise.sets, exercise.weight, exercise.orderIndex]
  );

  return exercise;
}

export async function getExercisesByWorkout(workoutId: string): Promise<Exercise[]> {
  const db = await getDb();
  return db.getAllAsync<Exercise>(
    'SELECT * FROM exercises WHERE workoutId=? ORDER BY orderIndex ASC',
    [workoutId]
  );
}

export async function updateExercise(id: string, input: UpdateExerciseInput): Promise<void> {
  const db      = await getDb();
  const current = await db.getFirstAsync<Exercise>('SELECT * FROM exercises WHERE id=?', [id]);
  if (!current) return;
  const m = { ...current, ...input };

  await db.runAsync(
    'UPDATE exercises SET name=?, reps=?, sets=?, weight=?, orderIndex=? WHERE id=?',
    [m.name, m.reps, m.sets, m.weight, m.orderIndex, id]
  );
}

export async function reorderExercises(workoutId: string, orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        'UPDATE exercises SET orderIndex=? WHERE id=? AND workoutId=?',
        [i, orderedIds[i], workoutId]
      );
    }
  });
}

export async function deleteExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM exercises WHERE id=?', [id]);
}
