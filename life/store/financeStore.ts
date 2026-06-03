import { create } from 'zustand'
import { FinancesDB, BudgetsDB, PotsDB, SubscriptionsDB, WishlistDB, generateId, todayISO, monthISO } from '@/database'
import type { FinanceEntry, FinanceType, FinanceCategory, Pot, Subscription, WishlistItem } from '@/types'

function getCooloffDays(amount: number): number {
  if (amount < 50)  return 1
  if (amount < 200) return 3
  if (amount < 500) return 7
  return 30
}

interface FinanceState {
  entries:          FinanceEntry[]
  budget:           { limit: number; spent: number; income: number }
  pots:             Pot[]
  subscriptions:    Subscription[]
  wishlist:         WishlistItem[]
  wishlistSavings:  number

  load:               () => void
  loadPots:           () => void
  loadSubscriptions:  () => void
  loadWishlist:       () => void

  addEntry:           (amount: number, type: FinanceType, category: FinanceCategory, label: string) => void
  deleteEntry:        (id: string) => void
  setBudgetLimit:     (limit: number) => void

  addPot:             (name: string, emoji: string, color: string, targetAmount: number, deadline?: string) => void
  addToPot:           (potId: string, amount: number) => void
  deletePot:          (id: string) => void

  addSubscription:    (name: string, emoji: string, amount: number, frequency: string, nextDate: string) => void
  toggleSubscription: (id: string) => void
  deleteSubscription: (id: string) => void

  addWishlistItem:         (name: string, amount: number, emoji?: string) => void
  markWishlistPurchased:   (id: string) => void
  markWishlistSkipped:     (id: string) => void
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  entries:         [],
  budget:          { limit: 0, spent: 0, income: 0 },
  pots:            [],
  subscriptions:   [],
  wishlist:        [],
  wishlistSavings: 0,

  load: () => {
    try {
      const month     = monthISO()
      const cutoff    = new Date()
      cutoff.setMonth(cutoff.getMonth() - 3)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      const entries   = FinancesDB.getAll().filter(e => e.date >= cutoffStr)
      const spent     = FinancesDB.sumExpensesByMonth(month)
      const income    = FinancesDB.sumIncomeByMonth(month)
      const b         = BudgetsDB.getByMonth(month)
      const pots      = PotsDB.getAll()
      const subscriptions  = SubscriptionsDB.getAll()
      const wishlist       = WishlistDB.getAll()
      const wishlistSavings = WishlistDB.getSavings()
      set({ entries, budget: { limit: b?.monthlyLimit ?? 0, spent, income }, pots, subscriptions, wishlist, wishlistSavings })
    } catch (e) {
      console.error('[FINANCE LOAD ERROR]', e)
      set({ entries: [], budget: { limit: 0, spent: 0, income: 0 }, pots: [], subscriptions: [], wishlist: [], wishlistSavings: 0 })
    }
  },

  loadPots:  () => set({ pots: PotsDB.getAll() }),
  loadSubscriptions: () => set({ subscriptions: SubscriptionsDB.getAll() }),
  loadWishlist: () => {
    const wishlist       = WishlistDB.getAll()
    const wishlistSavings = WishlistDB.getSavings()
    set({ wishlist, wishlistSavings })
  },

  addEntry: (amount, type, category, label) => {
    FinancesDB.insert({ id: generateId(), amount, type, category, label, date: todayISO(), createdAt: new Date().toISOString() })
    get().load()
  },

  deleteEntry: (id) => { FinancesDB.delete(id); get().load() },

  setBudgetLimit: (limit) => { BudgetsDB.upsert(monthISO(), limit); get().load() },

  addPot: (name, emoji, color, targetAmount, deadline) => {
    PotsDB.insert({ id: generateId(), name, emoji, color, targetAmount, deadline: deadline ?? null, createdAt: new Date().toISOString() })
    get().loadPots()
  },

  addToPot:  (potId, amount) => { PotsDB.addAmount(potId, amount); get().loadPots() },
  deletePot: (id) => { PotsDB.delete(id); get().loadPots() },

  addSubscription: (name, emoji, amount, frequency, nextDate) => {
    SubscriptionsDB.insert({ id: generateId(), name, emoji, amount, frequency, nextDate, category: 'other', createdAt: new Date().toISOString() })
    get().loadSubscriptions()
  },

  toggleSubscription: (id) => { SubscriptionsDB.toggleActive(id); get().loadSubscriptions() },
  deleteSubscription: (id) => { SubscriptionsDB.delete(id); get().loadSubscriptions() },

  addWishlistItem: (name, amount, emoji) => {
    const addedDate  = todayISO()
    const days       = getCooloffDays(amount)
    const unlock     = new Date()
    unlock.setDate(unlock.getDate() + days)
    const unlockDate = unlock.toISOString().slice(0, 10)
    WishlistDB.insert({ id: generateId(), name, amount, emoji: emoji || '🛍️', addedDate, unlockDate, createdAt: new Date().toISOString() })
    get().loadWishlist()
  },

  markWishlistPurchased: (id) => { WishlistDB.markPurchased(id); get().loadWishlist() },
  markWishlistSkipped:   (id) => { WishlistDB.markSkipped(id);   get().loadWishlist() },
}))
