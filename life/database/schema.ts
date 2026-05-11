import { getDb } from './client';

export async function initDatabase(): Promise<void> {
  const db = await getDb();

  // Drop & recreate to pick up schema changes during development
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY NOT NULL,
      title       TEXT NOT NULL,
      date        TEXT NOT NULL DEFAULT '',
      time        TEXT,
      priority    TEXT NOT NULL DEFAULT 'medium',
      completed   INTEGER NOT NULL DEFAULT 0,
      recurrence  TEXT NOT NULL DEFAULT 'none',
      parentId    TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      createdAt   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_date      ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_parentId  ON tasks(parentId);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

    CREATE TABLE IF NOT EXISTS workouts (
      id        TEXT PRIMARY KEY NOT NULL,
      name      TEXT NOT NULL,
      type      TEXT NOT NULL DEFAULT 'classic',
      duration  INTEGER NOT NULL DEFAULT 0,
      date      TEXT NOT NULL,
      notes     TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);

    CREATE TABLE IF NOT EXISTS exercises (
      id          TEXT PRIMARY KEY NOT NULL,
      workoutId   TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      reps        INTEGER,
      sets        INTEGER,
      weight      REAL,
      orderIndex  INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_exercises_workoutId ON exercises(workoutId);

    CREATE TABLE IF NOT EXISTS finances (
      id        TEXT PRIMARY KEY NOT NULL,
      amount    REAL NOT NULL,
      type      TEXT NOT NULL,
      category  TEXT NOT NULL,
      label     TEXT NOT NULL,
      date      TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_finances_date     ON finances(date);
    CREATE INDEX IF NOT EXISTS idx_finances_type     ON finances(type);
    CREATE INDEX IF NOT EXISTS idx_finances_category ON finances(category);

    CREATE TABLE IF NOT EXISTS budgets (
      id            TEXT PRIMARY KEY NOT NULL,
      month         TEXT NOT NULL UNIQUE,
      monthlyLimit  REAL NOT NULL DEFAULT 0,
      currentSpent  REAL NOT NULL DEFAULT 0
    );

    -- Migration : ajoute la colonne time si absente (idempotent)
    -- Géré dans le code async ci-dessous.

    CREATE TABLE IF NOT EXISTS habits (
      id                TEXT PRIMARY KEY NOT NULL,
      name              TEXT NOT NULL,
      emoji             TEXT NOT NULL DEFAULT '✅',
      streak            INTEGER NOT NULL DEFAULT 0,
      lastCompletedDate TEXT,
      createdAt         TEXT NOT NULL
    );
  `);

  // Migration : ajoute time si la table tasks existait sans cette colonne
  try {
    await db.execAsync('ALTER TABLE tasks ADD COLUMN time TEXT');
  } catch {
    // Colonne déjà présente — OK
  }
}
