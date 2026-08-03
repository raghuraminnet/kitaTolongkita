import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

interface EmptyStateProps {
  /** Primary message shown in bold */
  title: string;
  /** Secondary helper text */
  message?: string;
  /** Lucide-style SVG or emoji for illustration */
  icon?: string;
  /** Optional CTA button */
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = '📦',
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography['title-md'],
    color: colors['on-surface'],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    backgroundColor: colors['primary-container'],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  actionText: {
    ...typography['label-sm'],
    color: colors['on-primary-container'],
    fontWeight: '700',
  },
});
