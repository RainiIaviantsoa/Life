import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, Animated, Dimensions,
  ScrollView, TextInput, StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BudgetsDB, HabitsDB, generateId, monthISO } from '@/database'

const { width } = Dimensions.get('window')

const SUGGESTED_HABITS = [
  { name: 'Sport',        emoji: '🏋️', description: 'Bouger chaque jour' },
  { name: 'Lecture',      emoji: '📚', description: 'Lire 20 min minimum' },
  { name: 'Méditation',   emoji: '🧘', description: 'Calme et focus' },
  { name: 'Hydratation',  emoji: '💧', description: "Boire 2L d'eau" },
  { name: 'Pas de sucre', emoji: '🚫', description: 'Manger sain' },
  { name: 'Réveil tôt',   emoji: '🌅', description: 'Se lever à 6h' },
  { name: 'Marche',       emoji: '🚶', description: '10 000 pas par jour' },
  { name: 'Journal',      emoji: '✍️',  description: 'Écrire ses pensées' },
]

// ─── Progress dots ────────────────────────────────────────────────────────────

function Dots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={{
            width: step === i ? 24 : 8,
            height: 8,
            borderRadius: 99,
            backgroundColor: step === i ? '#00BFA6' : '#C5D5DC',
          }}
        />
      ))}
    </View>
  )
}

// ─── Screen 0 — Welcome ───────────────────────────────────────────────────────

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{
        width: 120, height: 120, borderRadius: 40,
        backgroundColor: '#00BFA6', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        shadowColor: '#00BFA6', shadowOpacity: 0.4, shadowRadius: 24, elevation: 12,
      }}>
        <Text style={{ fontSize: 56 }}>⚡</Text>
      </View>

      <Text style={{ fontSize: 36, fontWeight: '900', color: '#264653', textAlign: 'center', letterSpacing: -1, marginBottom: 16 }}>
        Bienvenue dans{'\n'}Life
      </Text>

      <Text style={{ fontSize: 16, color: '#4A7080', textAlign: 'center', lineHeight: 24, marginBottom: 48 }}>
        Ton app personnelle pour organiser{'\n'}ta vie, ton sport et ton argent.
      </Text>

      {[
        { emoji: '✅', label: 'Tâches & habitudes quotidiennes' },
        { emoji: '💪', label: 'Suivi sport & entraînements' },
        { emoji: '💰', label: 'Budget & finances personnelles' },
      ].map((f, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14,
          width: '100%', marginBottom: 8,
        }}>
          <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#264653' }}>{f.label}</Text>
        </View>
      ))}

      <TouchableOpacity
        onPress={onNext}
        style={{
          backgroundColor: '#00BFA6', borderRadius: 16,
          padding: 18, width: '100%', alignItems: 'center', marginTop: 32,
          shadowColor: '#00BFA6', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Commencer 🚀</Text>
      </TouchableOpacity>

      <Dots step={0} />
    </View>
  )
}

// ─── Screen 1 — Budget ────────────────────────────────────────────────────────

function BudgetScreen({ onNext }: { onNext: () => void }) {
  const [budget, setBudget] = useState('')

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 32 }}>
      <View style={{ marginTop: 60, marginBottom: 40 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF7B54', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
          Étape 1 sur 2
        </Text>
        <Text style={{ fontSize: 30, fontWeight: '900', color: '#264653', letterSpacing: -0.5 }}>
          Quel est ton{'\n'}budget mensuel ? 💰
        </Text>
        <Text style={{ fontSize: 15, color: '#4A7080', marginTop: 12, lineHeight: 22 }}>
          On va t'aider à suivre tes dépenses et rester dans les clous.
        </Text>
      </View>

      <View style={{
        backgroundColor: '#FFF8F0', borderRadius: 20, padding: 24,
        alignItems: 'center', marginBottom: 16,
        borderWidth: 2, borderColor: budget ? '#FF7B54' : '#E0EDF2',
      }}>
        <Text style={{ fontSize: 14, color: '#7A9AAB', fontWeight: '600', marginBottom: 8 }}>
          Budget par mois
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            placeholder="0"
            keyboardType="numeric"
            style={{ fontSize: 48, fontWeight: '900', color: '#264653', minWidth: 80, textAlign: 'center' }}
            placeholderTextColor="#C5D5DC"
          />
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#7A9AAB' }}>€</Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A9AAB', marginBottom: 10 }}>
        SUGGESTIONS RAPIDES
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
        {['500', '800', '1000', '1500', '2000'].map(amount => (
          <TouchableOpacity
            key={amount}
            onPress={() => setBudget(amount)}
            style={{
              backgroundColor: budget === amount ? '#FF7B54' : '#E0EDF2',
              borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: budget === amount ? '#fff' : '#4A7080' }}>
              {amount}€
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <Dots step={1} />

      <TouchableOpacity
        onPress={() => {
          if (budget && parseFloat(budget) > 0) {
            BudgetsDB.upsert(monthISO(), parseFloat(budget))
          }
          onNext()
        }}
        style={{
          backgroundColor: budget ? '#FF7B54' : '#E0EDF2',
          borderRadius: 16, padding: 18, alignItems: 'center',
        }}
      >
        <Text style={{ color: budget ? '#fff' : '#7A9AAB', fontSize: 16, fontWeight: '800' }}>
          {budget ? `Continuer avec ${budget}€ →` : 'Passer cette étape →'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Screen 2 — Habits ────────────────────────────────────────────────────────

function HabitsScreen({ onFinish }: { onFinish: (selected: string[]) => void }) {
  const [selectedHabits, setSelectedHabits] = useState<string[]>([])

  const toggle = (name: string) => {
    setSelectedHabits(s =>
      s.includes(name) ? s.filter(h => h !== name) : [...s, name]
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ padding: 32, paddingBottom: 48 }}>
      <View style={{ marginTop: 60, marginBottom: 32 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#2DC653', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
          Étape 2 sur 2
        </Text>
        <Text style={{ fontSize: 30, fontWeight: '900', color: '#264653', letterSpacing: -0.5 }}>
          Tes habitudes{'\n'}quotidiennes ⚡
        </Text>
        <Text style={{ fontSize: 15, color: '#4A7080', marginTop: 12, lineHeight: 22 }}>
          Choisis celles que tu veux construire. Tu pourras en ajouter plus tard.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
        {SUGGESTED_HABITS.map(habit => {
          const selected = selectedHabits.includes(habit.name)
          return (
            <TouchableOpacity
              key={habit.name}
              onPress={() => toggle(habit.name)}
              style={{
                width: (width - 74) / 2,
                backgroundColor: selected ? '#2DC653' : '#FFF8F0',
                borderRadius: 18, padding: 16,
                borderWidth: 2,
                borderColor: selected ? '#2DC653' : '#E0EDF2',
                shadowColor: selected ? '#2DC653' : 'transparent',
                shadowOpacity: 0.2, shadowRadius: 8, elevation: selected ? 4 : 0,
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{habit.emoji}</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: selected ? '#fff' : '#264653' }}>
                {habit.name}
              </Text>
              <Text style={{ fontSize: 11, color: selected ? 'rgba(255,255,255,0.8)' : '#7A9AAB', marginTop: 2 }}>
                {habit.description}
              </Text>
              {selected && (
                <View style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 99, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#2DC653', fontWeight: '900' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <Dots step={2} />

      <TouchableOpacity
        onPress={() => onFinish(selectedHabits)}
        style={{
          backgroundColor: selectedHabits.length > 0 ? '#2DC653' : '#E0EDF2',
          borderRadius: 16, padding: 18, alignItems: 'center',
          shadowColor: '#2DC653',
          shadowOpacity: selectedHabits.length > 0 ? 0.3 : 0,
          shadowRadius: 12, elevation: selectedHabits.length > 0 ? 6 : 0,
        }}
      >
        <Text style={{ color: selectedHabits.length > 0 ? '#fff' : '#7A9AAB', fontSize: 16, fontWeight: '800' }}>
          {selectedHabits.length > 0
            ? `C'est parti avec ${selectedHabits.length} habitude${selectedHabits.length > 1 ? 's' : ''} ! 🔥`
            : 'Passer et commencer →'
          }
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const slideAnim = useRef(new Animated.Value(0)).current

  const goNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -width, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: width,  duration: 0,   useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,      duration: 250, useNativeDriver: true }),
    ]).start()
    setStep(s => s + 1)
  }

  const finish = async (selectedHabits: string[]) => {
    selectedHabits.forEach(name => {
      const habit = SUGGESTED_HABITS.find(h => h.name === name)
      if (habit) {
        HabitsDB.insert({
          id:        generateId(),
          name:      habit.name,
          emoji:     habit.emoji,
          streak:    0,
          createdAt: new Date().toISOString(),
        })
      }
    })

    await AsyncStorage.setItem('onboarded', 'true')
    router.replace('/(tabs)/dashboard')
  }

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
      {step === 0 && <WelcomeScreen onNext={goNext} />}
      {step === 1 && <BudgetScreen  onNext={goNext} />}
      {step === 2 && <HabitsScreen  onFinish={finish} />}
    </Animated.View>
  )
}
