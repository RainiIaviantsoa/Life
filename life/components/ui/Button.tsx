import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label?:        string;
  onPress:       () => void;
  variant?:      ButtonVariant;
  size?:         ButtonSize;
  color?:        string;      // override accent for outline/ghost/icon
  icon?:         React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?:      boolean;
  disabled?:     boolean;
  fullWidth?:    boolean;
  style?:        ViewStyle;
}

export function Button({
  label,
  onPress,
  variant  = 'primary',
  size     = 'md',
  color    = Colors.violet,
  icon,
  iconPosition = 'left',
  loading  = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // ── icon-only circle variant ──────────────────────────────────────────────
  if (variant === 'icon') {
    const dim = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
    return (
      <TouchableOpacity
        style={[
          {
            width: dim, height: dim, borderRadius: dim / 2,
            backgroundColor: color + '20',
            alignItems: 'center', justifyContent: 'center',
          },
          isDisabled && { opacity: 0.4 },
          style,
        ]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.75}
      >
        {loading
          ? <ActivityIndicator size="small" color={color} />
          : icon}
      </TouchableOpacity>
    );
  }

  // ── text button variants ───────────────────────────────────────────────────
  const containerStyle = [
    st.base,
    variantContainer(variant, color),
    sizeStyle[size],
    fullWidth && st.full,
    isDisabled && st.disabled,
    style,
  ];

  const textColor = resolveTextColor(variant, color);

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={st.inner}>
          {icon && iconPosition === 'left' && <View style={st.iconL}>{icon}</View>}
          {label && (
            <Text style={[st.label, sizeLabel[size], { color: textColor }]}>
              {label}
            </Text>
          )}
          {icon && iconPosition === 'right' && <View style={st.iconR}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function variantContainer(variant: ButtonVariant, color: string): ViewStyle {
  switch (variant) {
    case 'primary':   return { backgroundColor: color };
    case 'secondary': return { backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border };
    case 'outline':   return { backgroundColor: color + '18', borderWidth: 1.5, borderColor: color };
    case 'ghost':     return { backgroundColor: 'transparent' };
    case 'danger':    return { backgroundColor: Colors.coral + '18', borderWidth: 1.5, borderColor: Colors.coral };
    default:          return {};
  }
}

function resolveTextColor(variant: ButtonVariant, color: string): string {
  switch (variant) {
    case 'primary':   return '#FFFFFF';
    case 'secondary': return Colors.text;
    case 'outline':   return color;
    case 'ghost':     return color;
    case 'danger':    return Colors.coral;
    default:          return '#FFFFFF';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  base: {
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  iconL:    { marginRight: Spacing.sm },
  iconR:    { marginLeft:  Spacing.sm },
  full:     { width: '100%' },
  disabled: { opacity: 0.4 },
  label:    { letterSpacing: 0.2 },
});

const sizeStyle = StyleSheet.create({
  sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, minHeight: 34 },
  md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, minHeight: 46 },
  lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,     minHeight: 54 },
});

const sizeLabel = StyleSheet.create({
  sm: { fontSize: FontSize.sm, fontWeight: '600' },
  md: { fontSize: FontSize.md, fontWeight: '700'     as any },
  lg: { fontSize: FontSize.lg, fontWeight: '700'     as any },
});
