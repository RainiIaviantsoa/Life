import { View, Text } from 'react-native'
import { Colors, Radius, Shadow } from '@/constants/theme'
export function StatCard({ value, label, color }: { value: string, label: string, color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg0, borderRadius: Radius.md, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.border, ...Shadow.card }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color: Colors.textSub, marginTop: 2 }}>{label}</Text>
    </View>
  )
}
