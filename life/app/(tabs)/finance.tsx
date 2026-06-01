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
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Catégories ───────────────────────────────────────────────────────────────

const CategoryMeta: Record<
  FinanceCategory,
  { emoji: string; color: string; bg: string; label: string }
> = {
  food: { emoji: "🍔", color: "#FF9500", bg: "#FF95001F", label: "Nourriture" },
  transport: {
    emoji: "🚗",
    color: "#0099FF",
    bg: "#0099FF1F",
    label: "Transport",
  },
  sport: { emoji: "🏋️", color: "#00C896", bg: "#00C8961F", label: "Sport" },
  health: { emoji: "💊", color: "#FF5C5C", bg: "#FF5C5C1F", label: "Santé" },
  entertainment: {
    emoji: "🎬",
    color: "#6C47FF",
    bg: "#6C47FF1F",
    label: "Loisirs",
  },
  shopping: {
    emoji: "🛍️",
    color: "#FF3CAC",
    bg: "#FF3CAC1F",
    label: "Shopping",
  },
  bills: { emoji: "📄", color: "#A0A0B8", bg: "#A0A0B81F", label: "Factures" },
  salary: { emoji: "💼", color: "#00C896", bg: "#00C8961F", label: "Salaire" },
  freelance: {
    emoji: "💻",
    color: "#6C47FF",
    bg: "#6C47FF1F",
    label: "Freelance",
  },
  other: { emoji: "📦", color: "#A0A0B8", bg: "#A0A0B81F", label: "Autre" },
};
const ALL_CATS = Object.keys(CategoryMeta) as FinanceCategory[];

// ─── TransactionItem ──────────────────────────────────────────────────────────

function TransactionItem({
  tx,
  isLast,
}: {
  tx: FinanceEntry;
  isLast: boolean;
}) {
  const meta = CategoryMeta[tx.category];
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
        <Text
          style={[st.txAmount, { color: isIncome ? "#00C896" : "#FF5C5C" }]}
        >
          {isIncome ? "+" : "-"}
          {tx.amount}Ar
        </Text>
      </View>
      {!isLast && <View style={st.separator} />}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Filter = "today" | "week" | "month";

export default function FinanceScreen() {
  const { entries, budget, load, addEntry, deleteEntry, setBudgetLimit } = useFinanceStore();
  const [filter, setFilter] = useState<Filter>("today");
  const [showSheet, setShowSheet] = useState(false);
  const [sheetType, setSheetType] = useState<FinanceType>("expense");
  const [amount, setAmount] = useState("");
  const [txLabel, setTxLabel] = useState("");
  const [category, setCategory] = useState<FinanceCategory>("food");
  const [editBudget, setEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const today = todayISO();
  const month = monthISO();
  const weekAgo = new Date(Date.now() - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const monthLabel = format(new Date(), "MMMM yyyy", { locale: fr });

  const filtered =
    filter === "today"
      ? entries.filter((e) => e.date === today)
      : filter === "week"
        ? entries.filter((e) => e.date >= weekAgo)
        : entries.filter((e) => e.date.startsWith(month));

  const budgetPct =
    budget.limit > 0 ? Math.min(1, budget.spent / budget.limit) : 0;
  const isOverBudget = budget.limit > 0 && budget.spent > budget.limit * 0.8;

  const handleCloseSheet = () => {
    setShowSheet(false);
    setAmount("");
    setTxLabel("");
    setCategory("food");
    setSheetType("expense");
  };
  const handleAdd = () => {
    const n = parseFloat(amount.replace(",", "."));
    if (!n || n <= 0) return;
    addEntry(
      n,
      sheetType,
      category,
      txLabel.trim() || (CategoryMeta[category]?.label ?? category),
    );
    handleCloseSheet();
  };
  const handleSaveBudget = () => {
    const v = parseFloat(budgetInput.replace(",", "."));
    if (!isNaN(v) && v > 0) setBudgetLimit(v);
    setEditBudget(false);
    setBudgetInput("");
  };

  const FILTER_LABELS: Record<Filter, string> = {
    today: "Aujourd'hui",
    week: "Semaine",
    month: "Mois",
  };

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={st.header}>
            <View>
              <Text style={st.headerTitle}>Finances</Text>
              <Text style={st.headerSub} numberOfLines={1}>
                {monthLabel}
              </Text>
            </View>
            <TouchableOpacity
              style={st.addBtn}
              onPress={() => setShowSheet(true)}
              activeOpacity={0.85}
            >
              <Text style={st.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={st.statsRow}>
            <View style={st.statCard}>
              <Text style={[st.statValue, { color: "#00C896" }]}>
                {budget.income}Ar
              </Text>
              <Text style={st.statLabel}>Revenus</Text>
            </View>
            <View style={st.statCard}>
              <Text style={[st.statValue, { color: "#FF5C5C" }]}>
                {budget.spent}Ar
              </Text>
              <Text style={st.statLabel}>Dépenses</Text>
            </View>
          </View>

          {/* Budget card */}
          <TouchableOpacity
            style={st.budgetCard}
            onLongPress={() => {
              setBudgetInput(budget.limit > 0 ? String(budget.limit) : "");
              setEditBudget(true);
            }}
            activeOpacity={0.9}
          >
            {editBudget ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
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
                <TouchableOpacity
                  onPress={handleSaveBudget}
                  style={{
                    backgroundColor: "#6C47FF",
                    borderRadius: 10,
                    padding: 8,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}
                  >
                    OK
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={st.budgetTopRow}>
                  <Text style={st.budgetTitle}>Budget mensuel</Text>
                  <Text style={st.budgetAmount}>
                    {budget.limit > 0
                      ? `${budget.limit}Ar`
                      : "Appui long pour définir"}
                  </Text>
                </View>
                <View style={st.budgetTrack}>
                  <View
                    style={[
                      st.budgetFill,
                      { width: `${Math.round(budgetPct * 100)}%` },
                    ]}
                  />
                </View>
                <View style={st.budgetBottomRow}>
                  <Text style={st.budgetUsed}>{budget.spent}Ar utilisés</Text>
                  {budget.limit > 0 && (
                    <Text style={st.budgetLeft}>
                      {Math.max(0, budget.limit - budget.spent)}Ar restants
                    </Text>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Alerte */}
          {isOverBudget && (
            <View style={st.alert}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <Text style={st.alertText}>Attention, 80% du budget atteint</Text>
            </View>
          )}

          {/* Filtres */}
          <View style={st.filters}>
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[st.filterPill, filter === f && st.filterPillActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[st.filterText, filter === f && st.filterTextActive]}
                >
                  {FILTER_LABELS[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transactions */}
          <SectionLabel>Transactions</SectionLabel>
          {filtered.length === 0 ? (
            <Text style={st.empty}>Aucune transaction</Text>
          ) : (
            <View style={st.txCard}>
              {filtered.map((tx, i) => (
                <SwipeableRow
                  key={tx.id}
                  rightActions={[
                    {
                      label: 'Supprimer',
                      emoji: '🗑️',
                      color: '#FF5C5C',
                      onPress: () => deleteEntry(tx.id),
                    },
                  ]}
                >
                  <TransactionItem tx={tx} isLast={i === filtered.length - 1} />
                </SwipeableRow>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom sheet */}
        {showSheet && (
          <>
            <Pressable style={st.overlay} onPress={handleCloseSheet} />
            <View style={st.sheet}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={st.sheetTitle}>Ajouter une transaction</Text>
                <View style={st.typePills}>
                  {(["expense", "income"] as FinanceType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        st.typePill,
                        sheetType === t && {
                          backgroundColor:
                            t === "expense" ? "#FF5C5C" : "#00C896",
                        },
                      ]}
                      onPress={() => setSheetType(t)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          st.typePillText,
                          sheetType === t && {
                            color: "#fff",
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {t === "expense" ? "📉 Dépense" : "📈 Revenu"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[
                    st.amountInput,
                    { color: sheetType === "expense" ? "#FF5C5C" : "#00C896" },
                  ]}
                  placeholder="0"
                  placeholderTextColor="#DDDDE8"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  textAlign="center"
                  selectionColor={
                    sheetType === "expense" ? "#FF5C5C" : "#00C896"
                  }
                  autoFocus
                />
                <TextInput
                  style={st.sheetInput}
                  placeholder="Description…"
                  placeholderTextColor="#A0A0B8"
                  value={txLabel}
                  onChangeText={setTxLabel}
                  selectionColor="#6C47FF"
                />
                <Text style={st.sheetLabel}>Catégorie</Text>
                <View style={st.catGrid}>
                  {ALL_CATS.map((cat) => {
                    const meta = CategoryMeta[cat];
                    const active = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          st.catItem,
                          active && { borderWidth: 2, borderColor: meta.color },
                        ]}
                        onPress={() => {
                          setCategory(cat);
                          setSheetType(
                            meta.color === "#00C896" &&
                              (cat === "salary" || cat === "freelance")
                              ? "income"
                              : sheetType,
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[st.catCircle, { backgroundColor: meta.bg }]}
                        >
                          <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                        </View>
                        <Text
                          style={[
                            st.catLabel,
                            active && { color: meta.color, fontWeight: "700" },
                          ]}
                        >
                          {meta.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[
                    st.sheetConfirm,
                    {
                      backgroundColor:
                        sheetType === "expense" ? "#FF5C5C" : "#00C896",
                    },
                    !amount.trim() && { opacity: 0.45 },
                  ]}
                  onPress={handleAdd}
                  disabled={!amount.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={st.sheetConfirmText}>Ajouter</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCloseSheet}
                  style={{
                    alignItems: "center",
                    marginTop: 10,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: "#A0A0B8", fontSize: 14 }}>
                    Annuler
                  </Text>
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
  safe: { flex: 1, backgroundColor: "#F7F7FA" },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0D0D1A",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: "#6B6B85",
    marginTop: 2,
    textTransform: "capitalize",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 99,
    backgroundColor: "#FF5C5C",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 24, lineHeight: 26 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#6C47FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: "900", marginBottom: 2 },
  statLabel: { fontSize: 12, color: "#6B6B85", fontWeight: "500" },
  budgetCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#6C47FF",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#6C47FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  budgetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetTitle: { fontSize: 13, fontWeight: "700", color: "#0D0D1A" },
  budgetAmount: { fontSize: 13, fontWeight: "800", color: "#6C47FF" },
  budgetTrack: {
    backgroundColor: "#EEEEF5",
    height: 10,
    borderRadius: 99,
    marginVertical: 10,
    overflow: "hidden",
  },
  budgetFill: { backgroundColor: "#6C47FF", height: 10, borderRadius: 99 },
  budgetBottomRow: { flexDirection: "row", justifyContent: "space-between" },
  budgetUsed: { fontSize: 12, color: "#6B6B85" },
  budgetLeft: { fontSize: 12, fontWeight: "700", color: "#00C896" },
  budgetEditInput: {
    backgroundColor: "#F7F7FA",
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: "#0D0D1A",
  },
  alert: {
    backgroundColor: "#FF5C5C1F",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  alertText: { fontSize: 13, fontWeight: "600", color: "#CC2222", flex: 1 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterPill: {
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#EEEEF5",
  },
  filterPillActive: { backgroundColor: "#FF5C5C" },
  filterText: { fontSize: 13, fontWeight: "500", color: "#6B6B85" },
  filterTextActive: { color: "#fff", fontWeight: "700" },
  txCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#6C47FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  txLabel: { fontSize: 14, fontWeight: "600", color: "#0D0D1A" },
  txCategory: { fontSize: 11, color: "#A0A0B8", marginTop: 1 },
  txAmount: { fontSize: 15, fontWeight: "800" },
  separator: { height: 0.5, backgroundColor: "#F0F0F8", marginVertical: 4 },
  empty: { textAlign: "center", color: "#A0A0B8", fontSize: 14, marginTop: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,13,26,0.35)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    maxHeight: "90%",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0D0D1A",
    textAlign: "center",
    marginBottom: 16,
  },
  typePills: { flexDirection: "row", gap: 8, marginBottom: 16 },
  typePill: {
    flex: 1,
    backgroundColor: "#EEEEF5",
    borderRadius: 99,
    paddingVertical: 10,
    alignItems: "center",
  },
  typePillText: { fontSize: 14, fontWeight: "500", color: "#6B6B85" },
  amountInput: {
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    backgroundColor: "#F7F7FA",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sheetInput: {
    backgroundColor: "#F7F7FA",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#0D0D1A",
    marginBottom: 14,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0A0B8",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, gap: 8 },
  catItem: {
    width: "18%",
    alignItems: "center",
    borderRadius: 12,
    padding: 6,
    gap: 4,
  },
  catCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 9,
    color: "#6B6B85",
    textAlign: "center",
    fontWeight: "500",
  },
  sheetConfirm: {
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    marginBottom: 4,
  },
  sheetConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
