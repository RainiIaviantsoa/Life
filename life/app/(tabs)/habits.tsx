import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react-native'
import {
  Alert,
  Animated,
  Keyboard,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { SectionLabel, StatCard } from '@/components/ui'
import { useHabitsStore } from '@/store/habitsStore'
import type { Habit } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJI_PRESETS = ['🏋️','📚','🧘','💧','🚫','🎯','✍️','🌅','🥗','💊','🎸','🏃']
const MEDALS        = ['🥇','🥈','🥉']

function streakBorderColor(streak: number) {
  if (streak >= 7) return '#FF7B54'
  if (streak >= 3) return '#2DC653'
  return '#C5D5DC'
}
function streakCircleBg(streak: number) {
  if (streak >= 7) return '#FF7B541F'
  if (streak >= 3) return '#2DC6531F'
  return '#E0EDF2'
}

// ─── HabitItem ────────────────────────────────────────────────────────────────

function HabitItem({
  habit, onToggle, onFreeze,
}: { habit: Habit; onToggle: (id: string) => void; onFreeze: (id: string) => void }) {
  const scale = useRef(new Animated.Value(1)).current

  const handleToggle = () => {
    if (habit.completedToday) return
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, friction: 4, tension: 200 }),
      Animated.spring(scale, { toValue: 1,   useNativeDriver: true, friction: 6, tension: 200 }),
    ]).start()
    onToggle(habit.id)
  }

  return (
    <View style={[st.habitCard, { borderLeftColor: streakBorderColor(habit.streak) }]}>
      <View style={[st.habitEmoji, { backgroundColor: streakCircleBg(habit.streak) }]}>
        <Text style={{ fontSize: 22 }}>{habit.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.habitName}>{habit.name}</Text>
        {habit.identityStatement ? (
          <Text style={st.habitIdentity}>
            "Je suis quelqu'un qui {habit.identityStatement}"
          </Text>
        ) : null}
        <Text style={st.habitStreak}>
          {habit.streak > 0 ? `🔥 ${habit.streak} jours` : 'À commencer'}
        </Text>
        {habit.totalCompletions > 0 && (
          <Text style={st.habitTotal}>
            {habit.totalCompletions} {habit.identityStatement ? 'votes pour cette identité 🗳️' : `validation${habit.totalCompletions > 1 ? 's' : ''} au total`}
          </Text>
        )}
        {(habit.whenField || habit.whereField) && (
          <View style={st.contextBadge}>
            <Text style={st.contextBadgeText}>
              📍 {[habit.whenField, habit.whereField].filter(Boolean).join(' — ')}
            </Text>
          </View>
        )}
        {habit.missedYesterday === 1 && (
          <View style={st.missWarning}>
            <Text style={{ fontSize: 14 }}>⚠️</Text>
            <Text style={st.missWarningText}>Ne manque pas aujourd'hui !</Text>
          </View>
        )}
        {habit.freezesAvailable > 0 && !habit.completedToday && (
          <TouchableOpacity onPress={() => onFreeze(habit.id)} style={st.freezeBtn} activeOpacity={0.75}>
            <Text style={{ fontSize: 14 }}>🧊</Text>
            <Text style={st.freezeBtnText}>
              Utiliser un joker ({habit.freezesAvailable} restant{habit.freezesAvailable > 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={[st.checkBtn, habit.completedToday && st.checkBtnDone]}
          onPress={handleToggle}
          activeOpacity={0.8}
        >
          <Text style={[st.checkMark, habit.completedToday && { color: '#fff' }]}>✓</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HabitsScreen() {
  const insets = useSafeAreaInsets()
  const [kbHeight, setKbHeight] = useState(0)
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e => setKbHeight(e.endCoordinates.height))
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbHeight(0))
    return () => { show.remove(); hide.remove() }
  }, [])
  const { habits, load, addHabit, toggleHabit, deleteHabit, useFreeze } = useHabitsStore()
  const [showSheet,          setShowSheet]          = useState(false)
  const [newName,            setNewName]            = useState('')
  const [newEmoji,           setNewEmoji]           = useState('🎯')
  const [identityStatement,  setIdentityStatement]  = useState('')
  const [whenField,          setWhenField]          = useState('')
  const [whereField,         setWhereField]         = useState('')

  useFocusEffect(useCallback(() => { load() }, []))

  const completedCount = habits.filter(h => h.completedToday).length
  const totalFreezes   = habits.reduce((sum, h) => sum + (h.freezesAvailable ?? 0), 0)
  const topHabits      = [...habits].sort((a, b) => b.streak - a.streak).slice(0, 3)
  const emojiRows      = [EMOJI_PRESETS.slice(0, 6), EMOJI_PRESETS.slice(6, 12)]

  const resetForm = () => {
    setNewName(''); setNewEmoji('🎯')
    setIdentityStatement(''); setWhenField(''); setWhereField('')
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    addHabit(newName.trim(), newEmoji, identityStatement.trim() || undefined, whenField.trim() || undefined, whereField.trim() || undefined)
    resetForm(); setShowSheet(false)
  }
  const handleCancel = () => { resetForm(); setShowSheet(false) }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={st.header}>
            <View>
              <Text style={st.headerTitle}>Habitudes</Text>
              <Text style={st.headerSub}>Aujourd'hui</Text>
            </View>
            <TouchableOpacity style={st.addBtn} onPress={() => setShowSheet(true)} activeOpacity={0.85}>
              <Plus size={22} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={st.statsRow}>
            <StatCard value={`${completedCount} / ${habits.length}`} label="Validées"      color="#2DC653" />
            <StatCard value={`🧊 ${totalFreezes}`}                   label="Jokers restants" color="#2DC653" />
          </View>

          {/* Liste */}
          <SectionLabel>Mes habitudes</SectionLabel>
          {habits.length === 0 ? (
            <Text style={st.empty}>Crée ta première habitude 💪</Text>
          ) : (
            habits.map(habit => (
              <SwipeableRow
                key={habit.id}
                rightActions={[
                  {
                    label: 'Supprimer',
                    emoji: '🗑️',
                    color: '#FF7B54',
                    onPress: () => {
                      Alert.alert(
                        'Supprimer l\'habitude',
                        `Supprimer "${habit.name}" et tout son historique ?`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Supprimer', style: 'destructive', onPress: () => deleteHabit(habit.id) },
                        ]
                      )
                    },
                  },
                ]}
              >
                <HabitItem habit={habit} onToggle={() => toggleHabit(habit.id)} onFreeze={useFreeze} />
              </SwipeableRow>
            ))
          )}

          {/* Hall of Fame */}
          {topHabits.length > 0 && (
            <>
              <SectionLabel>Classement</SectionLabel>
              <View style={st.hallCard}>
                <Text style={st.hallTitle}>🏆 Meilleure série</Text>
                {topHabits.map((h, i) => (
                  <View key={h.id} style={st.hallRow}>
                    <Text style={st.hallMedal}>{MEDALS[i]}</Text>
                    <Text style={st.hallEmoji}>{h.emoji}</Text>
                    <Text style={st.hallName}>{h.name}</Text>
                    <Text style={st.hallStreak}>🔥 {h.streak} jours</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom sheet */}
        {showSheet && (
          <>
            <Pressable style={st.overlay} onPress={handleCancel} />
            {kbHeight > 0 && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: Math.max(0, kbHeight - insets.bottom - 40), backgroundColor: '#fff' }} />}
            <View style={[st.sheet, { bottom: kbHeight > 0 ? Math.max(0, kbHeight - insets.bottom - 40) : 0, paddingBottom: kbHeight > 0 ? 26 : 36 }]}>
              <Text style={st.sheetTitle}>Nouvelle habitude</Text>
              <TextInput style={st.sheetInput} placeholder="Nom de l'habitude…" placeholderTextColor="#7A9AAB" value={newName} onChangeText={setNewName} selectionColor="#2DC653" />
              <Text style={st.sheetLabel}>Emoji</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {emojiRows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {row.map(emoji => (
                      <TouchableOpacity
                        key={emoji}
                        style={[st.emojiItem, newEmoji === emoji && { borderWidth: 2, borderColor: '#2DC653', backgroundColor: '#2DC6531F' }]}
                        onPress={() => setNewEmoji(emoji)} activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
              {/* Identity statement */}
              <View style={{ marginTop: 4 }}>
                <Text style={st.sheetLabel}>Déclaration d'identité (optionnel)</Text>
                <View style={st.identityPrefix}>
                  <Text style={st.identityPrefixText}>Je suis quelqu'un qui…</Text>
                </View>
                <TextInput
                  style={[st.sheetInput, { marginTop: 8, marginBottom: 0 }]}
                  value={identityStatement}
                  onChangeText={setIdentityStatement}
                  placeholder="fait du sport chaque jour"
                  placeholderTextColor="#7A9AAB"
                  selectionColor="#2DC653"
                />
              </View>

              {/* Implementation intention */}
              <View style={{ marginTop: 16, marginBottom: 16 }}>
                <Text style={st.sheetLabel}>Quand et où ? (optionnel)</Text>
                <View style={{ gap: 8 }}>
                  <TextInput
                    style={[st.sheetInput, { marginBottom: 0 }]}
                    value={whenField}
                    onChangeText={setWhenField}
                    placeholder="Après mon café du matin..."
                    placeholderTextColor="#7A9AAB"
                    selectionColor="#2DC653"
                  />
                  <TextInput
                    style={[st.sheetInput, { marginBottom: 0 }]}
                    value={whereField}
                    onChangeText={setWhereField}
                    placeholder="Dans ma chambre / Au bureau..."
                    placeholderTextColor="#7A9AAB"
                    selectionColor="#2DC653"
                  />
                </View>
              </View>

              <TouchableOpacity style={[st.createBtn, !newName.trim() && { opacity: 0.45 }]} onPress={handleCreate} disabled={!newName.trim()} activeOpacity={0.85}>
                <Text style={st.createBtnText}>Créer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancel} style={{ alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
                <Text style={{ color: '#7A9AAB', fontSize: 14 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FFF8F0' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#2DC653', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: '#4A7080', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 99, backgroundColor: '#2DC653', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 26 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#7A9AAB', fontSize: 14, marginTop: 24 },

  habitCard: { backgroundColor: '#fff', borderRadius: 20, borderLeftWidth: 4, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#2DC653', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  habitEmoji: { width: 44, height: 44, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  habitName:     { fontSize: 15, fontWeight: '700', color: '#264653', marginBottom: 2 },
  habitIdentity: { fontSize: 11, color: '#2DC653', fontWeight: '600', fontStyle: 'italic', marginBottom: 3 },
  habitStreak:   { fontSize: 12, color: '#4A7080' },
  habitTotal:    { fontSize: 11, color: '#7A9AAB', marginTop: 1 },
  contextBadge: {
    backgroundColor: '#2DC6531F', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 6, alignSelf: 'flex-start',
  },
  contextBadgeText: { fontSize: 12, color: '#2DC653', fontWeight: '600' },
  missWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FF9F1C1F', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, alignSelf: 'flex-start',
  },
  missWarningText: { fontSize: 11, fontWeight: '700', color: '#A07000' },
  freezeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2DC6531F', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, alignSelf: 'flex-start',
  },
  freezeBtnText: { fontSize: 11, fontWeight: '700', color: '#2DC653' },
  checkBtn:     { width: 36, height: 36, borderRadius: 99, backgroundColor: '#2DC6531F', borderWidth: 2, borderColor: '#2DC653', alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: '#2DC653', borderColor: '#2DC653' },
  checkMark:    { fontSize: 18, color: '#2DC653', fontWeight: '700', lineHeight: 20 },

  hallCard: { backgroundColor: '#FF7B541F', borderRadius: 20, padding: 16, marginBottom: 24 },
  hallTitle: { fontSize: 13, fontWeight: '700', color: '#FF7B54', marginBottom: 12 },
  hallRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  hallMedal: { fontSize: 20, width: 28 },
  hallEmoji: { fontSize: 18, width: 26 },
  hallName:  { flex: 1, fontSize: 14, fontWeight: '600', color: '#264653' },
  hallStreak:{ fontSize: 12, fontWeight: '700', color: '#FF7B54' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,13,26,0.35)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#264653', textAlign: 'center', marginBottom: 16 },
  sheetInput: { backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14, fontSize: 15, color: '#264653', marginBottom: 14 },
  sheetLabel: { fontSize: 12, fontWeight: '700', color: '#7A9AAB', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  identityPrefix: { backgroundColor: '#2DC6531F', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center' },
  identityPrefixText: { fontSize: 14, fontWeight: '700', color: '#1A9A50' },
  emojiItem: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#FFF8F0', alignItems: 'center', justifyContent: 'center' },
  createBtn:     { backgroundColor: '#2DC653', borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 4 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
