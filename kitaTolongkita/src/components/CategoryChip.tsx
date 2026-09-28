import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, View } from 'react-native';
import { typography, borderRadius, spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface CategoryChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const CATEGORY_ICONS: Record<string, string> = {
  All: '✨',
  Food: '🍜',
  Makan: '🍜',
  Electronics: '📱',
  Fashion: '👗',
  Home: '🏠',
  Household: '🏠',
  Beauty: '🧴',
  Sports: '⚽',
  Drinks: '🧋',
  Groceries: '🥦',
  'Fresh Produce': '🥦',
  Services: '🛠️',
};

export const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const icon = CATEGORY_ICONS[label] || '🏷️';

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? colors['primary-container']
            : isDark
            ? colors['surface-container']
            : colors.white,
          borderColor: selected
            ? colors['primary-container']
            : isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.07)',
          shadowColor: selected ? colors['primary-container'] : '#0F172A',
          shadowOpacity: selected ? 0.25 : 0.04,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text
        style={[
          styles.label,
          {
            color: selected ? colors.white : colors['on-surface'],
            fontWeight: selected ? '700' : '600',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    ...typography['label-sm'],
    fontSize: 13,
  },
});
