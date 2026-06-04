import { Text } from 'react-native'
import { Colors } from '@/constants/theme'

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.textMuted, marginTop: 20, marginBottom: 8 }}>
      {children}
    </Text>
  )
}
