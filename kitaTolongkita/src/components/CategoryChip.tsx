import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  Sparkles,
  UtensilsCrossed,
  Smartphone,
  Shirt,
  Home,
  Coffee,
  ShoppingBag,
  Activity,
  Wrench,
  Tag,
  Sparkle,
} from 'lucide-react-native';
import { typography, borderRadius, spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface CategoryChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
  All: Sparkles,
  Food: UtensilsCrossed,
  Makan: UtensilsCrossed,
  Electronics: Smartphone,
  Fashion: Shirt,
  Home: Home,
  Household: Home,
  Beauty: Sparkle,
  Sports: Activity,
  Drinks: Coffee,
  Groceries: ShoppingBag,
  'Fresh Produce': ShoppingBag,
  Services: Wrench,
};

export const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const IconComp = CATEGORY_ICON_MAP[label] || Tag;
  const iconColor = selected ? colors.white : colors['primary-container'];

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
      <View style={{ marginRight: 6 }}>
        <IconComp size={15} color={iconColor} strokeWidth={2.4} />
      </View>
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
  label: {
    ...typography['label-sm'],
    fontSize: 13,
  },
});

