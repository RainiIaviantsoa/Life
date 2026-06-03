import { getDb } from './client';

export async function initDatabase(): Promise<void> {
  const db = await getDb();

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

    CREATE TABLE IF NOT EXISTS habits (
      id                TEXT PRIMARY KEY NOT NULL,
      name              TEXT NOT NULL,
      emoji             TEXT NOT NULL DEFAULT '✅',
      streak            INTEGER NOT NULL DEFAULT 0,
      lastCompletedDate TEXT,
      createdAt         TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id        TEXT PRIMARY KEY NOT NULL,
      text      TEXT NOT NULL,
      date      TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_highlights_date ON highlights(date);

    CREATE TABLE IF NOT EXISTS pots (
      id            TEXT PRIMARY KEY NOT NULL,
      name          TEXT NOT NULL,
      emoji         TEXT NOT NULL DEFAULT '🏦',
      color         TEXT NOT NULL DEFAULT '#6C47FF',
      targetAmount  REAL NOT NULL DEFAULT 0,
      currentAmount REAL NOT NULL DEFAULT 0,
      deadline      TEXT,
      createdAt     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pots_createdAt ON pots(createdAt);

    CREATE TABLE IF NOT EXISTS subscriptions (
      id        TEXT PRIMARY KEY NOT NULL,
      name      TEXT NOT NULL,
      emoji     TEXT NOT NULL DEFAULT '📱',
      amount    REAL NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      nextDate  TEXT NOT NULL,
      category  TEXT NOT NULL DEFAULT 'other',
      active    INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      amount     REAL NOT NULL,
      emoji      TEXT DEFAULT '🛍️',
      addedDate  TEXT NOT NULL,
      unlockDate TEXT NOT NULL,
      purchased  INTEGER DEFAULT 0,
      skipped    INTEGER DEFAULT 0,
      createdAt  TEXT NOT NULL
    );
  `);

  const safeAlter = async (table: string, column: string, definition: string) => {
    try {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch {}
  };

  await safeAlter('tasks',     'time',              'TEXT');
  await safeAlter('tasks',     'isMIT',             'INTEGER DEFAULT 0');
  await safeAlter('habits',    'freezesAvailable',  'INTEGER DEFAULT 2');
  await safeAlter('habits',    'freezesUsed',       'INTEGER DEFAULT 0');
  await safeAlter('habits',    'missedYesterday',   'INTEGER DEFAULT 0');
  await safeAlter('habits',    'identityStatement', 'TEXT');
  await safeAlter('habits',    'totalCompletions',  'INTEGER DEFAULT 0');
  await safeAlter('habits',    'whenField',         'TEXT');
  await safeAlter('habits',    'whereField',        'TEXT');
  await safeAlter('exercises', 'rpe',               'REAL');
  await safeAlter('exercises', 'rir',               'INTEGER');
}
