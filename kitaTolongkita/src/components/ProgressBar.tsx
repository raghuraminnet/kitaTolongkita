import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../theme';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showText?: boolean;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showText = true,
  height = 8,
}) => {
  const progress = Math.min((current / total) * 100, 100);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          {showText && (
            <Text style={styles.text}>
              {current} / {total}
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
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
    marginBottom: 6,
  },
  label: {
    ...typography['label-sm'],
    color: colors['on-surface'],
    fontWeight: '600',
  },
  text: {
    ...typography['label-sm'],
    color: colors['on-surface-variant'],
  },
  track: {
    backgroundColor: colors['surface-container-high'],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
  },
});
