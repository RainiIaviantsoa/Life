import { Tabs } from 'expo-router'
import { Colors } from '@/constants/theme'
import { Home, CheckSquare, Dumbbell, Wallet, Zap } from 'lucide-react-native'

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
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home',    tabBarActiveTintColor: '#00BFA6', tabBarIcon: ({ color, size }) => <Home        size={size} color={color} strokeWidth={2} /> }}/>
      <Tabs.Screen name="tasks"     options={{ title: 'Tasks',   tabBarActiveTintColor: '#FF7B54', tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} strokeWidth={2} /> }}/>
      <Tabs.Screen name="workout"   options={{ title: 'Workout', tabBarActiveTintColor: '#FF9F1C', tabBarIcon: ({ color, size }) => <Dumbbell    size={size} color={color} strokeWidth={2} /> }}/>
      <Tabs.Screen name="finance"   options={{ title: 'Finance', tabBarActiveTintColor: '#0ABDE3', tabBarIcon: ({ color, size }) => <Wallet      size={size} color={color} strokeWidth={2} /> }}/>
      <Tabs.Screen name="habits"    options={{ title: 'Habits',  tabBarActiveTintColor: '#2DC653', tabBarIcon: ({ color, size }) => <Zap         size={size} color={color} strokeWidth={2} /> }}/>
    </Tabs>
  )
}
