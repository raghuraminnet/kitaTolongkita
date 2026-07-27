import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, borderRadius, spacing } from '../theme';

interface CategoryChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors['surface-container'],
    borderWidth: 1,
    borderColor: colors['outline-variant'],
  },
  chipSelected: {
    backgroundColor: colors['primary-container'],
    borderColor: colors['primary-container'],
  },
  label: {
    ...typography['label-sm'],
    color: colors['on-surface'],
    fontWeight: '500',
  },
  labelSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});
