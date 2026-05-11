import { create } from 'zustand'
import { FinancesDB, BudgetsDB, generateId, todayISO, monthISO } from '@/database'
import type { FinanceEntry, FinanceType, FinanceCategory } from '@/types'

interface FinanceState {
  entries:        FinanceEntry[]
  budget:         { limit: number; spent: number; income: number }
  load:           () => void
  addEntry:       (amount: number, type: FinanceType, category: FinanceCategory, label: string) => void
  deleteEntry:    (id: string) => void
  setBudgetLimit: (limit: number) => void
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  entries: [],
  budget:  { limit: 0, spent: 0, income: 0 },

  load: () => {
    const month   = monthISO()
    const entries = FinancesDB.getAll()
    const spent   = FinancesDB.sumExpensesByMonth(month)
    const income  = FinancesDB.sumIncomeByMonth(month)
    const b       = BudgetsDB.getByMonth(month)
    set({ entries, budget: { limit: b?.monthlyLimit ?? 0, spent, income } })
  },

  addEntry: (amount, type, category, label) => {
    FinancesDB.insert({
      id:        generateId(),
      amount,
      type,
      category,
      label,
      date:      todayISO(),
      createdAt: new Date().toISOString(),
    })
    get().load()
  },

  deleteEntry: (id) => {
    FinancesDB.delete(id)
    get().load()
  },

  setBudgetLimit: (limit) => {
    BudgetsDB.upsert(monthISO(), limit)
    get().load()
  },
}))
