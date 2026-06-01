import { View, Text } from 'react-native'

export function SplashScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#6C47FF', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 100, height: 100, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 48 }}>⚡</Text>
      </View>
      <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Life</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>Chargement...</Text>
    </View>
  )
}
