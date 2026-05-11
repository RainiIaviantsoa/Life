import { Text } from 'react-native'
import { Colors, FontSize } from '@/constants/theme'
export function SectionLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 }}>{children}</Text>
}
