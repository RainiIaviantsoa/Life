import { BarChart2, Settings } from 'lucide-react-native'
import { Card, PrimaryButton, SectionLabel, StatCard } from "@/components/ui";
import { Colors } from "@/constants/theme";
import { HighlightsDB, todayISO } from "@/database";
import { useFinanceStore } from "@/store/financeStore";
import { useHabitsStore } from "@/store/habitsStore";
import { useTasksStore } from "@/store/tasksStore";
import { useWorkoutStore } from "@/store/workoutStore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ds = StyleSheet.create({
  highlightCard: {
    backgroundColor: '#0077B6', borderRadius: 20, padding: 20, marginBottom: 16,
  },
  highlightLabel:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  highlightText:        { fontSize: 21, fontWeight: '800', color: '#fff', lineHeight: 28 },
  highlightDone:        { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginTop: 8 },
  highlightPlaceholder: { fontSize: 16, color: 'rgba(255,255,255,0.82)', fontStyle: 'italic', marginTop: 4 },
  highlightCompleteBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start', marginTop: 10,
  },
  highlightCompleteBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  mitsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  mitsTitle:  { fontSize: 13, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  mitsCount:  { fontSize: 13, color: Colors.violet, fontWeight: '600' },
  mitsEmpty:  { fontSize: 15, color: Colors.textMuted, fontStyle: 'italic' },
  mitRow: {
    backgroundColor: '#fff', borderRadius: 16, padding: 13,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  mitTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 100 },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalTitle:   { fontSize: 19, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  modalSub:     { fontSize: 15, color: Colors.textSub, marginBottom: 14 },
  modalInput:   { backgroundColor: Colors.bg1, borderRadius: 14, padding: 14, fontSize: 15, color: Colors.text, minHeight: 60 },
  modalBtn:     { backgroundColor: Colors.violet, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 14 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})

const MIT_NUM_COLOR = [Colors.coral, Colors.amber, Colors.violet]

// Budget bar color changes with usage — muted tones to avoid harsh contrast
function budgetColor(pct: number) {
  if (pct < 0.6)  return '#85DBA8'  // vert doux
  if (pct < 0.85) return '#FFBA4A'  // amber doux
  return '#FF7B54'                   // corail doux
}

export default function DashboardScreen() {
  const { tasks, load: loadTasks }             = useTasksStore();
  const { workouts, load: loadWorkouts }       = useWorkoutStore();
  const { entries, budget, load: loadFinance } = useFinanceStore();
  const { habits, load: loadHabits }           = useHabitsStore();

  const [savedHighlight,   setSavedHighlight]   = useState<any>(() => HighlightsDB.getByDate(todayISO()))
  const [highlight,        setHighlight]        = useState('')
  const [editingHighlight, setEditingHighlight] = useState(false)
  const [kbHeight,         setKbHeight]         = useState(0)

  const refreshHighlight = () => setSavedHighlight(HighlightsDB.getByDate(todayISO()))

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKbHeight(e.endCoordinates.height)
    )
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0)
    )
    return () => { show.remove(); hide.remove() }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadTasks(); loadWorkouts(); loadFinance(); loadHabits(); refreshHighlight();
    }, []),
  );

  const today   = todayISO();
  const dayLabel = format(new Date(), "EEEE d MMMM", { locale: fr });

  const todayTasks           = tasks.filter((t) => t.date === today);
  const pendingTasks         = todayTasks.filter((t) => !t.completed);
  const todayWorkout         = workouts.find((w) => w.date === today) ?? null;
  const completedHabitsToday = habits.filter((h) => h.completedToday).length;
  const mits                 = tasks.filter((t) => t.isMIT && t.date === today && !t.completed);
  const budgetPct            = budget.limit > 0 ? Math.min(1, budget.spent / budget.limit) : 0;
  const fillColor            = budgetColor(budgetPct);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg1 }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 16 }}>
          <View>
            <Text style={{ fontSize: 22, color: Colors.violet, fontWeight: '700' }}>Bonjour 👋</Text>
            <Text style={{ fontSize: 26, fontWeight: "900", color: Colors.text, marginBottom: 20, textTransform: "capitalize" }}>
              {dayLabel}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            <TouchableOpacity
              onPress={() => router.push("/stats")}
              style={{ width: 40, height: 40, borderRadius: 99, backgroundColor: Colors.violetBg, alignItems: "center", justifyContent: "center" }}
              activeOpacity={0.75}
            >
              <BarChart2 size={18} color={Colors.violet} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={{ width: 40, height: 40, borderRadius: 99, backgroundColor: Colors.bg2, alignItems: "center", justifyContent: "center" }}
              activeOpacity={0.75}
            >
              <Settings size={18} color={Colors.textSub} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Highlight du jour */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => { setHighlight(savedHighlight?.text ?? ''); setEditingHighlight(true) }}>
          <View style={ds.highlightCard}>
            <Text style={ds.highlightLabel}>⭐ HIGHLIGHT DU JOUR</Text>
            {savedHighlight?.text ? (
              <View>
                <Text style={ds.highlightText}>{savedHighlight.text}</Text>
                {savedHighlight.completed ? (
                  <Text style={ds.highlightDone}>✅ Accompli aujourd'hui !</Text>
                ) : (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); HighlightsDB.complete(today); refreshHighlight() }}
                    style={ds.highlightCompleteBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={ds.highlightCompleteBtnText}>✓ Marquer comme fait</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={ds.highlightPlaceholder}>Tap pour définir ton highlight du jour...</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* MITs */}
        <View style={{ marginBottom: 16 }}>
          <View style={ds.mitsHeader}>
            <Text style={ds.mitsTitle}>🎯 TOP 3 PRIORITÉS</Text>
            <Text style={ds.mitsCount}>{mits.length}/3</Text>
          </View>
          {mits.length === 0 ? (
            <Text style={ds.mitsEmpty}>Aucune MIT définie — va dans Tasks et épingle tes 3 priorités</Text>
          ) : (
            mits.slice(0, 3).map((task, i) => (
              <View key={task.id} style={ds.mitRow}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: MIT_NUM_COLOR[i], width: 20 }}>{i + 1}</Text>
                <Text style={ds.mitTitle}>{task.title}</Text>
              </View>
            ))
          )}
        </View>

        {/* 4 StatCards — each uses its screen's primary color */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
          <StatCard value={String(pendingTasks.length)}         label="Tâches"    color={Colors.coral} />
          <StatCard value={todayWorkout ? "1" : "0"}            label="Séance"    color={Colors.amber} />
          <StatCard value={`Ar${Math.round(budget.spent)}`}     label="Dépenses"  color={Colors.blue}  />
          <StatCard value={habits.length > 0 ? `${completedHabitsToday}/${habits.length}` : "–"} label="Habitudes" color={Colors.green} />
        </View>

        {/* Tâches du jour */}
        <SectionLabel>Tâches du jour</SectionLabel>
        <Card accent="coral">
          {todayTasks.length === 0 ? (
            <Text style={{ color: Colors.textMuted, fontSize: 15, paddingVertical: 8 }}>Aucune tâche aujourd'hui</Text>
          ) : (
            todayTasks.slice(0, 5).map((task, i, arr) => (
              <View
                key={task.id}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 10,
                  paddingVertical: 9,
                  borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                  borderBottomColor: Colors.border,
                }}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
                  borderColor: task.completed ? Colors.coral : Colors.border,
                  backgroundColor: task.completed ? Colors.coral : "transparent",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {Boolean(task.completed) && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✓</Text>}
                </View>
                <Text style={{
                  flex: 1, fontSize: 15,
                  color: task.completed ? Colors.textMuted : Colors.text,
                  textDecorationLine: task.completed ? "line-through" : "none",
                }}>
                  {task.title}
                </Text>
              </View>
            ))
          )}
          <PrimaryButton label="+ Nouvelle tâche" color={Colors.coral} onPress={() => {}} />
        </Card>

        {/* Budget mensuel */}
        <SectionLabel>Budget mensuel</SectionLabel>
        <Card accent="blue">
          {budget.limit === 0 ? (
            <Text style={{ color: Colors.textMuted, fontSize: 15, paddingVertical: 8 }}>
              Budget non défini — appui long sur la carte Finance
            </Text>
          ) : (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: fillColor }}>
                    Ar{Math.round(budget.spent)}
                  </Text>
                  <Text style={{ fontSize: 14, color: Colors.textMuted, marginTop: 1 }}>dépensé ce mois</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: Colors.text }}>
                    Ar{Math.round(budget.limit)}
                  </Text>
                  <Text style={{ fontSize: 14, color: Colors.textMuted, marginTop: 1 }}>plafond</Text>
                </View>
              </View>
              <View style={{ backgroundColor: Colors.bg2, height: 10, borderRadius: 99, overflow: "hidden" }}>
                <View style={{ backgroundColor: fillColor, width: `${Math.round(budgetPct * 100)}%`, height: 10, borderRadius: 99 }} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                <Text style={{ fontSize: 14, color: Colors.textMuted }}>{Math.round(budgetPct * 100)} % utilisé</Text>
                <Text style={{ fontSize: 14, color: Colors.green, fontWeight: "700" }}>
                  Ar{Math.max(0, Math.round(budget.limit - budget.spent))} restant
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Habitudes */}
        <SectionLabel>Habitudes</SectionLabel>
        <Card accent="green">
          {habits.length === 0 ? (
            <Text style={{ color: Colors.textMuted, fontSize: 15, paddingVertical: 8 }}>Aucune habitude créée</Text>
          ) : (
            habits.map((habit, i, arr) => (
              <View
                key={habit.id}
                style={{
                  flexDirection: "row", alignItems: "center",
                  paddingVertical: 9,
                  borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                  borderBottomColor: Colors.border,
                }}
              >
                <Text style={{ fontSize: 22, marginRight: 10 }}>{habit.emoji}</Text>
                <Text style={{ flex: 1, fontSize: 15, color: Colors.text }}>{habit.name}</Text>
                <Text style={{ fontSize: 14, fontWeight: "800", color: Colors.green }}>
                  {habit.streak > 0 ? `🔥 ${habit.streak}` : "—"}
                </Text>
              </View>
            ))
          )}
          <PrimaryButton label="Voir toutes mes habitudes" color={Colors.green} onPress={() => {}} />
        </Card>
      </ScrollView>

      {/* Modal édition Highlight */}
      {editingHighlight && (
        <View style={ds.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setEditingHighlight(false)} />
          {kbHeight > 0 && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: kbHeight - 40, backgroundColor: '#fff' }} />}
          <View style={[ds.modalSheet, { marginBottom: kbHeight > 0 ? kbHeight - 40 : 0, paddingBottom: kbHeight > 0 ? 26 : 40 }]}>
            <Text style={ds.modalTitle}>⭐ Highlight du jour</Text>
            <Text style={ds.modalSub}>Si tu ne pouvais accomplir qu'UNE chose aujourd'hui, ce serait quoi ?</Text>
            <TextInput
              value={highlight}
              onChangeText={setHighlight}
              placeholder="Ex: Finir la présentation client"
              placeholderTextColor={Colors.textMuted}
              style={ds.modalInput}

              multiline
              selectionColor={Colors.violet}
            />
            <TouchableOpacity
              onPress={() => {
                if (!highlight.trim()) return
                HighlightsDB.upsert(today, highlight.trim())
                refreshHighlight()
                setEditingHighlight(false)
              }}
              style={[ds.modalBtn, !highlight.trim() && { opacity: 0.45 }]}
              activeOpacity={0.85}
            >
              <Text style={ds.modalBtnText}>Définir comme Highlight</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
