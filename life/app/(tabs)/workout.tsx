import React, { useEffect, useRef, useState } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as Haptics from 'expo-haptics'
import { SectionLabel } from '@/components/ui'

// ─── Types & données fictives ─────────────────────────────────────────────────

type WorkoutType = 'classic' | 'emom'

interface Exercise    { id: string; name: string; sets: number; reps: number; weight: number | null; emoji: string }
interface EmomEx      { name: string; reps: number; emoji: string }
interface HistoryItem { id: string; name: string; type: WorkoutType; duration: number; date: string }
interface SheetEx     { name: string; sets: number; reps: number; weight: string }

const mockExercises: Exercise[] = [
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

const mockHistory: HistoryItem[] = [
  { id: '1', name: 'Push / Pull',       type: 'classic', duration: 45, date: '2026-05-05' },
  { id: '2', name: 'Full body EMOM',    type: 'emom',    duration: 20, date: '2026-05-03' },
  { id: '3', name: 'Legs day',          type: 'classic', duration: 50, date: '2026-05-01' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatTimer = (sec: number) => `00:${pad2(sec)}`

// ─── ExerciceItem ─────────────────────────────────────────────────────────────

function ExerciceItem({ ex, isLast }: { ex: Exercise; isLast: boolean }) {
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
  const typeBg   = item.type === 'emom' ? '#FF5C5C1F' : '#FF95001F'
  const typeText = item.type === 'emom' ? '#CC2222'   : '#B36800'
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
        <View style={[st.histBadge, { backgroundColor: '#00C8961F' }]}>
          <Text style={[st.histBadgeText, { color: '#00A87A' }]}>Terminé</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const [tab,         setTab]         = useState<WorkoutType>('classic')
  const [showSheet,   setShowSheet]   = useState(false)

  // ── EMOM timer state ────────────────────────────────────────────────────────
  const [timer, setTimer] = useState({
    isRunning:            false,
    currentSecond:        42,
    currentMinute:        3,
    totalMinutes:         12,
    currentExerciseIndex: 0,
  })

  const prevMinute = useRef(timer.currentMinute)

  // Haptics à chaque changement de minute
  useEffect(() => {
    if (timer.currentMinute !== prevMinute.current && timer.isRunning) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }
    prevMinute.current = timer.currentMinute
  }, [timer.currentMinute])

  // Intervalle du timer
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
  const [sName,       setSName]       = useState('')
  const [sType,       setSType]       = useState<WorkoutType>('classic')
  const [sDuration,   setSDuration]   = useState('12')
  const [sExercises,  setSExercises]  = useState<SheetEx[]>([])
  const [showAddEx,   setShowAddEx]   = useState(false)
  const [exName,      setExName]      = useState('')
  const [exSets,      setExSets]      = useState(3)
  const [exReps,      setExReps]      = useState(10)
  const [exWeight,    setExWeight]    = useState('')

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
              <Text style={st.addBtnText}>+</Text>
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
              <View style={st.activeCard}>
                <Text style={st.activeTitle}>Push / Pull Day</Text>
                <Text style={st.activeSub}>5 exercices · 45 min</Text>
                <TouchableOpacity style={st.startBtn} activeOpacity={0.85}>
                  <Text style={st.startBtnText}>Commencer</Text>
                </TouchableOpacity>
              </View>

              {/* Liste exercices */}
              <SectionLabel>Exercices</SectionLabel>
              <View style={st.exCard}>
                {mockExercises.map((ex, i) => (
                  <ExerciceItem key={ex.id} ex={ex} isLast={i === mockExercises.length - 1} />
                ))}
              </View>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VUE EMOM
          ════════════════════════════════════════════════════════════════ */}
          {tab === 'emom' && (
            <>
              {/* Timer card */}
              <View style={st.timerCard}>
                <Text style={st.timerLabel}>EMOM EN COURS</Text>
                <Text style={st.timerClock}>{formatTimer(timer.currentSecond)}</Text>
                <Text style={st.timerExercise}>
                  {currentEmomEx.emoji} {currentEmomEx.name} × {currentEmomEx.reps}
                </Text>

                {/* Ligne info + bouton */}
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

                {/* Barre de progression */}
                <View style={st.timerTrack}>
                  <View style={[st.timerFill, { width: `${Math.round(timerPct * 100)}%` }]} />
                </View>
              </View>

              {/* Prochain exercice */}
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
                  <View style={[st.histBadge, { backgroundColor: '#00C8961F' }]}>
                    <Text style={[st.histBadgeText, { color: '#00A87A' }]}>Prochain</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ── Historique (commun aux 2 vues) ─────────────────────────── */}
          <SectionLabel>Historique</SectionLabel>
          {mockHistory.map(item => (
            <HistoryCard key={item.id} item={item} />
          ))}
        </ScrollView>

        {/* ════════════════════════════════════════════════════════════════
            BOTTOM SHEET NOUVELLE SÉANCE
        ════════════════════════════════════════════════════════════════ */}
        {showSheet && (
          <>
            <Pressable style={st.overlay} onPress={handleCloseSheet} />
            <View style={st.sheet}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={st.sheetTitle}>Nouvelle séance</Text>

                {/* Nom */}
                <TextInput
                  style={st.sheetInput}
                  placeholder="Nom de la séance…"
                  placeholderTextColor="#A0A0B8"
                  value={sName}
                  onChangeText={setSName}
                  autoFocus
                  selectionColor="#FF9500"
                />

                {/* Type */}
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

                {/* EMOM — durée */}
                {sType === 'emom' && (
                  <>
                    <Text style={st.sheetLabel}>Durée totale (minutes)</Text>
                    <TextInput
                      style={st.sheetInput}
                      placeholder="12"
                      placeholderTextColor="#A0A0B8"
                      value={sDuration}
                      onChangeText={setSDuration}
                      keyboardType="number-pad"
                      selectionColor="#FF9500"
                    />
                  </>
                )}

                {/* Liste exercices ajoutés */}
                {sExercises.length > 0 && (
                  <>
                    <Text style={st.sheetLabel}>Exercices</Text>
                    {sExercises.map((ex, i) => (
                      <View key={i} style={st.sheetExItem}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0D0D1A', flex: 1 }}>
                          {ex.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6B6B85' }}>
                          {sType === 'classic'
                            ? `${ex.sets}×${ex.reps}${ex.weight ? ` · ${ex.weight}kg` : ''}`
                            : `× ${ex.reps}`}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Formulaire ajout exercice */}
                {showAddEx ? (
                  <View style={st.sheetAddExForm}>
                    <TextInput
                      style={st.sheetInput}
                      placeholder="Nom de l'exercice…"
                      placeholderTextColor="#A0A0B8"
                      value={exName}
                      onChangeText={setExName}
                      autoFocus
                      selectionColor="#FF9500"
                    />
                    {sType === 'classic' && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {/* Sets counter */}
                        <View style={st.counterRow}>
                          <TouchableOpacity style={st.counterBtn} onPress={() => setExSets(v => Math.max(1, v - 1))}>
                            <Text style={st.counterBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={st.counterVal}>{exSets} séries</Text>
                          <TouchableOpacity style={st.counterBtn} onPress={() => setExSets(v => v + 1)}>
                            <Text style={st.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        {/* Reps counter */}
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
                        placeholderTextColor="#A0A0B8"
                        value={exWeight}
                        onChangeText={setExWeight}
                        keyboardType="decimal-pad"
                        selectionColor="#FF9500"
                      />
                    )}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[st.sheetConfirm, { flex: 1, backgroundColor: '#FF9500' }]}
                        onPress={handleAddExercise}
                      >
                        <Text style={st.sheetConfirmText}>Confirmer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[st.sheetConfirm, { flex: 1, backgroundColor: '#EEEEF5' }]}
                        onPress={() => setShowAddEx(false)}
                      >
                        <Text style={[st.sheetConfirmText, { color: '#6B6B85' }]}>Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={st.addExBtn} onPress={() => setShowAddEx(true)}>
                    <Text style={st.addExBtnText}>+ Exercice</Text>
                  </TouchableOpacity>
                )}

                {/* Créer la séance */}
                <TouchableOpacity
                  style={[st.sheetConfirm, { marginTop: 8, opacity: sName.trim() ? 1 : 0.45 }]}
                  onPress={handleCloseSheet}
                  disabled={!sName.trim()}
                >
                  <Text style={st.sheetConfirmText}>Créer la séance</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCloseSheet} style={{ alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
                  <Text style={{ color: '#A0A0B8', fontSize: 14 }}>Annuler</Text>
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
  safe:   { flex: 1, backgroundColor: '#F7F7FA' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, marginBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#0D0D1A', letterSpacing: -0.5 },
  addBtn: {
    width: 40, height: 40, borderRadius: 99, backgroundColor: '#FF9500',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 26, fontWeight: '400' },

  // Tabs
  tabs:          { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabPill:       { borderRadius: 99, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#EEEEF5' },
  tabPillActive: { backgroundColor: '#FF9500' },
  tabText:       { fontSize: 14, fontWeight: '500', color: '#6B6B85' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // Active session card
  activeCard: {
    backgroundColor: '#FF9500', borderRadius: 24, padding: 20, marginBottom: 16,
  },
  activeTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  activeSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
  startBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, padding: 10,
    alignItems: 'center', alignSelf: 'flex-start',
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Exercise card wrapper
  exCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#FF9500',
    shadowColor: '#FF9500', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  exRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  exIcon:  {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FF95001F',
    alignItems: 'center', justifyContent: 'center',
  },
  exName:       { fontSize: 14, fontWeight: '700', color: '#0D0D1A' },
  exDetail:     { fontSize: 12, color: '#6B6B85', marginTop: 2 },
  weightBadge:  { backgroundColor: '#FF95001F', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 },
  weightBadgeText: { fontSize: 10, fontWeight: '700', color: '#B36800' },
  separator:    { height: 0.5, backgroundColor: '#F0F0F8', marginVertical: 6 },

  // History
  histCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#6C47FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  histName:      { fontSize: 13, fontWeight: '700', color: '#0D0D1A', marginBottom: 2 },
  histMeta:      { fontSize: 11, color: '#A0A0B8' },
  histBadge:     { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 },
  histBadgeText: { fontSize: 10, fontWeight: '700' },

  // EMOM timer card
  timerCard: {
    backgroundColor: '#FF9500', borderRadius: 24, padding: 24, marginBottom: 12,
  },
  timerLabel:   { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, marginBottom: 8 },
  timerClock:   { fontSize: 56, fontWeight: '900', color: '#fff', lineHeight: 60, marginBottom: 6 },
  timerExercise:{ fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 14 },
  timerInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  timerMinute:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  timerToggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99,
    paddingVertical: 6, paddingHorizontal: 16,
  },
  timerToggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  timerTrack:   { backgroundColor: 'rgba(255,255,255,0.25)', height: 8, borderRadius: 99, overflow: 'hidden' },
  timerFill:    { backgroundColor: '#fff', height: 8, borderRadius: 99 },

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
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0D0D1A', textAlign: 'center', marginBottom: 16 },
  sheetInput: {
    backgroundColor: '#F7F7FA', borderRadius: 14, padding: 14,
    fontSize: 15, color: '#0D0D1A', marginBottom: 12,
  },
  sheetLabel: {
    fontSize: 12, fontWeight: '700', color: '#A0A0B8',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8,
  },
  sheetTypePills:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sheetTypePill:     { flex: 1, borderRadius: 99, paddingVertical: 10, backgroundColor: '#EEEEF5', alignItems: 'center' },
  sheetTypePillActive: { backgroundColor: '#FF9500' },
  sheetTypePillText: { fontSize: 14, fontWeight: '500', color: '#6B6B85' },
  sheetExItem:  {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#F0F0F8',
  },
  sheetAddExForm: { backgroundColor: '#F7F7FA', borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 },
  addExBtn: {
    borderWidth: 1.5, borderColor: '#FF9500', borderStyle: 'dashed',
    borderRadius: 14, padding: 12, alignItems: 'center', marginBottom: 12,
  },
  addExBtnText: { color: '#FF9500', fontWeight: '700', fontSize: 14 },
  sheetConfirm: {
    backgroundColor: '#FF9500', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 4,
  },
  sheetConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  counterRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, padding: 8,
  },
  counterBtn:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EEEEF5', alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 16, color: '#0D0D1A', fontWeight: '600', lineHeight: 18 },
  counterVal:     { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#0D0D1A' },
})
