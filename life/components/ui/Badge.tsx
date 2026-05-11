import { View, Text } from 'react-native'
export function Badge({ label, color, bgColor }: { label: string, color: string, bgColor: string }) {
  return (
    <View style={{ backgroundColor: bgColor, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color }}>{label}</Text>
    </View>
  )
}
