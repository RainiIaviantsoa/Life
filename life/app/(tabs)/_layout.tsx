import { Tabs } from 'expo-router'
import { Colors } from '@/constants/theme'
import { Home, CheckSquare, Dumbbell, Wallet, Zap } from 'lucide-react-native'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: Colors.bg0,
        borderTopWidth: 0,
        paddingTop: 6,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 10,
      },
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home',    tabBarActiveTintColor: '#00BFA6', tabBarIcon: ({ color, size, focused }) => <Home        size={focused ? size + 4 : size} color={color} strokeWidth={focused ? 2.5 : 2} /> }}/>
      <Tabs.Screen name="tasks"     options={{ title: 'Tasks',   tabBarActiveTintColor: '#FF7B54', tabBarIcon: ({ color, size, focused }) => <CheckSquare size={focused ? size + 4 : size} color={color} strokeWidth={focused ? 2.5 : 2} /> }}/>
      <Tabs.Screen name="workout"   options={{ title: 'Workout', tabBarActiveTintColor: '#FF9F1C', tabBarIcon: ({ color, size, focused }) => <Dumbbell    size={focused ? size + 4 : size} color={color} strokeWidth={focused ? 2.5 : 2} /> }}/>
      <Tabs.Screen name="finance"   options={{ title: 'Finance', tabBarActiveTintColor: '#0ABDE3', tabBarIcon: ({ color, size, focused }) => <Wallet      size={focused ? size + 4 : size} color={color} strokeWidth={focused ? 2.5 : 2} /> }}/>
      <Tabs.Screen name="habits"    options={{ title: 'Habits',  tabBarActiveTintColor: '#2DC653', tabBarIcon: ({ color, size, focused }) => <Zap         size={focused ? size + 4 : size} color={color} strokeWidth={focused ? 2.5 : 2} /> }}/>
    </Tabs>
  )
}
