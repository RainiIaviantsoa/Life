import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Keyboard,
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
import { Calendar } from 'react-native-calendars'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useFocusEffect } from 'expo-router'
import { useTasksStore } from '@/store/tasksStore'
import { TasksDB, todayISO } from '@/database'
import type { Priority, Recurrence, Task } from '@/types'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  high:   { border: '#FF5C5C', bg: '#FF5C5C1F', text: '#CC2222', label: 'Haute'   },
  medium: { border: '#FF9500', bg: '#FF95001F', text: '#B36800', label: 'Moyenne' },
  low:    { border: '#6C47FF', bg: '#6C47FF1F', text: '#4422CC', label: 'Basse'   },
} as const

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none:    'Aucune',
  daily:   'Quotidien',
  weekly:  'Hebdo',
  monthly: 'Mensuel',
}

const CAL_THEME = {
  backgroundColor:           '#FFFFFF',
  calendarBackground:        '#FFFFFF',
  textSectionTitleColor:     '#A0A0B8',
  selectedDayBackgroundColor:'#6C47FF',
  selectedDayTextColor:      '#FFFFFF',
  todayTextColor:            '#6C47FF',
  dayTextColor:              '#0D0D1A',
  textDisabledColor:         '#DDDDE8',
  arrowColor:                '#6C47FF',
  monthTextColor:            '#0D0D1A',
  textMonthFontWeight:       '800' as any,
  textDayFontWeight:         '600' as any,
  textDayHeaderFontWeight:   '700' as any,
}

const CAL_STYLE = {
  borderRadius: 20,
  overflow:     'hidden' as const,
  borderWidth:  0.5,
  borderColor:  '#DDDDE8',
  marginBottom: 16,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const localDate = (s: string) => new Date(s + 'T00:00:00')

function dateHeader(dateStr: string): string {
  const today    = todayISO()
  const tomorrow = addDays(localDate(today), 1).toISOString().slice(0, 10)
  if (dateStr === today)    return "Aujourd'hui"
  if (dateStr === tomorrow) return 'Demain'
  return format(localDate(dateStr), 'EEEE d MMMM', { locale: fr })
}

function sortTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time)
    if (a.time)  return -1
    if (b.time)  return  1
    const order = { high: 0, medium: 1, low: 2 } as const
    return order[a.priority] - order[b.priority]
  })
}

// ─── TaskItem ─────────────────────────────────────────────────────────────────

interface TaskItemProps {
  task:          Task
  onToggle:      () => void
  onToggleMIT?:  () => void
}

function TaskItem({ task, onToggle, onToggleMIT }: TaskItemProps) {
  const p = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
      <View style={[st.taskCard, { borderLeftColor: p.border }]}>
        {/* Ligne principale */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Check */}
          <View style={{
            width: 24, height: 24, borderRadius: 99,
            backgroundColor: task.completed ? '#6C47FF' : 'transparent',
            borderWidth: task.completed ? 0 : 2, borderColor: '#DDDDE8',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {task.completed && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
          </View>

          {/* Titre */}
          <Text style={{
            flex: 1, fontSize: 14, fontWeight: '600',
            color: task.completed ? '#A0A0B8' : '#0D0D1A',
            textDecorationLine: task.completed ? 'line-through' : 'none',
          }}>
            {task.title}
          </Text>

          {/* Badge priorité */}
          <View style={{ backgroundColor: p.bg, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: p.text }}>{p.label}</Text>
          </View>

          {/* Bouton MIT */}
          {onToggleMIT && (
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onToggleMIT() }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 18, opacity: task.isMIT ? 1 : 0.25 }}>⭐</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ligne secondaire : heure + récurrence */}
        {(task.time || task.recurrence !== 'none' || !!task.parentId) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 34 }}>
            {task.time && (
              <Text style={{ fontSize: 11, color: '#6C47FF', fontWeight: '600' }}>🕐 {task.time}</Text>
            )}
            {(task.recurrence !== 'none' || !!task.parentId) && (
              <Text style={{ fontSize: 11, color: '#A0A0B8' }}>
                {task.recurrence !== 'none'
                  ? `🔁 ${RECURRENCE_LABELS[task.recurrence]}`
                  : '🔁'}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type TabKey = 'today' | 'all' | 'calendar'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'today',    label: "Aujourd'hui" },
  { key: 'all',      label: 'Toutes'      },
  { key: 'calendar', label: '📅 Agenda'   },
]

const INITIAL_FORM = {
  title:      '',
  priority:   'medium' as Priority,
  recurrence: 'none'   as Recurrence,
  date:       todayISO(),
  time:       '',
}

export default function TasksScreen() {
  const { tasks, load, addTask, toggleTask, deleteTask, updateTask } = useTasksStore()

  const [tab,          setTab]          = useState<TabKey>('today')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [showSheet,    setShowSheet]    = useState(false)
  const [form,         setForm]         = useState(INITIAL_FORM)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useFocusEffect(useCallback(() => { load() }, []))

  const today    = todayISO()
  const tomorrow = addDays(localDate(today), 1).toISOString().slice(0, 10)

  // ── Données ─────────────────────────────────────────────────────────────────

  const todayTasks = useMemo(
    () => sortTasks(tasks.filter(t => t.date === today)),
    [tasks, today]
  )

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    tasks.forEach(t => {
      if (!groups[t.date]) groups[t.date] = []
      groups[t.date].push(t)
    })
    return Object.entries(groups)
      .map(([date, list]) => ({ date, tasks: sortTasks(list), isPast: date < today }))
      .sort((a, b) => {
        // Present/future first, past last
        if (a.isPast !== b.isPast) return a.isPast ? 1 : -1
        return a.date.localeCompare(b.date)
      })
  }, [tasks, today])

  const calendarTasks = useMemo(
    () => sortTasks(tasks.filter(t => t.date === selectedDate)),
    [tasks, selectedDate]
  )

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {}
    tasks.forEach(t => {
      const color =
        t.priority === 'high'   ? '#FF5C5C' :
        t.priority === 'medium' ? '#FF9500' : '#6C47FF'
      if (!marks[t.date]) {
        marks[t.date] = { dots: [], selected: t.date === selectedDate }
      }
      if (marks[t.date].dots.length < 3) {
        marks[t.date].dots.push({ key: t.id, color, selectedColor: color })
      }
    })
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] ?? {}),
        selected:      true,
        selectedColor: '#6C47FF',
      }
    }
    return marks
  }, [tasks, selectedDate])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleAdd = () => {
    const title = form.title.trim()
    if (!title) return
    addTask(title, form.priority, form.recurrence, form.date, form.time || undefined)
    setForm(INITIAL_FORM)
    setShowDatePicker(false)
    setShowSheet(false)
    Keyboard.dismiss()
  }

  const handleCancel = () => {
    setForm(INITIAL_FORM)
    setShowDatePicker(false)
    setShowSheet(false)
    Keyboard.dismiss()
  }

  const handleDeleteTask = (task: Task) => {
    if (task.recurrence !== 'none' || task.parentId) {
      Alert.alert(
        'Supprimer la tâche',
        'Supprimer uniquement cette occurrence ou toutes ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Juste celle-ci', onPress: () => deleteTask(task.id, false) },
          { text: 'Toutes', style: 'destructive', onPress: () => deleteTask(task.id, true) },
        ]
      )
    } else {
      deleteTask(task.id)
    }
  }

  const handleToggleMIT = (task: Task) => {
    if (!task.isMIT) {
      const activeMITs = tasks.filter(t => t.isMIT && t.date === today && !t.completed)
      if (activeMITs.length >= 3) {
        Alert.alert('Limite atteinte', "Tu as déjà 3 priorités. Retire-en une d'abord.")
        return
      }
    }
    TasksDB.toggleMIT(task.id)
    load()
  }

  const handlePostpone = (task: Task) => {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    updateTask(task.id, { date: tomorrow })
  }

  const formDateLabel = () => {
    if (form.date === today)    return "Aujourd'hui"
    if (form.date === tomorrow) return 'Demain'
    return format(localDate(form.date), 'EEE d MMM', { locale: fr })
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderTask = (task: Task) => (
    <SwipeableRow
      key={task.id}
      leftActions={[
        {
          label: 'Reporter',
          emoji: '📅',
          color: '#FF9500',
          onPress: () => handlePostpone(task),
        },
      ]}
      rightActions={[
        {
          label: 'Supprimer',
          emoji: '🗑️',
          color: '#FF5C5C',
          onPress: () => handleDeleteTask(task),
        },
      ]}
    >
      <TaskItem task={task} onToggle={() => toggleTask(task.id)} onToggleMIT={() => handleToggleMIT(task)} />
    </SwipeableRow>
  )

  const emptyMsg = (msg: string) => (
    <Text style={st.empty}>{msg}</Text>
  )

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={st.header}>
            <Text style={st.headerTitle}>Tâches</Text>
            <TouchableOpacity style={st.addBtn} onPress={() => setShowSheet(true)} activeOpacity={0.85}>
              <Text style={st.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* ── Onglets ─────────────────────────────────────────────────── */}
          <View style={st.tabs}>
            {TABS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[st.tabPill, tab === key && st.tabPillActive]}
                onPress={() => setTab(key)}
                activeOpacity={0.8}
              >
                <Text style={[st.tabText, tab === key && st.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ══════════════════════════════════════════════════════════════
              VUE AUJOURD'HUI
          ══════════════════════════════════════════════════════════════ */}
          {tab === 'today' && (
            todayTasks.length === 0
              ? emptyMsg("Aucune tâche aujourd'hui 🎉")
              : todayTasks.map(renderTask)
          )}

          {/* ══════════════════════════════════════════════════════════════
              VUE TOUTES
          ══════════════════════════════════════════════════════════════ */}
          {tab === 'all' && (
            tasks.length === 0
              ? emptyMsg('Aucune tâche 🎉')
              : groupedTasks.map(({ date, tasks: grp, isPast }) => (
                  <View key={date} style={isPast ? { opacity: 0.5 } : undefined}>
                    <Text style={st.groupHeader}>{dateHeader(date)}</Text>
                    {grp.map(renderTask)}
                  </View>
                ))
          )}

          {/* ══════════════════════════════════════════════════════════════
              VUE CALENDRIER
          ══════════════════════════════════════════════════════════════ */}
          {tab === 'calendar' && (
            <>
              <Calendar
                theme={CAL_THEME}
                style={CAL_STYLE}
                markedDates={markedDates}
                markingType="multi-dot"
                onDayPress={day => setSelectedDate(day.dateString)}
              />

              <Text style={st.calDateLabel}>{dateHeader(selectedDate)}</Text>

              {calendarTasks.length === 0
                ? emptyMsg('Aucune tâche ce jour')
                : calendarTasks.map(renderTask)
              }
            </>
          )}
        </ScrollView>

        {/* ══════════════════════════════════════════════════════════════════
            BOTTOM SHEET NOUVELLE TÂCHE
        ══════════════════════════════════════════════════════════════════ */}
        {showSheet && (
          <>
            <Pressable style={st.overlay} onPress={handleCancel} />
            <View style={st.sheet}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={st.sheetTitle}>Nouvelle tâche</Text>

                {/* Titre */}
                <TextInput
                  style={st.input}
                  placeholder="Titre de la tâche…"
                  placeholderTextColor="#A0A0B8"
                  value={form.title}
                  onChangeText={v => setForm(f => ({ ...f, title: v }))}
                  autoFocus
                  returnKeyType="done"
                  selectionColor="#6C47FF"
                />

                {/* Sélecteur date */}
                <Text style={st.fieldLabel}>Date</Text>
                <View style={st.shortcutRow}>
                  {[
                    { label: "Aujourd'hui", val: today },
                    { label: 'Demain',      val: tomorrow },
                  ].map(({ label, val }) => (
                    <TouchableOpacity
                      key={val}
                      style={[st.shortcutPill, form.date === val && !showDatePicker && st.shortcutActive]}
                      onPress={() => { setForm(f => ({ ...f, date: val })); setShowDatePicker(false) }}
                      activeOpacity={0.8}
                    >
                      <Text style={[st.shortcutText, form.date === val && !showDatePicker && st.shortcutTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[st.shortcutPill, showDatePicker && st.shortcutActive]}
                    onPress={() => setShowDatePicker(v => !v)}
                    activeOpacity={0.8}
                  >
                    <Text style={[st.shortcutText, showDatePicker && st.shortcutTextActive]}>
                      {showDatePicker || (form.date !== today && form.date !== tomorrow)
                        ? formDateLabel() : 'Choisir'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Calendrier inline */}
                {showDatePicker && (
                  <Calendar
                    theme={CAL_THEME}
                    style={{ ...CAL_STYLE, marginBottom: 12 }}
                    markedDates={{ [form.date]: { selected: true, selectedColor: '#6C47FF' } }}
                    onDayPress={day => { setForm(f => ({ ...f, date: day.dateString })); setShowDatePicker(false) }}
                  />
                )}

                {/* Heure */}
                <Text style={st.fieldLabel}>Heure (optionnel)</Text>
                <TextInput
                  style={st.input}
                  placeholder="ex : 14:30"
                  placeholderTextColor="#A0A0B8"
                  value={form.time}
                  onChangeText={v => setForm(f => ({ ...f, time: v }))}
                  keyboardType="numbers-and-punctuation"
                  selectionColor="#6C47FF"
                />

                {/* Priorité */}
                <Text style={st.fieldLabel}>Priorité</Text>
                <View style={st.pillRow}>
                  {(['low', 'medium', 'high'] as Priority[]).map(p => {
                    const cfg = PRIORITY_CFG[p]; const active = form.priority === p
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[st.pill, { backgroundColor: active ? cfg.bg : '#EEEEF5' }]}
                        onPress={() => setForm(f => ({ ...f, priority: p }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[st.pillText, { color: active ? cfg.text : '#6B6B85', fontWeight: active ? '700' : '500' }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Récurrence */}
                <Text style={st.fieldLabel}>Récurrence</Text>
                <View style={[st.pillRow, { flexWrap: 'wrap' }]}>
                  {(['none', 'daily', 'weekly', 'monthly'] as Recurrence[]).map(r => {
                    const active = form.recurrence === r
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[st.pill, { backgroundColor: active ? '#6C47FF1F' : '#EEEEF5', minWidth: 70 }]}
                        onPress={() => setForm(f => ({ ...f, recurrence: r }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[st.pillText, { color: active ? '#4422CC' : '#6B6B85', fontWeight: active ? '700' : '500' }]}>
                          {RECURRENCE_LABELS[r]}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Bouton ajouter */}
                <TouchableOpacity
                  style={[st.confirmBtn, !form.title.trim() && { opacity: 0.45 }]}
                  onPress={handleAdd}
                  disabled={!form.title.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={st.confirmBtnText}>Ajouter</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCancel} style={{ alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, marginBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#0D0D1A', letterSpacing: -0.5 },
  addBtn:    { width: 40, height: 40, borderRadius: 99, backgroundColor: '#6C47FF', alignItems: 'center', justifyContent: 'center' },
  addBtnText:{ color: '#fff', fontSize: 24, lineHeight: 26, fontWeight: '400' },

  tabs:         { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabPill:      { borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EEEEF5' },
  tabPillActive:{ backgroundColor: '#6C47FF' },
  tabText:      { fontSize: 13, fontWeight: '500', color: '#6B6B85' },
  tabTextActive:{ color: '#fff', fontWeight: '700' },

  empty:      { textAlign: 'center', color: '#A0A0B8', fontSize: 14, marginTop: 40 },
  groupHeader:{ fontSize: 12, fontWeight: '700', color: '#6B6B85', textTransform: 'capitalize', marginTop: 16, marginBottom: 6 },
  calDateLabel:{ fontSize: 14, fontWeight: '700', color: '#0D0D1A', marginBottom: 10, textTransform: 'capitalize' },

  taskCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#6C47FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,13,26,0.35)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 36, maxHeight: '92%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0D0D1A', textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: '#F7F7FA', borderRadius: 14, padding: 14,
    fontSize: 15, color: '#0D0D1A', marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#A0A0B8',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8,
  },
  shortcutRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  shortcutPill:       { borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#EEEEF5' },
  shortcutActive:     { backgroundColor: '#6C47FF1F', borderWidth: 1.5, borderColor: '#6C47FF' },
  shortcutText:       { fontSize: 13, fontWeight: '500', color: '#6B6B85' },
  shortcutTextActive: { color: '#4422CC', fontWeight: '700' },

  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill:    { flex: 1, borderRadius: 99, paddingVertical: 10, alignItems: 'center' },
  pillText:{ fontSize: 12 },

  confirmBtn: {
    backgroundColor: '#6C47FF', borderRadius: 14, padding: 15,
    alignItems: 'center', marginTop: 4, marginBottom: 4,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
