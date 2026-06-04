import { View, Text } from 'react-native'
import { Colors } from '@/constants/theme'

export function StatCard({ value, label, color }: { value: string, label: string, color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: Colors.text }}>{value}</Text>
      <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: color, marginTop: 5, marginBottom: 4 }} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textMuted }}>{label}</Text>
    </View>
  )
}
