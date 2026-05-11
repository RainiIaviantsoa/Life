import { getDb, uid, nowIso } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

export interface Finance {
  id:        string;
  amount:    number;
  type:      TransactionType;
  category:  string;
  label:     string;
  date:      string;
  createdAt: string;
}

export interface Budget {
  id:           string;
  month:        string;
  monthlyLimit: number;
  currentSpent: number;
}

export interface MonthSummary {
  month:        string;
  totalIncome:  number;
  totalExpense: number;
  balance:      number;
}

type CreateFinanceInput = Pick<Finance, 'amount' | 'type' | 'category' | 'label' | 'date'>;
type UpdateFinanceInput = Partial<Pick<Finance, 'amount' | 'type' | 'category' | 'label' | 'date'>>;

// ─── Finances CRUD ────────────────────────────────────────────────────────────

export async function createFinance(input: CreateFinanceInput): Promise<Finance> {
  const db      = await getDb();
  const finance: Finance = {
    id:        uid(),
    amount:    Math.abs(input.amount),
    type:      input.type,
    category:  input.category,
    label:     input.label,
    date:      input.date,
    createdAt: nowIso(),
  };

  await db.runAsync(
    `INSERT INTO finances (id, amount, type, category, label, date, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [finance.id, finance.amount, finance.type, finance.category, finance.label, finance.date, finance.createdAt]
  );

  // Auto-update budget currentSpent for expenses
  if (finance.type === 'expense') {
    const month = finance.date.slice(0, 7);
    await incrementBudgetSpent(month, finance.amount);
  }

  return finance;
}

export async function getAllFinances(): Promise<Finance[]> {
  const db = await getDb();
  return db.getAllAsync<Finance>('SELECT * FROM finances ORDER BY date DESC, createdAt DESC');
}

export async function getFinancesByMonth(month: string): Promise<Finance[]> {
  const db = await getDb();
  return db.getAllAsync<Finance>(
    "SELECT * FROM finances WHERE strftime('%Y-%m', date)=? ORDER BY date DESC",
    [month]
  );
}

export async function getFinancesByType(type: TransactionType): Promise<Finance[]> {
  const db = await getDb();
  return db.getAllAsync<Finance>(
    'SELECT * FROM finances WHERE type=? ORDER BY date DESC',
    [type]
  );
}

export async function getFinancesByCategory(category: string): Promise<Finance[]> {
  const db = await getDb();
  return db.getAllAsync<Finance>(
    'SELECT * FROM finances WHERE category=? ORDER BY date DESC',
    [category]
  );
}

export async function getFinanceById(id: string): Promise<Finance | null> {
  const db = await getDb();
  return db.getFirstAsync<Finance>('SELECT * FROM finances WHERE id=?', [id]);
}

export async function updateFinance(id: string, input: UpdateFinanceInput): Promise<void> {
  const db      = await getDb();
  const current = await getFinanceById(id);
  if (!current) return;

  // Reverse old expense from budget
  if (current.type === 'expense') {
    const month = current.date.slice(0, 7);
    await incrementBudgetSpent(month, -current.amount);
  }

  const m = { ...current, ...input, amount: Math.abs(input.amount ?? current.amount) };
  await db.runAsync(
    'UPDATE finances SET amount=?, type=?, category=?, label=?, date=? WHERE id=?',
    [m.amount, m.type, m.category, m.label, m.date, id]
  );

  // Apply new expense to budget
  if (m.type === 'expense') {
    const month = m.date.slice(0, 7);
    await incrementBudgetSpent(month, m.amount);
  }
}

export async function deleteFinance(id: string): Promise<void> {
  const db      = await getDb();
  const current = await getFinanceById(id);
  if (!current) return;

  if (current.type === 'expense') {
    const month = current.date.slice(0, 7);
    await incrementBudgetSpent(month, -current.amount);
  }

  await db.runAsync('DELETE FROM finances WHERE id=?', [id]);
}

export async function getMonthSummary(month: string): Promise<MonthSummary> {
  const db = await getDb();

  const incomeRow = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) as total FROM finances WHERE type='income' AND strftime('%Y-%m',date)=?",
    [month]
  );
  const expenseRow = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) as total FROM finances WHERE type='expense' AND strftime('%Y-%m',date)=?",
    [month]
  );

  const totalIncome  = incomeRow?.total  ?? 0;
  const totalExpense = expenseRow?.total ?? 0;

  return { month, totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

export async function getCategoryBreakdown(month: string): Promise<{ category: string; total: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM finances
     WHERE type='expense' AND strftime('%Y-%m', date)=?
     GROUP BY category ORDER BY total DESC`,
    [month]
  );
}

// ─── Budgets CRUD ─────────────────────────────────────────────────────────────

export async function getBudgetByMonth(month: string): Promise<Budget | null> {
  const db = await getDb();
  return db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE month=?', [month]);
}

export async function getOrCreateBudget(month: string, monthlyLimit = 0): Promise<Budget> {
  const db       = await getDb();
  const existing = await getBudgetByMonth(month);
  if (existing) return existing;

  const budget: Budget = { id: uid(), month, monthlyLimit, currentSpent: 0 };
  await db.runAsync(
    'INSERT INTO budgets (id, month, monthlyLimit, currentSpent) VALUES (?, ?, ?, ?)',
    [budget.id, budget.month, budget.monthlyLimit, budget.currentSpent]
  );
  return budget;
}

export async function updateBudgetLimit(month: string, monthlyLimit: number): Promise<void> {
  const db     = await getDb();
  const budget = await getOrCreateBudget(month);
  await db.runAsync('UPDATE budgets SET monthlyLimit=? WHERE id=?', [monthlyLimit, budget.id]);
}

export async function setBudgetSpent(month: string, currentSpent: number): Promise<void> {
  const db     = await getDb();
  const budget = await getOrCreateBudget(month);
  await db.runAsync(
    'UPDATE budgets SET currentSpent=MAX(0, ?) WHERE id=?',
    [currentSpent, budget.id]
  );
}

async function incrementBudgetSpent(month: string, delta: number): Promise<void> {
  const db     = await getDb();
  const budget = await getOrCreateBudget(month);
  await db.runAsync(
    'UPDATE budgets SET currentSpent=MAX(0, currentSpent + ?) WHERE id=?',
    [delta, budget.id]
  );
}

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDb();
  return db.getAllAsync<Budget>('SELECT * FROM budgets ORDER BY month DESC');
}
