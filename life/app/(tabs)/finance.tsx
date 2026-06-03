import { SectionLabel } from "@/components/ui";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { monthISO, todayISO } from "@/database";
import { useFinanceStore } from "@/store/financeStore";
import type { FinanceCategory, FinanceEntry, FinanceType } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const CategoryMeta: Record<FinanceCategory, { emoji: string; color: string; bg: string; label: string }> = {
  food:          { emoji: "🍔", color: "#FF9500", bg: "#FF95001F", label: "Nourriture" },
  transport:     { emoji: "🚗", color: "#0099FF", bg: "#0099FF1F", label: "Transport" },
  sport:         { emoji: "🏋️", color: "#00C896", bg: "#00C8961F", label: "Sport" },
  health:        { emoji: "💊", color: "#FF5C5C", bg: "#FF5C5C1F", label: "Santé" },
  entertainment: { emoji: "🎬", color: "#6C47FF", bg: "#6C47FF1F", label: "Loisirs" },
  shopping:      { emoji: "🛍️", color: "#FF3CAC", bg: "#FF3CAC1F", label: "Shopping" },
  bills:         { emoji: "📄", color: "#A0A0B8", bg: "#A0A0B81F", label: "Factures" },
  salary:        { emoji: "💼", color: "#00C896", bg: "#00C8961F", label: "Salaire" },
  freelance:     { emoji: "💻", color: "#6C47FF", bg: "#6C47FF1F", label: "Freelance" },
  other:         { emoji: "📦", color: "#A0A0B8", bg: "#A0A0B81F", label: "Autre" },
};
const ALL_CATS = Object.keys(CategoryMeta) as FinanceCategory[];

const POT_EMOJIS  = ["🏦", "✈️", "🏠", "🚗", "💻", "👟", "💍", "🎓", "🏋️", "🎮", "🌴", "💊"];
const POT_COLORS  = ["#6C47FF", "#FF5C5C", "#00C896", "#FF9500", "#0099FF", "#FF3CAC"];
const SUB_EMOJIS  = ["📱", "🎵", "📺", "🎮", "💪", "📧", "☁️", "🎬", "📰", "🛡️", "💻", "🎯"];
const WISH_EMOJIS = ["🛍️", "👟", "💻", "📱", "🎮", "✈️", "👜", "⌚", "📷", "🎸"];
const FREQ_LABELS = { monthly: "/mois", yearly: "/an", weekly: "/sem" };
const FREQ_OPTIONS: Array<{ key: "monthly" | "yearly" | "weekly"; label: string }> = [
  { key: "monthly", label: "Mensuel" },
  { key: "yearly",  label: "Annuel" },
  { key: "weekly",  label: "Hebdo" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCooloffDays(amount: number): number {
  if (amount < 50)  return 1
  if (amount < 200) return 3
  if (amount < 500) return 7
  return 30
}

function fmtDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString("fr") }
  catch { return dateStr }
}

// ─── TransactionItem ──────────────────────────────────────────────────────────

function TransactionItem({ tx, isLast }: { tx: FinanceEntry; isLast: boolean }) {
  const meta     = CategoryMeta[tx.category];
  const isIncome = tx.type === "income";
  return (
    <>
      <View style={st.txRow}>
        <View style={[st.txIcon, { backgroundColor: meta?.bg ?? "#F0F0F8" }]}>
          <Text style={{ fontSize: 18 }}>{meta?.emoji ?? "📦"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.txLabel}>{tx.label}</Text>
          <Text style={st.txCategory}>{meta?.label ?? tx.category}</Text>
        </View>
        <Text style={[st.txAmount, { color: isIncome ? "#00C896" : "#FF5C5C" }]}>
          {isIncome ? "+" : "-"}{tx.amount}Ar
        </Text>
      </View>
      {!isLast && <View style={st.separator} />}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Tab = "today" | "week" | "month" | "abos";

export default function FinanceScreen() {
  const {
    entries, budget, pots,
    subscriptions, wishlist, wishlistSavings,
    load, addEntry, deleteEntry, setBudgetLimit,
    addPot, addToPot, deletePot,
    addSubscription, toggleSubscription, deleteSubscription,
    addWishlistItem, markWishlistPurchased, markWishlistSkipped,
  } = useFinanceStore();

  // ── Tab ──
  const [tab, setTab] = useState<Tab>("today");

  // ── Transaction form ──
  const [showSheet,   setShowSheet]   = useState(false);
  const [sheetType,   setSheetType]   = useState<FinanceType>("expense");
  const [amount,      setAmount]      = useState("");
  const [txLabel,     setTxLabel]     = useState("");
  const [category,    setCategory]    = useState<FinanceCategory>("food");
  const [editBudget,  setEditBudget]  = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // ── Pots form ──
  const [showNewPotSheet,  setShowNewPotSheet]  = useState(false);
  const [potName,          setPotName]          = useState("");
  const [potEmoji,         setPotEmoji]         = useState("🏦");
  const [potColor,         setPotColor]         = useState("#6C47FF");
  const [potTarget,        setPotTarget]        = useState("");
  const [potDeadline,      setPotDeadline]      = useState("");
  const [showPotCalendar,  setShowPotCalendar]  = useState(false);
  const [addToPotId,       setAddToPotId]       = useState<string | null>(null);
  const [addToPotAmount,   setAddToPotAmount]   = useState("");

  // ── Subscription form ──
  const [showSubSheet,    setShowSubSheet]    = useState(false);
  const [subName,         setSubName]         = useState("");
  const [subEmoji,        setSubEmoji]        = useState("📱");
  const [subAmount,       setSubAmount]       = useState("");
  const [subFrequency,    setSubFrequency]    = useState<"monthly" | "yearly" | "weekly">("monthly");
  const [subNextDate,     setSubNextDate]     = useState("");
  const [showSubCalendar, setShowSubCalendar] = useState(false);
  const [showCutFilter,   setShowCutFilter]   = useState(false);

  // ── Wishlist form ──
  const [showWishSheet, setShowWishSheet] = useState(false);
  const [wishName,      setWishName]      = useState("");
  const [wishAmount,    setWishAmount]    = useState("");
  const [wishEmoji,     setWishEmoji]     = useState("🛍️");

  useFocusEffect(useCallback(() => { load() }, []));

  // ── Computed ──
  const today      = todayISO();
  const month      = monthISO();
  const weekAgo    = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const monthLabel = format(new Date(), "MMMM yyyy", { locale: fr });

  const filtered =
    tab === "today" ? entries.filter(e => e.date === today)
    : tab === "week"  ? entries.filter(e => e.date >= weekAgo)
    : entries.filter(e => e.date.startsWith(month));

  const budgetPct    = budget.limit > 0 ? Math.min(1, budget.spent / budget.limit) : 0;
  const isOverBudget = budget.limit > 0 && budget.spent > budget.limit * 0.8;

  const monthlySubTotal = subscriptions
    .filter(s => s.active === 1)
    .reduce((sum, s) => {
      const m = s.frequency === "monthly" ? s.amount
        : s.frequency === "yearly" ? s.amount / 12
        : s.amount * 52 / 12;
      return sum + m;
    }, 0);

  const displayedSubs = showCutFilter
    ? subscriptions.filter(s => s.active === 0)
    : subscriptions;

  const wishAmountNum = parseFloat(wishAmount.replace(",", "."));
  const cooloffDays   = !isNaN(wishAmountNum) && wishAmountNum > 0 ? getCooloffDays(wishAmountNum) : null;

  // ── Handlers ──

  const handleCloseSheet = () => {
    setShowSheet(false);
    setAmount(""); setTxLabel(""); setCategory("food"); setSheetType("expense");
  };

  const handleAdd = () => {
    const n = parseFloat(amount.replace(",", "."));
    if (!n || n <= 0) return;
    addEntry(n, sheetType, category, txLabel.trim() || (CategoryMeta[category]?.label ?? category));
    handleCloseSheet();
  };

  const handleSaveBudget = () => {
    const v = parseFloat(budgetInput.replace(",", "."));
    if (!isNaN(v) && v > 0) setBudgetLimit(v);
    setEditBudget(false); setBudgetInput("");
  };

  const handleCreatePot = () => {
    if (!potName.trim()) return;
    const target = parseFloat(potTarget.replace(",", "."));
    if (isNaN(target) || target <= 0) return;
    addPot(potName.trim(), potEmoji, potColor, target, potDeadline || undefined);
    setShowNewPotSheet(false);
    setPotName(""); setPotEmoji("🏦"); setPotColor("#6C47FF");
    setPotTarget(""); setPotDeadline(""); setShowPotCalendar(false);
  };

  const handleAddToPot = () => {
    if (!addToPotId) return;
    const n = parseFloat(addToPotAmount.replace(",", "."));
    if (!n || n <= 0) return;
    addToPot(addToPotId, n);
    setAddToPotId(null); setAddToPotAmount("");
  };

  const handleCreateSub = () => {
    if (!subName.trim() || !subNextDate) return;
    const n = parseFloat(subAmount.replace(",", "."));
    if (isNaN(n) || n <= 0) return;
    addSubscription(subName.trim(), subEmoji, n, subFrequency, subNextDate);
    setShowSubSheet(false);
    setSubName(""); setSubEmoji("📱"); setSubAmount(""); setSubFrequency("monthly");
    setSubNextDate(""); setShowSubCalendar(false);
  };

  const handleCreateWish = () => {
    if (!wishName.trim()) return;
    const n = parseFloat(wishAmount.replace(",", "."));
    if (isNaN(n) || n <= 0) return;
    addWishlistItem(wishName.trim(), n, wishEmoji);
    setShowWishSheet(false);
    setWishName(""); setWishAmount(""); setWishEmoji("🛍️");
  };

  const TAB_LABELS: Record<Tab, string> = {
    today: "Aujourd'hui", week: "Semaine", month: "Mois", abos: "Abos",
  };

  // ── Render ──

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <View style={st.header}>
            <View>
              <Text style={st.headerTitle}>Finances</Text>
              <Text style={st.headerSub} numberOfLines={1}>{monthLabel}</Text>
            </View>
            {tab !== "abos" && (
              <TouchableOpacity style={st.addBtn} onPress={() => setShowSheet(true)} activeOpacity={0.85}>
                <Text style={st.addBtnText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Tab bar ── */}
          <View style={st.tabBar}>
            {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[st.tabPill, tab === t && st.tabPillActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.8}
              >
                <Text style={[st.tabText, tab === t && st.tabTextActive]}>{TAB_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ══════════ TRANSACTIONS TAB ══════════ */}
          {tab !== "abos" && (
            <>
              {/* Stats */}
              <View style={st.statsRow}>
                <View style={st.statCard}>
                  <Text style={[st.statValue, { color: "#00C896" }]}>{budget.income}Ar</Text>
                  <Text style={st.statLabel}>Revenus</Text>
                </View>
                <View style={st.statCard}>
                  <Text style={[st.statValue, { color: "#FF5C5C" }]}>{budget.spent}Ar</Text>
                  <Text style={st.statLabel}>Dépenses</Text>
                </View>
              </View>

              {/* Budget card */}
              <TouchableOpacity
                style={st.budgetCard}
                onLongPress={() => { setBudgetInput(budget.limit > 0 ? String(budget.limit) : ""); setEditBudget(true); }}
                activeOpacity={0.9}
              >
                {editBudget ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      style={[st.budgetEditInput, { flex: 1 }]}
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      keyboardType="numeric"
                      autoFocus
                      placeholder="Plafond Ar"
                      placeholderTextColor="#A0A0B8"
                      returnKeyType="done"
                      onSubmitEditing={handleSaveBudget}
                    />
                    <TouchableOpacity onPress={handleSaveBudget} style={{ backgroundColor: "#6C47FF", borderRadius: 10, padding: 8 }}>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>OK</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={st.budgetTopRow}>
                      <Text style={st.budgetTitle}>Budget mensuel</Text>
                      <Text style={st.budgetAmount}>{budget.limit > 0 ? `${budget.limit}Ar` : "Appui long pour définir"}</Text>
                    </View>
                    <View style={st.budgetTrack}>
                      <View style={[st.budgetFill, { width: `${Math.round(budgetPct * 100)}%` }]} />
                    </View>
                    <View style={st.budgetBottomRow}>
                      <Text style={st.budgetUsed}>{budget.spent}Ar utilisés</Text>
                      {budget.limit > 0 && (
                        <Text style={st.budgetLeft}>{Math.max(0, budget.limit - budget.spent)}Ar restants</Text>
                      )}
                    </View>
                  </>
                )}
              </TouchableOpacity>

              {isOverBudget && (
                <View style={st.alert}>
                  <Text style={{ fontSize: 18 }}>⚠️</Text>
                  <Text style={st.alertText}>Attention, 80% du budget atteint</Text>
                </View>
              )}

              {/* Pots d'épargne */}
              <SectionLabel>Pots d'épargne</SectionLabel>
              {pots.map(pot => {
                const progress  = pot.targetAmount > 0 ? Math.min(pot.currentAmount / pot.targetAmount, 1) : 0;
                const remaining = pot.targetAmount - pot.currentAmount;
                const monthlyNeeded = pot.deadline ? (() => {
                  const months = Math.max(1, Math.ceil((new Date(pot.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
                  return Math.ceil(remaining / months);
                })() : null;
                return (
                  <SwipeableRow
                    key={pot.id}
                    rightActions={[{ label: "Supprimer", emoji: "🗑️", color: "#FF5C5C", onPress: () =>
                      Alert.alert("Supprimer ce pot ?", pot.name, [
                        { text: "Annuler", style: "cancel" },
                        { text: "Supprimer", style: "destructive", onPress: () => deletePot(pot.id) },
                      ]),
                    }]}
                  >
                    <View style={[st.potCard, { borderLeftColor: pot.color }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <View style={[st.potEmojiBubble, { backgroundColor: `${pot.color}1F` }]}>
                            <Text style={{ fontSize: 20 }}>{pot.emoji}</Text>
                          </View>
                          <View>
                            <Text style={st.potName}>{pot.name}</Text>
                            {pot.deadline && (
                              <Text style={st.potDeadlineText}>
                                🗓️ {fmtDate(pot.deadline)}
                                {monthlyNeeded ? ` · ${monthlyNeeded}Ar/mois` : ""}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Text style={[st.potAmount, { color: pot.color }]}>{pot.currentAmount}Ar</Text>
                      </View>
                      <View style={st.potTrack}>
                        <View style={[st.potFill, { backgroundColor: pot.color, width: `${Math.round(progress * 100)}%` as any }]} />
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                        <Text style={st.potProgress}>
                          {Math.round(progress * 100)}% · {remaining > 0 ? `${remaining}Ar restants` : "Objectif atteint ! 🎉"}
                        </Text>
                        <TouchableOpacity onPress={() => { setAddToPotId(pot.id); setAddToPotAmount(""); }}>
                          <Text style={[st.potAddBtn, { color: pot.color }]}>+ Ajouter</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </SwipeableRow>
                );
              })}

              <TouchableOpacity onPress={() => setShowNewPotSheet(true)} style={st.newPotBtn} activeOpacity={0.85}>
                <Text style={{ fontSize: 16 }}>🏦</Text>
                <Text style={st.newPotBtnText}>Nouveau pot d'épargne</Text>
              </TouchableOpacity>

              {/* Transactions */}
              <SectionLabel>Transactions</SectionLabel>
              {filtered.length === 0 ? (
                <Text style={st.empty}>Aucune transaction</Text>
              ) : (
                <View style={st.txCard}>
                  {filtered.map((tx, i) => (
                    <SwipeableRow
                      key={tx.id}
                      rightActions={[{ label: "Supprimer", emoji: "🗑️", color: "#FF5C5C", onPress: () => deleteEntry(tx.id) }]}
                    >
                      <TransactionItem tx={tx} isLast={i === filtered.length - 1} />
                    </SwipeableRow>
                  ))}
                </View>
              )}
            </>
          )}

          {/* ══════════ ABOS TAB ══════════ */}
          {tab === "abos" && (
            <>
              {/* ── Abonnements ── */}
              <View style={st.subSummaryCard}>
                <Text style={st.subSummaryAmount}>{Math.round(monthlySubTotal)}Ar/mois</Text>
                <Text style={st.subSummaryAnnual}>soit {Math.round(monthlySubTotal * 12)}Ar/an</Text>
              </View>

              <TouchableOpacity
                style={[st.cutBtn, showCutFilter && { backgroundColor: "#FF9500", borderColor: "#FF9500" }]}
                onPress={() => setShowCutFilter(v => !v)}
                activeOpacity={0.8}
              >
                <Text style={[st.cutBtnText, showCutFilter && { color: "#fff" }]}>
                  {showCutFilter ? "✓ Afficher tous" : "✂️ Trouver quoi couper"}
                </Text>
              </TouchableOpacity>

              {showCutFilter && displayedSubs.length === 0 && (
                <Text style={[st.empty, { marginBottom: 8 }]}>Aucun abonnement inactif</Text>
              )}

              {displayedSubs.map(sub => (
                <SwipeableRow
                  key={sub.id}
                  leftActions={[{
                    emoji: sub.active === 1 ? "⏸️" : "▶️",
                    label: sub.active === 1 ? "Désactiver" : "Activer",
                    color: sub.active === 1 ? "#FF9500" : "#00C896",
                    onPress: () => toggleSubscription(sub.id),
                  }]}
                  rightActions={[{
                    emoji: "🗑️", label: "Supprimer", color: "#FF5C5C",
                    onPress: () => Alert.alert("Supprimer ?", sub.name, [
                      { text: "Annuler", style: "cancel" },
                      { text: "Supprimer", style: "destructive", onPress: () => deleteSubscription(sub.id) },
                    ]),
                  }]}
                >
                  <View style={[st.subRow, sub.active === 0 && { opacity: 0.45 }]}>
                    <View style={st.subEmojiBox}>
                      <Text style={{ fontSize: 22 }}>{sub.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.subName}>{sub.name}</Text>
                      <Text style={st.subMeta}>
                        Prochain : {fmtDate(sub.nextDate)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={st.subAmount}>
                        {sub.amount}Ar{FREQ_LABELS[sub.frequency as keyof typeof FREQ_LABELS] ?? ""}
                      </Text>
                      <View style={[st.subBadge, { backgroundColor: sub.active === 1 ? "#00C8961F" : "#F0F0F8" }]}>
                        <Text style={[st.subBadgeText, { color: sub.active === 1 ? "#00C896" : "#A0A0B8" }]}>
                          {sub.active === 1 ? "Actif" : "Inactif"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
              ))}

              <TouchableOpacity onPress={() => setShowSubSheet(true)} style={st.newPotBtn} activeOpacity={0.85}>
                <Text style={{ fontSize: 16 }}>📱</Text>
                <Text style={st.newPotBtnText}>Ajouter un abonnement</Text>
              </TouchableOpacity>

              {/* ── Wishlist ── */}
              <View style={st.wishHeader}>
                <Text style={st.wishTitle}>Wishlist 🛍️</Text>
                <Text style={st.wishSavings}>Économies via patience : {wishlistSavings}Ar 💪</Text>
              </View>

              {wishlist.length === 0 && (
                <Text style={[st.empty, { marginBottom: 8 }]}>Aucun désir en attente</Text>
              )}

              {wishlist.map(item => {
                const nowMs    = Date.now();
                const unlockMs = new Date(item.unlockDate).getTime();
                const addedMs  = new Date(item.addedDate).getTime();
                const unlocked = item.unlockDate <= today;
                const daysLeft = Math.max(0, Math.ceil((unlockMs - nowMs) / 86_400_000));
                const elapsed  = Math.min(1, Math.max(0, (nowMs - addedMs) / Math.max(1, unlockMs - addedMs)));
                const barColor = elapsed < 0.5 ? "#FF5C5C" : elapsed < 0.8 ? "#FF9500" : "#00C896";

                return (
                  <View key={item.id} style={st.wishCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                        <View>
                          <Text style={st.wishItemName}>{item.name}</Text>
                          <Text style={st.wishItemAmount}>{item.amount}Ar</Text>
                        </View>
                      </View>
                      {unlocked ? (
                        <View style={st.wishUnlockedBadge}>
                          <Text style={st.wishUnlockedText}>✅ Débloqué</Text>
                        </View>
                      ) : (
                        <Text style={[st.wishDaysLeft, { color: barColor }]}>
                          {daysLeft}j restant{daysLeft > 1 ? "s" : ""}
                        </Text>
                      )}
                    </View>

                    {!unlocked && (
                      <View style={st.wishTrack}>
                        <View style={[st.wishFill, { backgroundColor: barColor, width: `${Math.round(elapsed * 100)}%` as any }]} />
                      </View>
                    )}

                    {unlocked && (
                      <View style={st.wishActions}>
                        <TouchableOpacity
                          style={[st.wishActionBtn, { backgroundColor: "#FF5C5C" }]}
                          onPress={() => markWishlistPurchased(item.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={st.wishActionText}>🛒 J'achète</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[st.wishActionBtn, { backgroundColor: "#00C896" }]}
                          onPress={() => markWishlistSkipped(item.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={st.wishActionText}>💪 J'ai résisté</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity onPress={() => setShowWishSheet(true)} style={[st.newPotBtn, { marginBottom: 0 }]} activeOpacity={0.85}>
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text style={st.newPotBtnText}>Ajouter un désir</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* ════════════════ BOTTOM SHEETS ════════════════ */}

        {/* ── Transaction ── */}
        {showSheet && (
          <>
            <Pressable style={st.overlay} onPress={handleCloseSheet} />
            <View style={st.sheet}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={st.sheetTitle}>Ajouter une transaction</Text>
                <View style={st.typePills}>
                  {(["expense", "income"] as FinanceType[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[st.typePill, sheetType === t && { backgroundColor: t === "expense" ? "#FF5C5C" : "#00C896" }]}
                      onPress={() => setSheetType(t)}
                      activeOpacity={0.8}
                    >
                      <Text style={[st.typePillText, sheetType === t && { color: "#fff", fontWeight: "700" }]}>
                        {t === "expense" ? "📉 Dépense" : "📈 Revenu"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[st.amountInput, { color: sheetType === "expense" ? "#FF5C5C" : "#00C896" }]}
                  placeholder="0"
                  placeholderTextColor="#DDDDE8"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  textAlign="center"
                  autoFocus
                />
                <TextInput
                  style={st.sheetInput}
                  placeholder="Description…"
                  placeholderTextColor="#A0A0B8"
                  value={txLabel}
                  onChangeText={setTxLabel}
                />
                <Text style={st.sheetLabel}>Catégorie</Text>
                <View style={st.catGrid}>
                  {ALL_CATS.map(cat => {
                    const meta   = CategoryMeta[cat];
                    const active = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[st.catItem, active && { borderWidth: 2, borderColor: meta.color }]}
                        onPress={() => {
                          setCategory(cat);
                          if (cat === "salary" || cat === "freelance") setSheetType("income");
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[st.catCircle, { backgroundColor: meta.bg }]}>
                          <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                        </View>
                        <Text style={[st.catLabel, active && { color: meta.color, fontWeight: "700" }]}>{meta.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[st.sheetConfirm, { backgroundColor: sheetType === "expense" ? "#FF5C5C" : "#00C896" }, !amount.trim() && { opacity: 0.45 }]}
                  onPress={handleAdd}
                  disabled={!amount.trim()}
                >
                  <Text style={st.sheetConfirmText}>Ajouter</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCloseSheet} style={st.cancelBtn}>
                  <Text style={st.cancelText}>Annuler</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        )}

        {/* ── Nouveau pot ── */}
        {showNewPotSheet && (
          <>
            <Pressable style={st.overlay} onPress={() => { setShowNewPotSheet(false); setShowPotCalendar(false); }} />
            <View style={[st.sheet, { maxHeight: "92%" }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={st.sheetTitle}>Nouveau pot d'épargne</Text>
                <TextInput
                  style={st.sheetInput}
                  placeholder="Nom du pot…"
                  placeholderTextColor="#A0A0B8"
                  value={potName}
                  onChangeText={setPotName}
                  autoFocus
                />
                <Text style={st.sheetLabel}>Emoji</Text>
                <View style={st.emojiGrid}>
                  {POT_EMOJIS.map(e => (
                    <TouchableOpacity key={e} onPress={() => setPotEmoji(e)} style={[st.emojiItem, potEmoji === e && st.emojiItemActive]}>
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={st.sheetLabel}>Couleur</Text>
                <View style={st.colorRow}>
                  {POT_COLORS.map(c => (
                    <TouchableOpacity key={c} onPress={() => setPotColor(c)} style={[st.colorDot, { backgroundColor: c }, potColor === c && st.colorDotActive]} />
                  ))}
                </View>
                <TextInput
                  style={[st.amountInput, { color: potColor, marginTop: 4 }]}
                  placeholder="Objectif (Ar)"
                  placeholderTextColor="#DDDDE8"
                  value={potTarget}
                  onChangeText={setPotTarget}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={[st.sheetInput, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                  onPress={() => setShowPotCalendar(v => !v)}
                >
                  <Text style={{ color: potDeadline ? "#0D0D1A" : "#A0A0B8", fontSize: 15 }}>
                    {potDeadline ? `🗓️ ${fmtDate(potDeadline)}` : "Date limite (optionnel)"}
                  </Text>
                  {potDeadline && (
                    <TouchableOpacity onPress={() => { setPotDeadline(""); setShowPotCalendar(false); }}>
                      <Text style={{ color: "#A0A0B8" }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showPotCalendar && (
                  <Calendar
                    onDayPress={day => { setPotDeadline(day.dateString); setShowPotCalendar(false); }}
                    markedDates={potDeadline ? { [potDeadline]: { selected: true, selectedColor: potColor } } : {}}
                    minDate={today}
                    theme={{ selectedDayBackgroundColor: potColor, todayTextColor: potColor, arrowColor: potColor }}
                    style={{ borderRadius: 16, marginBottom: 14, overflow: "hidden" }}
                  />
                )}
                <TouchableOpacity
                  style={[st.sheetConfirm, { backgroundColor: potColor }, (!potName.trim() || !potTarget.trim()) && { opacity: 0.45 }]}
                  onPress={handleCreatePot}
                  disabled={!potName.trim() || !potTarget.trim()}
                >
                  <Text style={st.sheetConfirmText}>Créer le pot</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowNewPotSheet(false); setShowPotCalendar(false); }} style={st.cancelBtn}>
                  <Text style={st.cancelText}>Annuler</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        )}

        {/* ── Ajouter au pot ── */}
        {addToPotId && (
          <>
            <Pressable style={st.overlay} onPress={() => setAddToPotId(null)} />
            <View style={[st.sheet, { maxHeight: "40%" }]}>
              <Text style={st.sheetTitle}>Ajouter au pot</Text>
              <TextInput
                style={[st.amountInput, { color: "#6C47FF", marginBottom: 16 }]}
                placeholder="Montant (Ar)"
                placeholderTextColor="#DDDDE8"
                value={addToPotAmount}
                onChangeText={setAddToPotAmount}
                keyboardType="decimal-pad"
                textAlign="center"
                autoFocus
              />
              <TouchableOpacity
                style={[st.sheetConfirm, { backgroundColor: "#6C47FF" }, !addToPotAmount.trim() && { opacity: 0.45 }]}
                onPress={handleAddToPot}
                disabled={!addToPotAmount.trim()}
              >
                <Text style={st.sheetConfirmText}>Verser</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAddToPotId(null)} style={st.cancelBtn}>
                <Text style={st.cancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Nouvel abonnement ── */}
        {showSubSheet && (
          <>
            <Pressable style={st.overlay} onPress={() => { setShowSubSheet(false); setShowSubCalendar(false); }} />
            <View style={[st.sheet, { maxHeight: "92%" }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={st.sheetTitle}>Nouvel abonnement</Text>
                <TextInput
                  style={st.sheetInput}
                  placeholder="Nom (Netflix, Spotify…)"
                  placeholderTextColor="#A0A0B8"
                  value={subName}
                  onChangeText={setSubName}
                  autoFocus
                />
                <Text style={st.sheetLabel}>Emoji</Text>
                <View style={st.emojiGrid}>
                  {SUB_EMOJIS.map(e => (
                    <TouchableOpacity key={e} onPress={() => setSubEmoji(e)} style={[st.emojiItem, subEmoji === e && st.emojiItemActive]}>
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[st.amountInput, { color: "#6C47FF" }]}
                  placeholder="Montant (Ar)"
                  placeholderTextColor="#DDDDE8"
                  value={subAmount}
                  onChangeText={setSubAmount}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                <Text style={st.sheetLabel}>Fréquence</Text>
                <View style={st.typePills}>
                  {FREQ_OPTIONS.map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={[st.typePill, subFrequency === f.key && { backgroundColor: "#6C47FF" }]}
                      onPress={() => setSubFrequency(f.key)}
                    >
                      <Text style={[st.typePillText, subFrequency === f.key && { color: "#fff", fontWeight: "700" }]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={st.sheetLabel}>Prochaine date</Text>
                <TouchableOpacity
                  style={[st.sheetInput, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                  onPress={() => setShowSubCalendar(v => !v)}
                >
                  <Text style={{ color: subNextDate ? "#0D0D1A" : "#A0A0B8", fontSize: 15 }}>
                    {subNextDate ? `🗓️ ${fmtDate(subNextDate)}` : "Choisir une date…"}
                  </Text>
                  {subNextDate && (
                    <TouchableOpacity onPress={() => { setSubNextDate(""); setShowSubCalendar(false); }}>
                      <Text style={{ color: "#A0A0B8" }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showSubCalendar && (
                  <Calendar
                    onDayPress={day => { setSubNextDate(day.dateString); setShowSubCalendar(false); }}
                    markedDates={subNextDate ? { [subNextDate]: { selected: true, selectedColor: "#6C47FF" } } : {}}
                    minDate={today}
                    theme={{ selectedDayBackgroundColor: "#6C47FF", todayTextColor: "#6C47FF", arrowColor: "#6C47FF" }}
                    style={{ borderRadius: 16, marginBottom: 14, overflow: "hidden" }}
                  />
                )}
                <TouchableOpacity
                  style={[st.sheetConfirm, { backgroundColor: "#6C47FF" }, (!subName.trim() || !subAmount.trim() || !subNextDate) && { opacity: 0.45 }]}
                  onPress={handleCreateSub}
                  disabled={!subName.trim() || !subAmount.trim() || !subNextDate}
                >
                  <Text style={st.sheetConfirmText}>Ajouter l'abonnement</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowSubSheet(false); setShowSubCalendar(false); }} style={st.cancelBtn}>
                  <Text style={st.cancelText}>Annuler</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        )}

        {/* ── Nouveau désir (wishlist) ── */}
        {showWishSheet && (
          <>
            <Pressable style={st.overlay} onPress={() => setShowWishSheet(false)} />
            <View style={[st.sheet, { maxHeight: "65%" }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={st.sheetTitle}>Ajouter un désir</Text>
                <TextInput
                  style={st.sheetInput}
                  placeholder="Ce que tu veux…"
                  placeholderTextColor="#A0A0B8"
                  value={wishName}
                  onChangeText={setWishName}
                  autoFocus
                />
                <TextInput
                  style={[st.amountInput, { color: "#6C47FF" }]}
                  placeholder="Prix (Ar)"
                  placeholderTextColor="#DDDDE8"
                  value={wishAmount}
                  onChangeText={setWishAmount}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                {cooloffDays !== null && (
                  <View style={st.cooloffHintBox}>
                    <Text style={st.cooloffHintText}>
                      ⏳ Pour {Math.round(wishAmountNum)}Ar, tu devras attendre{" "}
                      <Text style={{ fontWeight: "800" }}>{cooloffDays} jour{cooloffDays > 1 ? "s" : ""}</Text>
                    </Text>
                  </View>
                )}
                <Text style={st.sheetLabel}>Emoji</Text>
                <View style={st.emojiGrid}>
                  {WISH_EMOJIS.map(e => (
                    <TouchableOpacity key={e} onPress={() => setWishEmoji(e)} style={[st.emojiItem, wishEmoji === e && st.emojiItemActive]}>
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[st.sheetConfirm, { backgroundColor: "#6C47FF" }, (!wishName.trim() || !wishAmount.trim()) && { opacity: 0.45 }]}
                  onPress={handleCreateWish}
                  disabled={!wishName.trim() || !wishAmount.trim()}
                >
                  <Text style={st.sheetConfirmText}>Ajouter à la wishlist</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowWishSheet(false)} style={st.cancelBtn}>
                  <Text style={st.cancelText}>Annuler</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#F7F7FA" },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#0D0D1A", letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: "#6B6B85", marginTop: 2, textTransform: "capitalize" },
  addBtn:      { width: 40, height: 40, borderRadius: 99, backgroundColor: "#FF5C5C", alignItems: "center", justifyContent: "center" },
  addBtnText:  { color: "#fff", fontSize: 24, lineHeight: 26 },

  // ── Tabs ──
  tabBar:       { flexDirection: "row", gap: 6, marginBottom: 16 },
  tabPill:      { borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#EEEEF5" },
  tabPillActive:{ backgroundColor: "#6C47FF" },
  tabText:      { fontSize: 13, fontWeight: "500", color: "#6B6B85" },
  tabTextActive:{ color: "#fff", fontWeight: "700" },

  // ── Stats ──
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14, shadowColor: "#6C47FF", shadowOpacity: 0.06, elevation: 2 },
  statValue:{ fontSize: 22, fontWeight: "900", marginBottom: 2 },
  statLabel:{ fontSize: 12, color: "#6B6B85", fontWeight: "500" },

  // ── Budget ──
  budgetCard:    { backgroundColor: "#fff", borderRadius: 20, borderLeftWidth: 4, borderLeftColor: "#6C47FF", padding: 16, marginBottom: 12, shadowColor: "#6C47FF", shadowOpacity: 0.08, elevation: 3 },
  budgetTopRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budgetTitle:   { fontSize: 13, fontWeight: "700", color: "#0D0D1A" },
  budgetAmount:  { fontSize: 13, fontWeight: "800", color: "#6C47FF" },
  budgetTrack:   { backgroundColor: "#EEEEF5", height: 10, borderRadius: 99, marginVertical: 10, overflow: "hidden" },
  budgetFill:    { backgroundColor: "#6C47FF", height: 10, borderRadius: 99 },
  budgetBottomRow:{ flexDirection: "row", justifyContent: "space-between" },
  budgetUsed:    { fontSize: 12, color: "#6B6B85" },
  budgetLeft:    { fontSize: 12, fontWeight: "700", color: "#00C896" },
  budgetEditInput:{ backgroundColor: "#F7F7FA", borderRadius: 10, padding: 10, fontSize: 15, color: "#0D0D1A" },

  alert:    { backgroundColor: "#FF5C5C1F", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  alertText:{ fontSize: 13, fontWeight: "600", color: "#CC2222", flex: 1 },

  // ── Pots ──
  potCard:       { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 10, borderLeftWidth: 4, shadowColor: "#6C47FF", shadowOpacity: 0.06, elevation: 2 },
  potEmojiBubble:{ width: 40, height: 40, borderRadius: 99, alignItems: "center", justifyContent: "center" },
  potName:       { fontSize: 15, fontWeight: "700", color: "#0D0D1A" },
  potDeadlineText:{ fontSize: 11, color: "#A0A0B8", marginTop: 1 },
  potAmount:     { fontSize: 16, fontWeight: "900" },
  potTrack:      { backgroundColor: "#EEEEF5", borderRadius: 99, height: 8 },
  potFill:       { height: 8, borderRadius: 99 },
  potProgress:   { fontSize: 11, color: "#A0A0B8" },
  potAddBtn:     { fontSize: 11, fontWeight: "700" },

  newPotBtn:    { backgroundColor: "#6C47FF1F", borderRadius: 16, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  newPotBtnText:{ fontSize: 14, fontWeight: "700", color: "#6C47FF" },

  // ── Transactions ──
  txCard:    { backgroundColor: "#fff", borderRadius: 20, padding: 14, marginBottom: 12, shadowColor: "#6C47FF", shadowOpacity: 0.05, elevation: 2 },
  txRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  txIcon:    { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  txLabel:   { fontSize: 14, fontWeight: "600", color: "#0D0D1A" },
  txCategory:{ fontSize: 11, color: "#A0A0B8", marginTop: 1 },
  txAmount:  { fontSize: 15, fontWeight: "800" },
  separator: { height: 0.5, backgroundColor: "#F0F0F8", marginVertical: 4 },
  empty:     { textAlign: "center", color: "#A0A0B8", fontSize: 14, marginTop: 4, marginBottom: 16 },

  // ── Subscriptions ──
  subSummaryCard:   { backgroundColor: "#6C47FF", borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 12 },
  subSummaryAmount: { fontSize: 32, fontWeight: "900", color: "#fff" },
  subSummaryAnnual: { fontSize: 13, color: "#FFFFFF99", marginTop: 2 },
  cutBtn:           { borderRadius: 14, borderWidth: 1.5, borderColor: "#6C47FF", padding: 12, alignItems: "center", marginBottom: 12 },
  cutBtnText:       { fontSize: 14, fontWeight: "700", color: "#6C47FF" },
  subRow:           { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  subEmojiBox:      { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F7F7FA", alignItems: "center", justifyContent: "center" },
  subName:          { fontSize: 15, fontWeight: "700", color: "#0D0D1A" },
  subMeta:          { fontSize: 11, color: "#A0A0B8", marginTop: 2 },
  subAmount:        { fontSize: 14, fontWeight: "800", color: "#0D0D1A" },
  subBadge:         { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  subBadgeText:     { fontSize: 10, fontWeight: "700" },

  // ── Wishlist ──
  wishHeader:       { marginTop: 8, marginBottom: 12 },
  wishTitle:        { fontSize: 18, fontWeight: "900", color: "#0D0D1A" },
  wishSavings:      { fontSize: 12, color: "#00C896", fontWeight: "600", marginTop: 2 },
  wishCard:         { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#6C47FF", shadowOpacity: 0.05, elevation: 2 },
  wishItemName:     { fontSize: 15, fontWeight: "700", color: "#0D0D1A" },
  wishItemAmount:   { fontSize: 13, fontWeight: "600", color: "#6B6B85", marginTop: 1 },
  wishUnlockedBadge:{ backgroundColor: "#00C8961F", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  wishUnlockedText: { fontSize: 11, fontWeight: "700", color: "#00C896" },
  wishDaysLeft:     { fontSize: 13, fontWeight: "800" },
  wishTrack:        { backgroundColor: "#EEEEF5", borderRadius: 99, height: 8, marginTop: 4 },
  wishFill:         { height: 8, borderRadius: 99 },
  wishActions:      { flexDirection: "row", gap: 8, marginTop: 10 },
  wishActionBtn:    { flex: 1, borderRadius: 12, padding: 10, alignItems: "center" },
  wishActionText:   { fontSize: 13, fontWeight: "700", color: "#fff" },

  // ── Emoji / color pickers ──
  emojiGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  emojiItem:      { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F7F7FA", alignItems: "center", justifyContent: "center" },
  emojiItemActive:{ borderWidth: 2, borderColor: "#6C47FF", backgroundColor: "#6C47FF1F" },
  colorRow:       { flexDirection: "row", gap: 12, marginBottom: 14 },
  colorDot:       { width: 32, height: 32, borderRadius: 99 },
  colorDotActive: { borderWidth: 3, borderColor: "#0D0D1A" },

  // ── Cooloff hint ──
  cooloffHintBox: { backgroundColor: "#6C47FF1F", borderRadius: 12, padding: 12, marginBottom: 14 },
  cooloffHintText:{ fontSize: 13, color: "#6C47FF", textAlign: "center" },

  // ── Sheets ──
  overlay:        { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,13,26,0.35)" },
  sheet:          { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 16, elevation: 20, maxHeight: "90%" },
  sheetTitle:     { fontSize: 17, fontWeight: "800", color: "#0D0D1A", textAlign: "center", marginBottom: 16 },
  typePills:      { flexDirection: "row", gap: 8, marginBottom: 16 },
  typePill:       { flex: 1, backgroundColor: "#EEEEF5", borderRadius: 99, paddingVertical: 10, alignItems: "center" },
  typePillText:   { fontSize: 14, fontWeight: "500", color: "#6B6B85" },
  amountInput:    { fontSize: 32, fontWeight: "900", textAlign: "center", backgroundColor: "#F7F7FA", borderRadius: 14, padding: 16, marginBottom: 12 },
  sheetInput:     { backgroundColor: "#F7F7FA", borderRadius: 14, padding: 14, fontSize: 15, color: "#0D0D1A", marginBottom: 14 },
  sheetLabel:     { fontSize: 12, fontWeight: "700", color: "#A0A0B8", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 12 },
  catGrid:        { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, gap: 8 },
  catItem:        { width: "18%", alignItems: "center", borderRadius: 12, padding: 6, gap: 4 },
  catCircle:      { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  catLabel:       { fontSize: 9, color: "#6B6B85", textAlign: "center", fontWeight: "500" },
  sheetConfirm:   { borderRadius: 14, padding: 15, alignItems: "center", marginBottom: 4 },
  sheetConfirmText:{ color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelBtn:      { alignItems: "center", marginTop: 10, marginBottom: 8 },
  cancelText:     { color: "#A0A0B8", fontSize: 14 },
});
