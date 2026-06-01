import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Colors } from '@/constants/theme'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: Colors.bg0,
        borderTopWidth: 0.5,
        borderTopColor: Colors.border,
        paddingTop: 6,
        paddingBottom: 8,
      },
      tabBarActiveTintColor: Colors.violet,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text> }}/>
      <Tabs.Screen name="tasks"     options={{ title: 'Tasks', tabBarIcon: () => <Text style={{ fontSize: 20 }}>✅</Text> }}/>
      <Tabs.Screen name="workout"   options={{ title: 'Workout', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💪</Text> }}/>
      <Tabs.Screen name="finance"   options={{ title: 'Finance', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💰</Text> }}/>
      <Tabs.Screen name="habits"    options={{ title: 'Habits', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚡</Text> }}/>
    </Tabs>
  )
}
