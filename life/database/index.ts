export { initDatabase } from './schema';

// ─── Sync namespace + helpers (used by dashboardStore) ───────────────────────
export {
  TasksDB, FinancesDB, BudgetsDB, HabitsDB, WorkoutsDB, ExercisesDB,
  todayISO, monthISO, generateId,
} from './sync';

export type { Task, TaskPriority, TaskRecurrence } from './tasks';
export {
  createTask,
  getAllTasks,
  getTasksByDate,
  getSubtasks,
  getTaskById,
  updateTask,
  toggleTask,
  deleteTask,
  getPendingTasksCount,
  getCompletedTasksByDate,
} from './tasks';

export type { Workout, Exercise, WorkoutWithExercises, WorkoutType } from './workouts';
export {
  createWorkout,
  getAllWorkouts,
  getWorkoutsByDate,
  getWorkoutById,
  getWorkoutWithExercises,
  updateWorkout,
  deleteWorkout,
  getWorkoutCountByMonth,
  getTotalDurationByMonth,
  createExercise,
  getExercisesByWorkout,
  updateExercise,
  reorderExercises,
  deleteExercise,
} from './workouts';

export type { Finance, Budget, MonthSummary, TransactionType } from './finances';
export {
  createFinance,
  getAllFinances,
  getFinancesByMonth,
  getFinancesByType,
  getFinancesByCategory,
  getFinanceById,
  updateFinance,
  deleteFinance,
  getMonthSummary,
  getCategoryBreakdown,
  getBudgetByMonth,
  getOrCreateBudget,
  updateBudgetLimit,
  setBudgetSpent,
  getAllBudgets,
} from './finances';

export type { Habit } from './habits';
export {
  createHabit,
  getAllHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  markHabitCompleted,
  resetHabitStreak,
  isHabitCompletedToday,
  getCompletedHabitsToday,
  getLongestStreakHabit,
} from './habits';
