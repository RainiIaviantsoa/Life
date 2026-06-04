import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react-native'
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { SafeAreaView } from 'react-native-safe-area-context'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as Haptics from 'expo-haptics'
import { useFocusEffect } from 'expo-router'
import { SectionLabel } from '@/components/ui'
import { ExercisesDB, WorkoutsDB, generateId, todayISO } from '@/database'
import { useWorkoutStore } from '@/store/workoutStore'
import * as Notifications from 'expo-notifications'

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutType = 'classic' | 'emom'

interface PlannedExercise {
  id: string; name: string; sets: number; reps: number
  weight: number | null; emoji: string
}
interface EmomEx      { name: string; reps: number; emoji: string }
interface HistoryItem { id: string; name: string; type: WorkoutType; duration: number; date: string }
interface SheetEx     { name: string; sets: number; reps: number; weight: string }
interface SetState    { weight: string; reps: string; rpe: number | null; done: boolean }

// ─── Static data ──────────────────────────────────────────────────────────────

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

const mockExercises: PlannedExercise[] = [
  { id: '1', name: 'Pompes',    sets: 3, reps: 15, weight: null, emoji: '💪' },
  { id: '2', name: 'Squat',     sets: 4, reps: 12, weight: 20,   emoji: '🏋️' },
  { id: '3', name: 'Tractions', sets: 3, reps: 8,  weight: null, emoji: '🔝' },
  { id: '4', name: 'Gainage',   sets: 3, reps: 60, weight: null, emoji: '⚡' },
]

const mockEmomExercises: EmomEx[] = [
  { name: 'Burpees',           reps: 10, emoji: '🔥' },
  { name: 'Squat jump',        reps: 15, emoji: '⚡' },
  { name: 'Mountain climbers', reps: 20, emoji: '🏔️' },
  { name: 'Push-ups',          reps: 12, emoji: '💪' },
]

const INITIAL_HISTORY: HistoryItem[] = [
  { id: '1', name: 'Push / Pull',    type: 'classic', duration: 45, date: '2026-05-05' },
  { id: '2', name: 'Full body EMOM', type: 'emom',    duration: 20, date: '2026-05-03' },
  { id: '3', name: 'Legs day',       type: 'classic', duration: 50, date: '2026-05-01' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatTimer = (sec: number) => `00:${pad2(sec)}`

const getRestTime = (exerciseName: string): number => {
  const compounds = ['squat', 'bench', 'deadlift', 'press', 'row', 'pull', 'dip', 'chin']
  return compounds.some(c => exerciseName.toLowerCase().includes(c)) ? 180 : 90
}

// ─── RPEPicker ────────────────────────────────────────────────────────────────

function RPEPicker({
  value, onChange, disabled,
}: { value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={st.rpePillRow}
      contentContainerStyle={{ gap: 4 }}
    >
      {RPE_VALUES.map(v => (
        <TouchableOpacity
          key={v}
          style={[st.rpePill, value === v && st.rpePillActive]}
          onPress={() => !disabled && onChange(value === v ? null : v)}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Text style={[st.rpePillText, value === v && st.rpePillTextActive]}>
            {v % 1 === 0 ? v : v.toFixed(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

// ─── ActiveExerciseCard ───────────────────────────────────────────────────────

function ActiveExerciseCard({
  ex, workoutId, onSetConfirmed,
}: { ex: PlannedExercise; workoutId: string; onSetConfirmed?: (name: string) => void }) {
  const [sets,     setSets]     = useState<SetState[]>(
    Array.from({ length: ex.sets }, () => ({ weight: '', reps: '', rpe: null, done: false }))
  )
  const [lastPerf, setLastPerf] = useState<any>(null)
  const [prBanner, setPrBanner] = useState<{ weightPR: boolean; repsPR: boolean; volumePR: boolean } | null>(null)
  const [prWeight, setPrWeight] = useState(0)
  const [prReps,   setPrReps]   = useState(0)
  const prAnim   = useRef(new Animated.Value(0)).current
  const prTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLastPerf(ExercisesDB.getLastPerformance(ex.name))
  }, [ex.name])

  const updateSet = (idx: number, field: keyof SetState, value: any) => {
    setSets(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n })
  }

  const handleConfirm = (idx: number) => {
    const s = sets[idx]
    const w = parseFloat(s.weight)
    const r = parseInt(s.reps)
    if (!w || !r) return

    // Save to DB
    ExercisesDB.insert({
      id: generateId(), workoutId, name: ex.name,
      sets: 1, reps: r, weight: w,
      rpe: s.rpe ?? null, rir: null,
      orderIndex: idx,
    })

    setSets(prev => { const n = [...prev]; n[idx] = { ...n[idx], done: true }; return n })
    onSetConfirmed?.(ex.name)

    // PR detection
    const pr = ExercisesDB.isPR(ex.name, w, r)
    if (pr.weightPR || pr.repsPR || pr.volumePR) {
      setPrBanner(pr)
      setPrWeight(w)
      setPrReps(r)
      if (pr.weightPR || pr.repsPR) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      if (prTimer.current) clearTimeout(prTimer.current)
      prAnim.setValue(0)
      Animated.sequence([
        Animated.timing(prAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(prAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setPrBanner(null))
    }
  }

  return (
    <View style={st.activeExCard}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={st.exIcon}>
          <Text style={{ fontSize: 18 }}>{ex.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.exName}>{ex.name}</Text>
          <Text style={st.exDetail}>{ex.sets} séries × {ex.reps} reps cible</Text>
        </View>
      </View>

      {/* Last performance */}
      {lastPerf ? (
        <View style={st.lastPerfCard}>
          <Text style={{ fontSize: 16 }}>📋</Text>
          <Text style={st.lastPerfText}>
            Dernière fois : {lastPerf.weight}kg × {lastPerf.reps} reps
            {lastPerf.rpe ? ` @ RPE ${lastPerf.rpe}` : ''}
          </Text>
        </View>
      ) : (
        <Text style={st.firstTimeText}>Première fois sur cet exercice 🆕</Text>
      )}

      {/* Sets */}
      {sets.map((s, idx) => (
        <View key={idx} style={[st.setBlock, s.done && st.setBlockDone]}>
          <View style={st.setRow}>
            <Text style={st.setLabel}>#{idx + 1}</Text>
            <TextInput
              style={st.weightInput}
              value={s.weight}
              onChangeText={v => updateSet(idx, 'weight', v)}
              placeholder="kg"
              placeholderTextColor="#7A9AAB"
              keyboardType="decimal-pad"
              selectionColor="#FF9F1C"
              editable={!s.done}
            />
            <Text style={st.setSep}>×</Text>
            <TextInput
              style={st.repsInput}
              value={s.reps}
              onChangeText={v => updateSet(idx, 'reps', v)}
              placeholder="reps"
              placeholderTextColor="#7A9AAB"
              keyboardType="number-pad"
              selectionColor="#FF9F1C"
              editable={!s.done}
            />
            <TouchableOpacity
              style={[st.confirmSetBtn, s.done && st.confirmSetBtnDone]}
              onPress={() => handleConfirm(idx)}
              disabled={s.done}
              activeOpacity={0.8}
            >
              <Text style={st.confirmSetBtnText}>✓</Text>
            </TouchableOpacity>
          </View>
          {!s.done && (
            <View>
              <Text style={st.rpeLabel}>RPE</Text>
              <RPEPicker value={s.rpe} onChange={v => updateSet(idx, 'rpe', v)} />
            </View>
          )}
          {s.done && s.rpe != null && (
            <View style={st.rpeDoneRow}>
              <View style={st.rpePillActive}>
                <Text style={st.rpePillTextActive}>RPE {s.rpe}</Text>
              </View>
            </View>
          )}
        </View>
      ))}

      {/* PR Banner */}
      {prBanner && (
        <Animated.View style={[st.prBanner, { opacity: prAnim }]}>
          <Text style={{ fontSize: 28 }}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={st.prTitle}>NOUVEAU PR !</Text>
            <Text style={st.prSub}>
              {prBanner.weightPR ? '🎯 Record de poids  ' : ''}
              {prBanner.repsPR   ? '💪 Record de reps  ' : ''}
              {prBanner.volumePR ? '📊 Record de volume' : ''}
            </Text>
            <Text style={st.prE1rm}>
              e1RM estimé : {ExercisesDB.e1RM(prWeight, prReps)} kg
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  )
}

// ─── ExerciceItem (vue non-active) ────────────────────────────────────────────

function ExerciceItem({ ex, isLast }: { ex: PlannedExercise; isLast: boolean }) {
  return (
    <>
      <View style={st.exRow}>
        <View style={st.exIcon}>
          <Text style={{ fontSize: 18 }}>{ex.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.exName}>{ex.name}</Text>
          <Text style={st.exDetail}>{ex.sets} séries × {ex.reps} reps</Text>
        </View>
        {ex.weight != null && (
          <View style={st.weightBadge}>
            <Text style={st.weightBadgeText}>{ex.weight} kg</Text>
          </View>
        )}
      </View>
      {!isLast && <View style={st.separator} />}
    </>
  )
}

// ─── HistoryCard ──────────────────────────────────────────────────────────────

function HistoryCard({ item }: { item: HistoryItem }) {
  const d = format(new Date(item.date + 'T00:00:00'), 'd MMM', { locale: fr })
  const typeBg    = item.type === 'emom' ? '#FF7B541F' : '#FF9F1C1F'
  const typeText  = item.type === 'emom' ? '#D94520'   : '#A07000'
  const typeLabel = item.type === 'emom' ? 'EMOM' : 'Classique'

  return (
    <View style={st.histCard}>
      <View style={{ flex: 1 }}>
        <Text style={st.histName}>{item.name}</Text>
        <Text style={st.histMeta}>{d} · {item.duration} min</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <View style={[st.histBadge, { backgroundColor: typeBg }]}>
          <Text style={[st.histBadgeText, { color: typeText }]}>{typeLabel}</Text>
        </View>
        <View style={[st.histBadge, { backgroundColor: '#2DC6531F' }]}>
          <Text style={[st.histBadgeText, { color: '#1A9A50' }]}>Terminé</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const [tab,       setTab]       = useState<WorkoutType>('classic')
  const [showSheet, setShowSheet] = useState(false)
  const [history,   setHistory]   = useState<HistoryItem[]>(INITIAL_HISTORY)

  // Active workout
  const [isActive,        setIsActive]       = useState(false)
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null)

  const { load: loadWorkouts, clearExercisesCache } = useWorkoutStore()

  useFocusEffect(useCallback(() => {
    loadWorkouts()
    return () => clearExercisesCache()
  }, []))

  const deleteWorkout = (id: string) => setHistory(prev => prev.filter(h => h.id !== id))

  const handleStart = () => {
    const id = generateId()
    WorkoutsDB.insert({
      id, name: 'Push / Pull Day', type: 'classic',
      duration: 0, date: todayISO(), notes: null,
      createdAt: new Date().toISOString(),
    })
    setActiveWorkoutId(id)
    setIsActive(true)
  }

  const handleFinish = () => {
    setIsActive(false)
    setActiveWorkoutId(null)
  }

  // ── Rest timer state ────────────────────────────────────────────────────────
  const [restTimer, setRestTimer] = useState({ active: false, total: 90, remaining: 90 })

  useEffect(() => {
    if (!restTimer.active) return
    const interval = setInterval(() => {
      setRestTimer(s => {
        if (s.remaining <= 1) return { ...s, active: false, remaining: 0 }
        return { ...s, remaining: s.remaining - 1 }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [restTimer.active])

  useEffect(() => {
    if (!restTimer.active && restTimer.remaining === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Notifications.cancelScheduledNotificationAsync('rest-timer').catch(() => {})
    }
  }, [restTimer.active])

  const startRestTimer = (exerciseName: string) => {
    const restTime = getRestTime(exerciseName)
    setRestTimer({ active: true, total: restTime, remaining: restTime })
    Notifications.cancelScheduledNotificationAsync('rest-timer').catch(() => {})
    Notifications.scheduleNotificationAsync({
      identifier: 'rest-timer',
      content: { title: '💪 Repos terminé !', body: "C'est reparti — prochain set !", sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: restTime },
    }).catch(() => {})
  }

  // ── EMOM timer state ────────────────────────────────────────────────────────
  const [timer, setTimer] = useState({
    isRunning: false, currentSecond: 42, currentMinute: 3,
    totalMinutes: 12, currentExerciseIndex: 0,
  })

  const prevMinute = useRef(timer.currentMinute)

  useEffect(() => {
    if (timer.currentMinute !== prevMinute.current && timer.isRunning) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }
    prevMinute.current = timer.currentMinute
  }, [timer.currentMinute])

  useEffect(() => {
    if (!timer.isRunning) return
    const id = setInterval(() => {
      setTimer(prev => {
        const nextSec = prev.currentSecond + 1
        if (nextSec >= 60) {
          const nextMin = prev.currentMinute + 1
          if (nextMin >= prev.totalMinutes) {
            return { ...prev, isRunning: false, currentSecond: 0, currentMinute: nextMin }
          }
          const nextIdx = (prev.currentExerciseIndex + 1) % mockEmomExercises.length
          return { ...prev, currentSecond: 0, currentMinute: nextMin, currentExerciseIndex: nextIdx }
        }
        return { ...prev, currentSecond: nextSec }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timer.isRunning])

  const toggleTimer = () => setTimer(p => ({ ...p, isRunning: !p.isRunning }))

  const currentEmomEx = mockEmomExercises[timer.currentExerciseIndex]
  const nextEmomEx    = mockEmomExercises[(timer.currentExerciseIndex + 1) % mockEmomExercises.length]
  const timerPct      = timer.currentMinute / timer.totalMinutes

  // ── Bottom sheet state ──────────────────────────────────────────────────────
  const [sName,      setSName]      = useState('')
  const [sType,      setSType]      = useState<WorkoutType>('classic')
  const [sDuration,  setSDuration]  = useState('12')
  const [sExercises, setSExercises] = useState<SheetEx[]>([])
  const [showAddEx,  setShowAddEx]  = useState(false)
  const [exName,     setExName]     = useState('')
  const [exSets,     setExSets]     = useState(3)
  const [exReps,     setExReps]     = useState(10)
  const [exWeight,   setExWeight]   = useState('')

  const handleAddExercise = () => {
    if (!exName.trim()) return
    setSExercises(prev => [...prev, { name: exName.trim(), sets: exSets, reps: exReps, weight: exWeight }])
    setExName(''); setExSets(3); setExReps(10); setExWeight(''); setShowAddEx(false)
  }

  const handleCloseSheet = () => {
    setShowSheet(false); setSName(''); setSType('classic'); setSDuration('12')
    setSExercises([]); setShowAddEx(false); setExName(''); setExWeight('')
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <View style={st.header}>
            <Text style={st.headerTitle}>Workout</Text>
            <TouchableOpacity style={st.addBtn} onPress={() => setShowSheet(true)} activeOpacity={0.85}>
              <Plus size={22} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* ── Tabs internes ─────────────────────────────────────────────── */}
          <View style={st.tabs}>
            {(['classic', 'emom'] as WorkoutType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[st.tabPill, tab === t && st.tabPillActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.8}
              >
                <Text style={[st.tabText, tab === t && st.tabTextActive]}>
                  {t === 'classic' ? 'Classique' : 'EMOM'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ════════════════════════════════════════════════════════════════
              VUE CLASSIQUE
          ════════════════════════════════════════════════════════════════ */}
          {tab === 'classic' && (
            <>
              {/* Card séance active */}
              <View style={[st.activeCard, isActive && st.activeCardRunning]}>
                <Text style={st.activeTitle}>Push / Pull Day</Text>
                <Text style={st.activeSub}>
                  {isActive ? `${mockExercises.length} exercices en cours…` : '4 exercices · 45 min'}
                </Text>
                {isActive ? (
                  <TouchableOpacity style={st.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
                    <Text style={st.finishBtnText}>Terminer</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={st.startBtn} onPress={handleStart} activeOpacity={0.85}>
                    <Text style={st.startBtnText}>Commencer</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Exercices — vue active ou vue normale */}
              <SectionLabel>Exercices</SectionLabel>
              {isActive && activeWorkoutId ? (
                mockExercises.map(ex => (
                  <ActiveExerciseCard key={ex.id} ex={ex} workoutId={activeWorkoutId} onSetConfirmed={startRestTimer} />
                ))
              ) : (
                <View style={st.exCard}>
                  {mockExercises.map((ex, i) => (
                    <ExerciceItem key={ex.id} ex={ex} isLast={i === mockExercises.length - 1} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VUE EMOM
          ════════════════════════════════════════════════════════════════ */}
          {tab === 'emom' && (
            <>
              <View style={st.timerCard}>
                <Text style={st.timerLabel}>EMOM EN COURS</Text>
                <Text style={st.timerClock}>{formatTimer(timer.currentSecond)}</Text>
                <Text style={st.timerExercise}>
                  {currentEmomEx.emoji} {currentEmomEx.name} × {currentEmomEx.reps}
                </Text>
                <View style={st.timerInfoRow}>
                  <Text style={st.timerMinute}>
                    Minute {timer.currentMinute} / {timer.totalMinutes}
                  </Text>
                  <TouchableOpacity style={st.timerToggleBtn} onPress={toggleTimer} activeOpacity={0.85}>
                    <Text style={st.timerToggleText}>
                      {timer.isRunning ? 'Pause' : 'Reprendre'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={st.timerTrack}>
                  <View style={[st.timerFill, { width: `${Math.round(timerPct * 100)}%` }]} />
                </View>
              </View>

              <SectionLabel>Prochain</SectionLabel>
              <View style={st.exCard}>
                <View style={st.exRow}>
                  <View style={st.exIcon}>
                    <Text style={{ fontSize: 18 }}>{nextEmomEx.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.exName}>{nextEmomEx.name}</Text>
                    <Text style={st.exDetail}>{nextEmomEx.reps} reps</Text>
                  </View>
                  <View style={[st.histBadge, { backgroundColor: '#2DC6531F' }]}>
                    <Text style={[st.histBadgeText, { color: '#1A9A50' }]}>Prochain</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ── Historique ────────────────────────────────────────────────── */}
          <SectionLabel>Historique</SectionLabel>
          {history.map(item => (
            <SwipeableRow
              key={item.id}
              rightActions={[{
                label: 'Supprimer', emoji: '🗑️', color: '#FF7B54',
                onPress: () => Alert.alert(
                  'Supprimer la séance', 'Cette action est irréversible.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => deleteWorkout(item.id) },
                  ]
                ),
              }]}
            >
              <HistoryCard item={item} />
            </SwipeableRow>
          ))}
        </ScrollView>

        {/* ════════════════════════════════════════════════════════════════
            REST TIMER BANNER
        ════════════════════════════════════════════════════════════════ */}
        {restTimer.active && (
          <View style={st.restBanner}>
            <View>
              <Text style={st.restLabel}>REPOS</Text>
              <Text style={st.restClock}>
                {Math.floor(restTimer.remaining / 60)}:{String(restTimer.remaining % 60).padStart(2, '0')}
              </Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 16 }}>
              <View style={st.restTrack}>
                <View style={[st.restFill, { width: `${(restTimer.remaining / restTimer.total) * 100}%` as any }]} />
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity
                onPress={() => setRestTimer(s => ({ ...s, remaining: s.remaining + 30 }))}
                style={st.restActionBtn}
                activeOpacity={0.75}
              >
                <Text style={st.restActionText}>+30s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setRestTimer(s => ({ ...s, active: false }))
                  Notifications.cancelScheduledNotificationAsync('rest-timer').catch(() => {})
                }}
                style={st.restActionBtn}
                activeOpacity={0.75}
              >
                <Text style={st.restActionText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════
            BOTTOM SHEET NOUVELLE SÉANCE
        ════════════════════════════════════════════════════════════════ */}
        {showSheet && (
          <>
            <Pressable style={st.overlay} onPress={handleCloseSheet} />
            <View style={st.sheet}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={st.sheetTitle}>Nouvelle séance</Text>

                <TextInput
                  style={st.sheetInput}
                  placeholder="Nom de la séance…"
                  placeholderTextColor="#7A9AAB"
                  value={sName}
                  onChangeText={setSName}
                  autoFocus
                  selectionColor="#FF9F1C"
                />

                <Text style={st.sheetLabel}>Type</Text>
                <View style={st.sheetTypePills}>
                  {(['classic', 'emom'] as WorkoutType[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[st.sheetTypePill, sType === t && st.sheetTypePillActive]}
                      onPress={() => setSType(t)}
                      activeOpacity={0.8}
                    >
                      <Text style={[st.sheetTypePillText, sType === t && { color: '#fff', fontWeight: '700' }]}>
                        {t === 'classic' ? 'Classique' : 'EMOM'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {sType === 'emom' && (
                  <>
                    <Text style={st.sheetLabel}>Durée totale (minutes)</Text>
                    <TextInput
                      style={st.sheetInput}
                      placeholder="12"
                      placeholderTextColor="#7A9AAB"
                      value={sDuration}
                      onChangeText={setSDuration}
                      keyboardType="number-pad"
                      selectionColor="#FF9F1C"
                    />
                  </>
                )}

                {sExercises.length > 0 && (
                  <>
                    <Text style={st.sheetLabel}>Exercices</Text>
                    {sExercises.map((ex, i) => (
                      <View key={i} style={st.sheetExItem}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#264653', flex: 1 }}>
                          {ex.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#4A7080' }}>
                          {sType === 'classic'
                            ? `${ex.sets}×${ex.reps}${ex.weight ? ` · ${ex.weight}kg` : ''}`
                            : `× ${ex.reps}`}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {showAddEx ? (
                  <View style={st.sheetAddExForm}>
                    <TextInput
                      style={st.sheetInput}
                      placeholder="Nom de l'exercice…"
                      placeholderTextColor="#7A9AAB"
                      value={exName}
                      onChangeText={setExName}
                      autoFocus
                      selectionColor="#FF9F1C"
                    />
                    {sType === 'classic' && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={st.counterRow}>
                          <TouchableOpacity style={st.counterBtn} onPress={() => setExSets(v => Math.max(1, v - 1))}>
                            <Text style={st.counterBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={st.counterVal}>{exSets} séries</Text>
                          <TouchableOpacity style={st.counterBtn} onPress={() => setExSets(v => v + 1)}>
                            <Text style={st.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={st.counterRow}>
                          <TouchableOpacity style={st.counterBtn} onPress={() => setExReps(v => Math.max(1, v - 1))}>
                            <Text style={st.counterBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={st.counterVal}>{exReps} reps</Text>
                          <TouchableOpacity style={st.counterBtn} onPress={() => setExReps(v => v + 1)}>
                            <Text style={st.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    {sType === 'emom' && (
                      <View style={st.counterRow}>
                        <TouchableOpacity style={st.counterBtn} onPress={() => setExReps(v => Math.max(1, v - 1))}>
                          <Text style={st.counterBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={st.counterVal}>{exReps} reps</Text>
                        <TouchableOpacity style={st.counterBtn} onPress={() => setExReps(v => v + 1)}>
                          <Text style={st.counterBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {sType === 'classic' && (
                      <TextInput
                        style={[st.sheetInput, { marginTop: 0 }]}
                        placeholder="Poids (optionnel, kg)"
                        placeholderTextColor="#7A9AAB"
                        value={exWeight}
                        onChangeText={setExWeight}
                        keyboardType="decimal-pad"
                        selectionColor="#FF9F1C"
                      />
                    )}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[st.sheetConfirm, { flex: 1, backgroundColor: '#FF9F1C' }]}
                        onPress={handleAddExercise}
                      >
                        <Text style={st.sheetConfirmText}>Confirmer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[st.sheetConfirm, { flex: 1, backgroundColor: '#E0EDF2' }]}
                        onPress={() => setShowAddEx(false)}
                      >
                        <Text style={[st.sheetConfirmText, { color: '#4A7080' }]}>Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={st.addExBtn} onPress={() => setShowAddEx(true)}>
                    <Text style={st.addExBtnText}>+ Exercice</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[st.sheetConfirm, { marginTop: 8, opacity: sName.trim() ? 1 : 0.45 }]}
                  onPress={handleCloseSheet}
                  disabled={!sName.trim()}
                >
                  <Text style={st.sheetConfirmText}>Créer la séance</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCloseSheet} style={{ alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
                  <Text style={{ color: '#7A9AAB', fontSize: 14 }}>Annuler</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FFF8F0' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, marginBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#FF9F1C', letterSpacing: -0.5 },
  addBtn: {
    width: 40, height: 40, borderRadius: 99, backgroundColor: '#FF9F1C',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 26, fontWeight: '400' },

  // Tabs
  tabs:          { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabPill:       { borderRadius: 99, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#E0EDF2' },
  tabPillActive: { backgroundColor: '#FF9F1C' },
  tabText:       { fontSize: 14, fontWeight: '500', color: '#4A7080' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // Active session card
  activeCard: {
    backgroundColor: '#FF9F1C', borderRadius: 24, padding: 20, marginBottom: 16,
  },
  activeCardRunning: { backgroundColor: '#1A9A50' },
  activeTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  activeSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
  startBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, padding: 10,
    alignItems: 'center', alignSelf: 'flex-start',
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  finishBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, padding: 10,
    alignItems: 'center', alignSelf: 'flex-start',
  },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Exercise card (non-active)
  exCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#FF9F1C',
    shadowColor: '#FF9F1C', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  exRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  exIcon:  {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FF9F1C1F',
    alignItems: 'center', justifyContent: 'center',
  },
  exName:          { fontSize: 14, fontWeight: '700', color: '#264653' },
  exDetail:        { fontSize: 12, color: '#4A7080', marginTop: 2 },
  weightBadge:     { backgroundColor: '#FF9F1C1F', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 },
  weightBadgeText: { fontSize: 10, fontWeight: '700', color: '#A07000' },
  separator:       { height: 0.5, backgroundColor: '#EDE4D9', marginVertical: 6 },

  // Active exercise card
  activeExCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#1A9A50',
    shadowColor: '#1A9A50', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },

  // Last performance
  lastPerfCard: {
    backgroundColor: '#FF9F1C1F', borderRadius: 12, padding: 10,
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  lastPerfText: { fontSize: 12, color: '#A07000', fontWeight: '600', flex: 1 },
  firstTimeText: {
    fontSize: 12, color: '#7A9AAB', fontStyle: 'italic',
    marginBottom: 10, paddingLeft: 4,
  },

  // Set rows
  setBlock: {
    backgroundColor: '#FFF8F0', borderRadius: 12, padding: 10,
    marginBottom: 6,
  },
  setBlockDone: { backgroundColor: '#2DC6531A' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setLabel: { fontSize: 11, fontWeight: '700', color: '#7A9AAB', width: 24 },
  weightInput: {
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
    fontSize: 14, fontWeight: '600', color: '#264653', width: 70,
    borderWidth: 1, borderColor: '#E0EDF2',
    textAlign: 'center',
  },
  repsInput: {
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
    fontSize: 14, fontWeight: '600', color: '#264653', width: 60,
    borderWidth: 1, borderColor: '#E0EDF2',
    textAlign: 'center',
  },
  setSep: { fontSize: 16, fontWeight: '700', color: '#7A9AAB' },
  confirmSetBtn: {
    marginLeft: 'auto', backgroundColor: '#FF9F1C', borderRadius: 10,
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
  },
  confirmSetBtnDone: { backgroundColor: '#1A9A50' },
  confirmSetBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  // RPE
  rpeLabel: { fontSize: 10, fontWeight: '700', color: '#7A9AAB', letterSpacing: 0.5, marginTop: 8, marginBottom: 4, marginLeft: 2 },
  rpePillRow: { flexGrow: 0, marginBottom: 2 },
  rpePill: {
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#E0EDF2', marginRight: 4,
  },
  rpePillActive:     { backgroundColor: '#FF9F1C' },
  rpePillText:       { fontSize: 11, fontWeight: '600', color: '#4A7080' },
  rpePillTextActive: { fontSize: 11, fontWeight: '700', color: '#fff' },
  rpeDoneRow: { flexDirection: 'row', marginTop: 6 },

  // PR Banner
  prBanner: {
    backgroundColor: '#FFD700', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: 8,
  },
  prTitle: { fontSize: 16, fontWeight: '900', color: '#264653' },
  prSub:   { fontSize: 12, color: '#4A7080', marginTop: 2 },
  prE1rm:  { fontSize: 11, color: '#4A7080', marginTop: 2 },

  // History
  histCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#FF9F1C', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  histName:      { fontSize: 13, fontWeight: '700', color: '#264653', marginBottom: 2 },
  histMeta:      { fontSize: 11, color: '#7A9AAB' },
  histBadge:     { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 },
  histBadgeText: { fontSize: 10, fontWeight: '700' },

  // EMOM timer card
  timerCard: { backgroundColor: '#FF9F1C', borderRadius: 24, padding: 24, marginBottom: 12 },
  timerLabel:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, marginBottom: 8 },
  timerClock:    { fontSize: 56, fontWeight: '900', color: '#fff', lineHeight: 60, marginBottom: 6 },
  timerExercise: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 14 },
  timerInfoRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  timerMinute:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  timerToggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99,
    paddingVertical: 6, paddingHorizontal: 16,
  },
  timerToggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  timerTrack: { backgroundColor: 'rgba(255,255,255,0.25)', height: 8, borderRadius: 99, overflow: 'hidden' },
  timerFill:  { backgroundColor: '#fff', height: 8, borderRadius: 99 },

  // Overlay + sheet
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,13,26,0.35)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#264653', textAlign: 'center', marginBottom: 16 },
  sheetInput: {
    backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14,
    fontSize: 15, color: '#264653', marginBottom: 12,
  },
  sheetLabel: {
    fontSize: 12, fontWeight: '700', color: '#7A9AAB',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8,
  },
  sheetTypePills:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sheetTypePill:       { flex: 1, borderRadius: 99, paddingVertical: 10, backgroundColor: '#E0EDF2', alignItems: 'center' },
  sheetTypePillActive: { backgroundColor: '#FF9F1C' },
  sheetTypePillText:   { fontSize: 14, fontWeight: '500', color: '#4A7080' },
  sheetExItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#EDE4D9',
  },
  sheetAddExForm: { backgroundColor: '#FFF8F0', borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 },
  addExBtn: {
    borderWidth: 1.5, borderColor: '#FF9F1C', borderStyle: 'dashed',
    borderRadius: 14, padding: 12, alignItems: 'center', marginBottom: 12,
  },
  addExBtnText: { color: '#FF9F1C', fontWeight: '700', fontSize: 14 },
  sheetConfirm: {
    backgroundColor: '#FF9F1C', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 4,
  },
  sheetConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  counterRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, padding: 8,
  },
  counterBtn:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E0EDF2', alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 16, color: '#264653', fontWeight: '600', lineHeight: 18 },
  counterVal:     { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#264653' },

  // Rest timer banner
  restBanner: {
    position: 'absolute', bottom: 80, left: 16, right: 16,
    backgroundColor: '#FF9F1C', borderRadius: 20,
    padding: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FF9F1C', shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  restLabel:     { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase' },
  restClock:     { fontSize: 36, fontWeight: '900', color: '#fff' },
  restTrack:     { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 99, height: 8 },
  restFill:      { height: 8, borderRadius: 99, backgroundColor: '#fff' },
  restActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  restActionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
})
