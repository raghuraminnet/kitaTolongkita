import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, borderRadius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showText?: boolean;
  height?: number;
  highlightColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showText = true,
  height = 7,
  highlightColor,
}) => {
  const { colors, isDark } = useTheme();
  const safeTotal = total > 0 ? total : 1;
  const progress = Math.min((current / safeTotal) * 100, 100);
  const isUnlocked = current >= safeTotal;
  const slotsLeft = Math.max(safeTotal - current, 0);

  // Gradient / theme color for fill
  const fillColor = highlightColor || (isUnlocked ? colors.secondary : colors['primary-container']);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.header}>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>{label}</Text>
          {showText && (
            <Text style={[styles.text, { color: colors['on-surface-variant'] }]}>
              {isUnlocked ? (
                <Text style={{ color: colors.secondary, fontWeight: '700' }}>✓ Goal Unlocked!</Text>
              ) : (
                `${current}/${total} joined (${slotsLeft} left)`
              )}
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors['surface-container-high'],
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${progress}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    ...typography['label-sm'],
    fontWeight: '700',
    fontSize: 12,
  },
  text: {
    ...typography['label-sm'],
    fontSize: 11.5,
    fontWeight: '600',
  },
  track: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
