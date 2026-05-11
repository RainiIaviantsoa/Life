import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?:         string;
  hint?:          string;
  error?:         string;
  prefix?:        React.ReactNode;
  suffix?:        React.ReactNode;
  accentColor?:   string;       // border color on focus
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  accentColor = Colors.violet,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[st.wrapper, containerStyle]}>
      {label && <Text style={st.label}>{label}</Text>}

      <View style={[
        st.container,
        focused && { borderColor: accentColor, backgroundColor: Colors.bg1 },
        !!error && st.containerError,
      ]}>
        {prefix && <View style={st.adornment}>{prefix}</View>}

        <TextInput
          style={st.input}
          placeholderTextColor={Colors.textMuted}
          selectionColor={accentColor}
          onFocus={e => { setFocused(true);  onFocus?.(e); }}
          onBlur={e =>  { setFocused(false); onBlur?.(e);  }}
          {...props}
        />

        {suffix && <View style={st.adornment}>{suffix}</View>}
      </View>

      {(hint || error) && (
        <Text style={[st.hint, !!error && st.hintError]}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrapper:   { gap: Spacing.xs },
  label: {
    fontSize:   FontSize.sm,
    fontWeight: '600',
    color:      Colors.textSub,
    marginBottom: 2,
  },
  container: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bg2,
    borderRadius:    Radius.md,
    borderWidth:     1.5,
    borderColor:     Colors.border,
    minHeight:       50,
    paddingHorizontal: Spacing.md,
  },
  containerError: { borderColor: Colors.coral },
  input: {
    flex:            1,
    fontSize:        FontSize.md,
    color:           Colors.text,
    paddingVertical: Spacing.sm,
  },
  adornment: { marginHorizontal: Spacing.xs },
  hint:      { fontSize: FontSize.xs, color: Colors.textMuted },
  hintError: { color: Colors.coral },
});
