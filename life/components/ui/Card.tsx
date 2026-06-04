import { View, ViewProps } from 'react-native'
import { Colors, Radius } from '@/constants/theme'

type Accent = 'violet'|'coral'|'green'|'amber'|'blue'|'pink'
interface Props extends ViewProps { accent?: Accent }

export function Card({ accent, style, children, ...props }: Props) {
  const color = accent ? Colors[accent] : undefined
  return (
    <View style={[{
      backgroundColor: Colors.bg0,
      borderRadius: Radius.lg,
      padding: 16,
      marginBottom: 10,
      borderLeftWidth: color ? 4 : 0,
      borderLeftColor: color,
      shadowColor: color ?? '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    }, style]} {...props}>
      {children}
    </View>
  )
}
