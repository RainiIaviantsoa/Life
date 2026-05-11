import { TouchableOpacity, Text } from 'react-native'
import { Colors, Radius } from '@/constants/theme'
export function PrimaryButton({ label, color = Colors.violet, onPress }: { label: string, color?: string, onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: color, borderRadius: Radius.md, padding: 15, alignItems: 'center', marginTop: 8 }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  )
}
