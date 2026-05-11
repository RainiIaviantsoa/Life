import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const SCREEN_H        = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 80;

interface BottomSheetProps {
  visible:    boolean;
  onClose:    () => void;
  title?:     string;
  children:   React.ReactNode;
  snapHeight?: number | 'auto';
  style?:     ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  snapHeight = SCREEN_H * 0.5,
  style,
}: BottomSheetProps) {
  const translateY    = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0, duration: 320,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1, duration: 280, useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, overlayOpacity]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_H, duration: 260,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0, duration: 220, useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [translateY, overlayOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_H);
      overlayOpacity.setValue(0);
      open();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy > 0.8) {
          close();
        } else {
          Animated.spring(translateY, {
            toValue: 0, useNativeDriver: true, bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <View style={st.root}>
        <Animated.View style={[st.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            st.sheet,
            snapHeight !== 'auto' && { height: snapHeight },
            { transform: [{ translateY }] },
            style,
          ]}
          {...panResponder.panHandlers}
        >
          <View style={st.handle} />

          {title && (
            <View style={st.header}>
              <Text style={st.title}>{title}</Text>
            </View>
          )}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root:    { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,13,26,0.45)' },
  sheet: {
    backgroundColor:      Colors.bg0,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth:          1,
    borderBottomWidth:    0,
    borderColor:          Colors.border,
    paddingBottom:        Spacing.xl,
    paddingHorizontal:    Spacing.lg,
    ...(Shadow.card as object),
  },
  handle: {
    width: 36, height: 4, borderRadius: 999,
    backgroundColor: Colors.bg3,
    alignSelf: 'center',
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  header: {
    paddingVertical:    Spacing.md,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.border,
    marginBottom:       Spacing.md,
  },
  title: {
    fontSize:   FontSize.lg,
    fontWeight: '700',
    color:      Colors.text,
    textAlign:  'center',
  },
});
