import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  color?:       string;
  action?:      { label: string; onPress: () => void };
  style?:       ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  color   = Colors.violet,
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[st.container, style]}>
      {icon && (
        <View style={[st.iconWrap, { backgroundColor: color + '18' }]}>
          {icon}
        </View>
      )}

      <Text style={st.title}>{title}</Text>

      {description && <Text style={st.description}>{description}</Text>}

      {action && (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="outline"
          color={color}
          size="sm"
          style={st.action}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.xl,
    gap:               Spacing.md,
  },
  iconWrap: {
    width:           64,
    height:          64,
    borderRadius:    32,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.sm,
  },
  title: {
    fontSize:   FontSize.lg,
    fontWeight: '700',
    color:      Colors.text,
    textAlign:  'center',
  },
  description: {
    fontSize:   FontSize.sm,
    color:      Colors.textSub,
    textAlign:  'center',
    lineHeight: 20,
  },
  action: { marginTop: Spacing.sm },
});
