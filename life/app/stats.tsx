import React, { useCallback, useMemo, useState } from 'react'
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import {
  VictoryBar, VictoryChart, VictoryAxis,
  VictoryPie, VictoryLine,
} from 'victory-native'

import { useTasksStore }   from '@/store/tasksStore'
import { useWorkoutStore } from '@/store/workoutStore'
import { useFinanceStore } from '@/store/financeStore'
import { useHabitsStore }  from '@/store/habitsStore'
import { FinancesDB, ExercisesDB, monthISO } from '@/database'
import { StatCard } from '@/components/ui'
import { Colors }  from '@/constants/theme'

// ─── Constants ────────────────────────────────────────────────────────────────

type TabKey = 'tasks' | 'workout' | 'finance' | 'habits'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'tasks',   label: 'Tasks'   },
  { key: 'workout', label: 'Workout' },
  { key: 'finance', label: 'Finance' },
  { key: 'habits',  label: 'Habits'  },
]

const TAB_COLOR: Record<TabKey, string> = {
  tasks:   '#6C47FF',
  workout: '#FF9500',
  finance: '#FF5C5C',
  habits:  '#00C896',
}

const CAT_META: Record<string, { emoji: string; label: string; color: string }> = {
  food:          { emoji: '🍔', label: 'Nourriture',  color: '#FF9500' },
  transport:     { emoji: '🚗', label: 'Transport',   color: '#0099FF' },
  sport:         { emoji: '🏋️', label: 'Sport',       color: '#00C896' },
  health:        { emoji: '💊', label: 'Santé',       color: '#FF5C5C' },
  entertainment: { emoji: '🎬', label: 'Loisirs',     color: '#6C47FF' },
  shopping:      { emoji: '🛍️', label: 'Shopping',    color: '#FF3CAC' },
  bills:         { emoji: '📄', label: 'Factures',    color: '#A0A0B8' },
  salary:        { emoji: '💼', label: 'Salaire',     color: '#00C896' },
  freelance:     { emoji: '💻', label: 'Freelance',   color: '#6C47FF' },
  other:         { emoji: '📦', label: 'Autre',       color: '#A0A0B8' },
}

const SCREEN_W = Dimensions.get('window').width
const CHART_W  = SCREEN_W - 32   // 16 padding each side
const AXIS_STYLE = {
  tickLabels: { fontSize: 10, fill: '#A0A0B8', fontFamily: 'System' },
  grid:       { stroke: '#F0F0F8' },
  axis:       { stroke: '#DDDDE8' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(): string {
  const d = new Date()
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
  return d.toISOString().slice(0, 10)
}

function fmtDuration(min: number): string {
  if (min === 0) return '0min'
  if (min < 60)  return `${min}min`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    }}>
      <Text style={{
        fontSize: 11, fontWeight: '700', color: '#A0A0B8', textTransform: 'uppercase',
        letterSpacing: 0.8, marginBottom: 12,
      }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? value / max : 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Text style={{ width: 68, fontSize: 12, fontWeight: '600', color: '#6B6B85' }} numberOfLines={1}>{label}</Text>
      <View style={{ flex: 1, backgroundColor: '#EEEEF5', borderRadius: 99, height: 8 }}>
        <View style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color, height: 8, borderRadius: 99 }} />
      </View>
      <Text style={{ width: 28, fontSize: 12, fontWeight: '700', color: '#0D0D1A', textAlign: 'right' }}>{value}</Text>
    </View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('tasks')

  const { tasks,    load: loadTasks    } = useTasksStore()
  const { workouts, load: loadWorkouts } = useWorkoutStore()
  const { entries,  load: loadFinance  } = useFinanceStore()
  const { habits,   load: loadHabits   } = useHabitsStore()

  useFocusEffect(useCallback(() => {
    loadTasks(); loadWorkouts(); loadFinance(); loadHabits()
  }, []))

  const month = monthISO()
  const color = TAB_COLOR[tab]

  // ── TASKS data ────────────────────────────────────────────────────────────
  const tasksData = useMemo(() => {
    const weekStart = getMonday()
    const weekTasks = tasks.filter(t => t.date >= weekStart)
    const completed = weekTasks.filter(t => t.completed).length
    const rate      = weekTasks.length > 0 ? Math.round(completed / weekTasks.length * 100) : 0

    const dayCounts: Record<string, number> = {}
    tasks.forEach(t => {
      if (t.completed) {
        const d    = new Date(t.date + 'T00:00:00')
        const name = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]
        dayCounts[name] = (dayCounts[name] ?? 0) + 1
      }
    })
    const bestDay = Object.entries(dayCounts).sort(([,a],[,b]) => b - a)[0]?.[0] ?? '–'

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d    = new Date()
      d.setDate(d.getDate() - (6 - i))
      const date = d.toISOString().slice(0, 10)
      const day  = tasks.filter(t => t.date === date)
      return {
        x: ['L','M','M','J','V','S','D'][d.getDay() === 0 ? 6 : d.getDay() - 1],
        y: day.filter(t => t.completed).length,
      }
    })

    const high   = tasks.filter(t => t.priority === 'high').length
    const medium = tasks.filter(t => t.priority === 'medium').length
    const low    = tasks.filter(t => t.priority === 'low').length
    const maxP   = Math.max(high, medium, low, 1)

    return { weekTotal: weekTasks.length, rate, bestDay, last7, high, medium, low, maxP }
  }, [tasks])

  // ── WORKOUT data ──────────────────────────────────────────────────────────
  const workoutData = useMemo(() => {
    const monthW   = workouts.filter(w => w.date.startsWith(month))
    const minutes  = monthW.reduce((s, w) => s + (w.duration ?? 0), 0)
    const freq     = monthW.length > 0 ? (monthW.length / 4).toFixed(1) : '0'

    const weekly = [1,2,3,4].map(week => ({
      x: `S${week}`,
      y: workouts.filter(w => {
        const d = new Date(w.date + 'T00:00:00')
        return Math.ceil(d.getDate() / 7) === week && w.date.startsWith(month)
      }).length,
    }))

    const allExercises = ExercisesDB.getAll()
    const nameCounts: Record<string, number> = {}
    allExercises.forEach(e => {
      nameCounts[e.name] = (nameCounts[e.name] ?? 0) + 1
    })
    const top5     = Object.entries(nameCounts).sort(([,a],[,b]) => b - a).slice(0, 5)
    const maxCount = top5[0]?.[1] ?? 1

    return { count: monthW.length, duration: fmtDuration(minutes), freq, weekly, top5, maxCount }
  }, [workouts, month])

  // ── FINANCE data ──────────────────────────────────────────────────────────
  const financeData = useMemo(() => {
    const monthE   = entries.filter(e => e.date.startsWith(month))
    const expenses = monthE.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    const income   = monthE.filter(e => e.type === 'income' ).reduce((s, e) => s + e.amount, 0)
    const balance  = income - expenses

    const byCategory = Object.entries(CAT_META).map(([key, meta]) => {
      const total = monthE
        .filter(e => e.category === key && e.type === 'expense')
        .reduce((s, e) => s + e.amount, 0)
      return { key, ...meta, total }
    }).filter(c => c.total > 0)

    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return {
        x: i + 1,
        label: d.toLocaleString('fr', { month: 'short' }),
        y: FinancesDB.sumExpensesByMonth(m),
      }
    })

    return { expenses, income, balance, byCategory, last6 }
  }, [entries, month])

  // ── HABITS data ───────────────────────────────────────────────────────────
  const habitsData = useMemo(() => {
    const bestStreak     = Math.max(...habits.map(h => h.streak), 0)
    const completedToday = habits.filter(h => h.completedToday).length

    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d    = new Date()
      d.setDate(d.getDate() - (29 - i))
      const date = d.toISOString().slice(0, 10)
      return { date, count: habits.filter(h => h.lastCompletedDate === date).length }
    })

    const ranked = [...habits].sort((a, b) => b.streak - a.streak)
    const maxS   = ranked[0]?.streak || 1

    return { bestStreak, completedToday, last30, ranked, maxS }
  }, [habits])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7FA' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16, marginBottom: 20,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40, height: 40, borderRadius: 99, backgroundColor: '#EEEEF5',
              alignItems: 'center', justifyContent: 'center',
            }}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#0D0D1A' }}>Statistiques</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Onglets ───────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={{
                borderRadius: 99, paddingHorizontal: 16, paddingVertical: 9,
                backgroundColor: tab === key ? TAB_COLOR[key] : '#EEEEF5',
              }}
              onPress={() => setTab(key)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === key ? '#FFF' : '#6B6B85' }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════════
            ONGLET TASKS
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'tasks' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <StatCard value={String(tasksData.weekTotal)} label="Cette semaine"  color={color} />
              <StatCard value={`${tasksData.rate}%`}        label="Complétion"     color={color} />
              <StatCard value={tasksData.bestDay}           label="Meilleur jour"  color={color} />
            </View>

            <ChartCard title="Complétion — 7 derniers jours">
              <VictoryChart
                width={CHART_W - 32}
                height={180}
                padding={{ top: 10, bottom: 32, left: 28, right: 10 }}
                domainPadding={{ x: 12 }}
              >
                <VictoryAxis style={AXIS_STYLE} />
                <VictoryAxis
                  dependentAxis
                  tickFormat={v => Number.isInteger(v) ? String(v) : ''}
                  style={{ ...AXIS_STYLE, axis: { stroke: 'transparent' } }}
                />
                <VictoryBar
                  data={tasksData.last7}
                  style={{ data: { fill: color } }}
                  cornerRadius={{ topLeft: 4, topRight: 4 }}
                />
              </VictoryChart>
            </ChartCard>

            <ChartCard title="Répartition par priorité">
              <HBar label="Haute"   value={tasksData.high}   max={tasksData.maxP} color="#FF5C5C" />
              <HBar label="Moyenne" value={tasksData.medium} max={tasksData.maxP} color="#FF9500" />
              <HBar label="Basse"   value={tasksData.low}    max={tasksData.maxP} color={color}   />
            </ChartCard>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ONGLET WORKOUT
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'workout' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <StatCard value={String(workoutData.count)} label="Séances mois"  color={color} />
              <StatCard value={workoutData.duration}      label="Durée totale"  color={color} />
              <StatCard value={`${workoutData.freq}/sem`} label="Fréquence"     color={color} />
            </View>

            <ChartCard title="Séances par semaine — ce mois">
              <VictoryChart
                width={CHART_W - 32}
                height={180}
                padding={{ top: 10, bottom: 32, left: 28, right: 10 }}
                domainPadding={{ x: 24 }}
              >
                <VictoryAxis style={AXIS_STYLE} />
                <VictoryAxis
                  dependentAxis
                  tickFormat={v => Number.isInteger(v) ? String(v) : ''}
                  style={{ ...AXIS_STYLE, axis: { stroke: 'transparent' } }}
                />
                <VictoryBar
                  data={workoutData.weekly}
                  style={{ data: { fill: color } }}
                  cornerRadius={{ topLeft: 4, topRight: 4 }}
                />
              </VictoryChart>
            </ChartCard>

            <ChartCard title="Exercices les plus pratiqués">
              {workoutData.top5.length === 0 ? (
                <Text style={{ color: '#A0A0B8', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                  Aucun exercice enregistré
                </Text>
              ) : workoutData.top5.map(([name, count]) => (
                <HBar key={name} label={name} value={count} max={workoutData.maxCount} color={color} />
              ))}
            </ChartCard>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ONGLET FINANCE
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'finance' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <StatCard
                value={`Ar${Math.round(financeData.expenses)}`}
                label="Dépenses"
                color={color}
              />
              <StatCard
                value={`Ar${Math.round(financeData.income)}`}
                label="Revenus"
                color={Colors.green}
              />
              <StatCard
                value={`${financeData.balance >= 0 ? '+' : '-'}Ar${Math.abs(Math.round(financeData.balance))}`}
                label={financeData.balance >= 0 ? 'Solde ↑' : 'Solde ↓'}
                color={financeData.balance >= 0 ? Colors.green : color}
              />
            </View>

            <ChartCard title="Dépenses par catégorie">
              {financeData.byCategory.length === 0 ? (
                <Text style={{ color: '#A0A0B8', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                  Aucune dépense ce mois
                </Text>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <VictoryPie
                      width={CHART_W - 64}
                      height={CHART_W - 64}
                      data={financeData.byCategory.map(c => ({ x: c.label, y: c.total }))}
                      colorScale={financeData.byCategory.map(c => c.color)}
                      labels={() => null}
                      innerRadius={(CHART_W - 64) * 0.22}
                      padding={8}
                    />
                  </View>
                  {financeData.byCategory.map(c => (
                    <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: c.color }} />
                      <Text style={{ flex: 1, fontSize: 13, color: '#0D0D1A', fontWeight: '500' }}>
                        {c.emoji} {c.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B6B85', fontWeight: '700' }}>
                        Ar{Math.round(c.total)}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#A0A0B8', width: 34, textAlign: 'right' }}>
                        {financeData.expenses > 0 ? Math.round(c.total / financeData.expenses * 100) : 0}%
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </ChartCard>

            <ChartCard title="Évolution dépenses — 6 mois">
              <VictoryChart
                width={CHART_W - 32}
                height={180}
                padding={{ top: 10, bottom: 32, left: 52, right: 10 }}
              >
                <VictoryAxis
                  tickValues={financeData.last6.map(d => d.x)}
                  tickFormat={(_v, i) => financeData.last6[i]?.label ?? ''}
                  style={AXIS_STYLE}
                />
                <VictoryAxis
                  dependentAxis
                  tickFormat={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))}
                  style={{ ...AXIS_STYLE, axis: { stroke: 'transparent' } }}
                />
                <VictoryLine
                  data={financeData.last6}
                  style={{ data: { stroke: color, strokeWidth: 2.5 } }}
                  interpolation="monotoneX"
                />
              </VictoryChart>
            </ChartCard>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ONGLET HABITS
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'habits' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <StatCard value={String(habitsData.bestStreak)}                      label="Meilleur streak"   color={color} />
              <StatCard value={`${habitsData.completedToday}/${habits.length}`}    label="Aujourd'hui"       color={color} />
              <StatCard value={habits.length > 0 ? `${habitsData.maxS}j` : '–'}   label="Streak max"        color={color} />
            </View>

            <ChartCard title="Activité — 30 derniers jours">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {habitsData.last30.map(({ date, count }) => {
                  const bg =
                    count === 0 ? '#EEEEF5'   :
                    count <= 2  ? '#00C89640' :
                    count <= 4  ? '#00C89680' : '#00C896'
                  return (
                    <View key={date} style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: bg }} />
                  )
                })}
              </View>
            </ChartCard>

            <ChartCard title="Classement par streak">
              {habitsData.ranked.length === 0 ? (
                <Text style={{ color: '#A0A0B8', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                  Aucune habitude
                </Text>
              ) : habitsData.ranked.map((h, i) => (
                <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, width: 28 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </Text>
                  <Text style={{ fontSize: 20 }}>{h.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0D0D1A' }} numberOfLines={1}>
                      {h.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={{ flex: 1, backgroundColor: '#EEEEF5', borderRadius: 99, height: 6 }}>
                        <View style={{
                          width: `${habitsData.maxS > 0 ? Math.round(h.streak / habitsData.maxS * 100) : 0}%`,
                          backgroundColor: color, height: 6, borderRadius: 99,
                        }} />
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color }}>🔥 {h.streak}</Text>
                </View>
              ))}
            </ChartCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
