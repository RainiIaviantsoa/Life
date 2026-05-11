import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius } from '@/constants/theme';

interface ProgressBarProps {
  /** 0–1 */
  progress:   number;
  color:      string;
  /** lighter end color — defaults to color + '99' (60% opacity on white) */
  colorLight?: string;
  height?:    number;
  style?:     ViewStyle;
  animated?:  boolean;
}

export function ProgressBar({
  progress,
  color,
  colorLight,
  height   = 8,
  style,
  animated = true,
}: ProgressBarProps) {
  const anim   = useRef(new Animated.Value(0)).current;
  const endCol = colorLight ?? color + 'BB'; // ~73% opacity on white

  useEffect(() => {
    const target = Math.min(1, Math.max(0, progress));
    if (animated) {
      Animated.spring(anim, {
        toValue:         target,
        useNativeDriver: false,
        damping:         22,
        stiffness:       160,
      }).start();
    } else {
      anim.setValue(target);
    }
  }, [progress, animated]);

  const width = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[st.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { width, overflow: 'hidden', borderRadius: height / 2 }]}>
        <LinearGradient
          colors={[color, endCol]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  track: {
    backgroundColor: Colors.bg3,
    overflow:        'hidden',
  },
});
