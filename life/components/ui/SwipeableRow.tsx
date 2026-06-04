import { Animated, View, TouchableOpacity, Text } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { useRef } from 'react'

interface SwipeAction {
  label: string
  emoji: string
  color: string
  onPress: () => void
}

interface Props {
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  children: React.ReactNode
}

export function SwipeableRow({ leftActions, rightActions, children }: Props) {
  const swipeableRef = useRef<Swipeable>(null)

  const close = () => swipeableRef.current?.close()

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => {
    if (!leftActions?.length) return null
    return (
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {leftActions.map((action, i) => {
          const trans = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-80 * (leftActions.length - i), 0],
          })
          return (
            <Animated.View key={`l${i}`} style={{ transform: [{ translateX: trans }] }}>
              <TouchableOpacity
                onPress={() => { action.onPress(); close() }}
                style={{
                  backgroundColor: action.color,
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 72,
                  height: '100%',
                  borderRadius: 20,
                  marginRight: 4,
                }}
              >
                <Text style={{ fontSize: 20 }}>{action.emoji}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 }}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>
    )
  }

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    if (!rightActions?.length) return null
    return (
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {rightActions.map((action, i) => {
          const trans = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [80 * (i + 1), 0],
          })
          return (
            <Animated.View key={`r${i}`} style={{ transform: [{ translateX: trans }] }}>
              <TouchableOpacity
                onPress={() => { action.onPress(); close() }}
                style={{
                  backgroundColor: action.color,
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 72,
                  height: '100%',
                  borderRadius: 20,
                  marginLeft: 4,
                }}
              >
                <Text style={{ fontSize: 20 }}>{action.emoji}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 }}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>
    )
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  )
}
