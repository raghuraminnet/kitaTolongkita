import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

export type DeliveryStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready'
  | 'Delivered'
  | 'Collected';

interface Step {
  key: DeliveryStatus;
  label: string;
  sublabel?: string;
}

const STEPS: Step[] = [
  { key: 'Pending', label: 'Order Placed' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Preparing', label: 'Preparing' },
  { key: 'Ready', label: 'Ready for Pickup' },
  { key: 'Delivered', label: 'Delivered' },
];

const COLLECTED_STEPS: Step[] = [
  { key: 'Pending', label: 'Order Placed' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Preparing', label: 'Preparing' },
  { key: 'Ready', label: 'Ready for Pickup' },
  { key: 'Collected', label: 'Collected' },
];

interface OrderStatusStepperProps {
  /** Current status string from API */
  status: string;
  /** Whether the order was collected (vs delivered) */
  isCollected?: boolean;
  compact?: boolean;
}

const STATUS_ORDER: DeliveryStatus[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Delivered',
  'Collected',
];

export const OrderStatusStepper: React.FC<OrderStatusStepperProps> = ({
  status,
  isCollected = false,
  compact = false,
}) => {
  const currentIndex = STATUS_ORDER.indexOf(status as DeliveryStatus);

  const steps = isCollected ? COLLECTED_STEPS : STEPS;
  const activeIndex = isCollected
    ? STATUS_ORDER.indexOf('Collected')
    : currentIndex;

  // For "Pending" or unknown status, highlight step 0 only
  const highlightedUpTo = activeIndex >= 0 ? activeIndex : 0;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {steps.map((step, i) => {
        const isCompleted = i < highlightedUpTo;
        const isActive = i === highlightedUpTo;
        const isPending = i > highlightedUpTo;

        return (
          <View key={step.key} style={styles.stepWrap}>
            {/* Connector line (above circle) */}
            {i > 0 && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted,
                  isActive && styles.connectorActive,
                  isPending && styles.connectorPending,
                ]}
              />
            )}

            {/* Circle + label */}
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                  isPending && styles.circlePending,
                  compact && styles.circleCompact,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      isActive && styles.circleTextActive,
                      isPending && styles.circleTextPending,
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>

              {!compact && (
                <View style={styles.labelWrap}>
                  <Text
                    style={[
                      styles.label,
                      isCompleted && styles.labelCompleted,
                      isActive && styles.labelActive,
                      isPending && styles.labelPending,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                  {step.sublabel && (
                    <Text style={styles.sublabel}>{step.sublabel}</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  containerCompact: {
    paddingVertical: spacing.sm,
  },
  stepWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  connector: {
    position: 'absolute',
    top: -20,
    left: 18,
    width: 2,
    height: 20,
    backgroundColor: colors['outline-variant'],
  },
  connectorCompleted: {
    backgroundColor: colors.secondary,
  },
  connectorActive: {
    backgroundColor: colors['primary-container'],
  },
  connectorPending: {
    backgroundColor: colors['outline-variant'],
  },
  stepCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minHeight: 36,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['surface-container'],
    borderWidth: 2,
    borderColor: colors['outline-variant'],
    zIndex: 1,
  },
  circleCompact: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  circleCompleted: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  circleActive: {
    backgroundColor: colors['primary-container'],
    borderColor: colors['primary-container'],
  },
  circlePending: {
    backgroundColor: colors['surface-container'],
    borderColor: colors['outline-variant'],
  },
  checkmark: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '700',
  },
  circleText: {
    fontSize: 13,
    color: colors['on-surface-variant'],
    fontWeight: '600',
  },
  circleTextActive: {
    color: colors.white,
  },
  circleTextPending: {
    color: colors['on-surface-variant'],
  },
  labelWrap: {
    marginLeft: spacing.md,
    flex: 1,
  },
  label: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
  },
  labelCompleted: {
    color: colors.secondary,
    fontWeight: '600',
  },
  labelActive: {
    color: colors['on-surface'],
    fontWeight: '700',
  },
  labelPending: {
    color: colors['on-surface-variant'],
  },
  sublabel: {
    ...typography['label-sm'],
    color: colors['on-surface-variant'],
    marginTop: 2,
  },
});
