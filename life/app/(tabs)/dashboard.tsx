import { Card, PrimaryButton, SectionLabel, StatCard } from "@/components/ui";
import { Colors } from "@/constants/theme";
import { todayISO } from "@/database";
import { useFinanceStore } from "@/store/financeStore";
import { useHabitsStore } from "@/store/habitsStore";
import { useTasksStore } from "@/store/tasksStore";
import { useWorkoutStore } from "@/store/workoutStore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardScreen() {
  const { tasks, load: loadTasks } = useTasksStore();
  const { workouts, load: loadWorkouts } = useWorkoutStore();
  const { entries, budget, load: loadFinance } = useFinanceStore();
  const { habits, load: loadHabits } = useHabitsStore();

  useFocusEffect(
    useCallback(() => {
      loadTasks();
      loadWorkouts();
      loadFinance();
      loadHabits();
    }, []),
  );

  const today = todayISO();
  const dayLabel = format(new Date(), "EEEE d MMMM", { locale: fr });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const todayTasks = tasks.filter((t) => t.date === today);
  const pendingTasks = todayTasks.filter((t) => !t.completed);
  const todayWorkout = workouts.find((w) => w.date === today) ?? null;
  const completedHabitsToday = habits.filter((h) => h.completedToday).length;
  const budgetPct =
    budget.limit > 0 ? Math.min(1, budget.spent / budget.limit) : 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.bg1 }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <View>
            <Text style={{ fontSize: 13, color: Colors.textSub }}>
              Bonjour 👋
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "900",
                color: Colors.text,
                marginBottom: 20,
                textTransform: "capitalize",
              }}
            >
              {dayLabel}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            <TouchableOpacity
              onPress={() => router.push("/stats")}
              style={{
                width: 40, height: 40, borderRadius: 99,
                backgroundColor: '#0099FF1F',
                alignItems: "center", justifyContent: "center",
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 18 }}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={{
                width: 40, height: 40, borderRadius: 99,
                backgroundColor: Colors.bg2,
                alignItems: "center", justifyContent: "center",
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 StatCards */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
          <StatCard
            value={String(pendingTasks.length)}
            label="Tâches"
            color={Colors.violet}
          />
          <StatCard
            value={todayWorkout ? "1" : "0"}
            label="Séance"
            color={Colors.amber}
          />
          <StatCard
            value={`Ar${Math.round(budget.spent)}`}
            label="Dépenses"
            color={Colors.coral}
          />
          <StatCard
            value={
              habits.length > 0
                ? `${completedHabitsToday}/${habits.length}`
                : "–"
            }
            label="Habitudes"
            color={Colors.green}
          />
        </View>

        {/* Tâches du jour */}
        <SectionLabel>Tâches du jour</SectionLabel>
        <Card accent="violet">
          {todayTasks.length === 0 ? (
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 14,
                paddingVertical: 8,
              }}
            >
              Aucune tâche aujourd'hui
            </Text>
          ) : (
            todayTasks.slice(0, 5).map((task, i, arr) => (
              <View
                key={task.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 9,
                  borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                  borderBottomColor: Colors.border,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: task.completed ? Colors.violet : Colors.border,
                    backgroundColor: task.completed
                      ? Colors.violet
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {Boolean(task.completed) && (
                    <Text
                      style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                    >
                      ✓
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: task.completed ? Colors.textMuted : Colors.text,
                    textDecorationLine: task.completed
                      ? "line-through"
                      : "none",
                  }}
                >
                  {task.title}
                </Text>
              </View>
            ))
          )}
          <PrimaryButton
            label="+ Nouvelle tâche"
            color={Colors.violet}
            onPress={() => {}}
          />
        </Card>

        {/* Budget mensuel */}
        <SectionLabel>Budget mensuel</SectionLabel>
        <Card accent="coral">
          {budget.limit === 0 ? (
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 14,
                paddingVertical: 8,
              }}
            >
              Budget non défini — appui long sur la carte Finance
            </Text>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "900",
                      color: Colors.coral,
                    }}
                  >
                    Ar{Math.round(budget.spent)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textMuted,
                      marginTop: 1,
                    }}
                  >
                    dépensé ce mois
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "900",
                      color: Colors.text,
                    }}
                  >
                    Ar{Math.round(budget.limit)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textMuted,
                      marginTop: 1,
                    }}
                  >
                    plafond
                  </Text>
                </View>
              </View>
              <View
                style={{
                  backgroundColor: Colors.bg2,
                  height: 10,
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    backgroundColor: Colors.violet,
                    width: `${Math.round(budgetPct * 100)}%`,
                    height: 10,
                    borderRadius: 99,
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                  {Math.round(budgetPct * 100)} % utilisé
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: Colors.green,
                    fontWeight: "700",
                  }}
                >
                  Ar{Math.max(0, Math.round(budget.limit - budget.spent))}{" "}
                  restant
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Habitudes */}
        <SectionLabel>Habitudes</SectionLabel>
        <Card accent="green">
          {habits.length === 0 ? (
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 14,
                paddingVertical: 8,
              }}
            >
              Aucune habitude créée
            </Text>
          ) : (
            habits.map((habit, i, arr) => (
              <View
                key={habit.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 9,
                  borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                  borderBottomColor: Colors.border,
                }}
              >
                <Text style={{ fontSize: 22, marginRight: 10 }}>
                  {habit.emoji}
                </Text>
                <Text style={{ flex: 1, fontSize: 14, color: Colors.text }}>
                  {habit.name}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    color: Colors.green,
                  }}
                >
                  {habit.streak > 0 ? `🔥 ${habit.streak}` : "—"}
                </Text>
              </View>
            ))
          )}
          <PrimaryButton
            label="Voir toutes mes habitudes"
            color={Colors.green}
            onPress={() => {}}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
