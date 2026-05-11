import { View, ViewProps } from 'react-native'
import { Colors, Radius, Shadow } from '@/constants/theme'

interface Props extends ViewProps { accent?: 'violet'|'coral'|'green'|'amber'|'blue'|'pink' }

export function Card({ accent, style, children, ...props }: Props) {
  const accentColor = accent ? Colors[accent] : undefined
  return (
    <View style={[{
      backgroundColor: Colors.bg0,
      borderRadius: Radius.lg,
      padding: 16,
      marginBottom: 10,
      borderWidth: 0.5,
      borderColor: Colors.border,
      borderLeftWidth: accent ? 4 : 0.5,
      borderLeftColor: accentColor ?? Colors.border,
      ...Shadow.card,
    }, style]} {...props}>
      {children}
    </View>
  )
}
