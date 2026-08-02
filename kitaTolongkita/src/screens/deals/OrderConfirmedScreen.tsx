import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components';
import { typography, spacing, borderRadius, shadows } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface OrderConfirmedScreenProps {
  route?: any;
  navigation?: any;
}

export const OrderConfirmedScreen: React.FC<OrderConfirmedScreenProps> = ({
  route,
  navigation,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: spacing.md,
      alignItems: 'center',
    },
    iconContainer: {
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
      position: 'relative',
    },
    successCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkmark: {
      fontSize: 48,
      color: colors.white,
      fontWeight: '700',
    },
    confetti: {
      position: 'absolute',
      top: -10,
      left: -40,
      right: -40,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    title: {
      ...typography['headline-lg'],
      color: colors['on-background'],
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography['body-lg'],
      color: colors['on-surface-variant'],
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    orderCard: {
      width: '100%',
      backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.card,
      marginBottom: spacing.xl,
    },
    orderIdLabel: {
      ...typography['label-sm'],
      color: colors['on-surface-variant'],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    orderId: {
      ...typography['title-md'],
      color: colors['on-surface'],
      fontWeight: '700',
      marginTop: 4,
      marginBottom: spacing.md,
    },
    divider: {
      height: 1,
      backgroundColor: colors['outline-variant'],
      marginBottom: spacing.md,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusIcon: {
      fontSize: 28,
      marginRight: spacing.md,
    },
    statusTitle: {
      ...typography['body-lg'],
      color: colors['on-surface'],
      fontWeight: '600',
    },
    statusSubtitle: {
      ...typography['body-md'],
      color: colors['on-surface-variant'],
      marginTop: 2,
    },
    nextSteps: {
      width: '100%',
      marginBottom: spacing.xl,
    },
    nextTitle: {
      ...typography['title-md'],
      color: colors['on-background'],
      marginBottom: spacing.md,
    },
    stepItem: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors['primary-container'],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      marginTop: 2,
    },
    stepNumberText: {
      ...typography['label-sm'],
      color: colors.white,
      fontWeight: '700',
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      ...typography['body-lg'],
      color: colors['on-surface'],
      fontWeight: '600',
      marginBottom: 2,
    },
    stepDesc: {
      ...typography['body-md'],
      color: colors['on-surface-variant'],
      lineHeight: 20,
    },
    bottomButtons: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    shareBtn: {
      marginBottom: spacing.xs,
    },
    viewOrdersBtn: {},
  });
  const insets = useSafeAreaInsets();
  const orderId = route?.params?.orderId || 'KTK-2024-0735';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Success Animation */}
        <View style={styles.iconContainer}>
          <View style={styles.successCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <View style={styles.confetti}>
            <Text>🎉</Text>
            <Text>🎊</Text>
            <Text>✨</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Order Confirmed!</Text>
        <Text style={styles.subtitle}>
          You've successfully joined the group buy. Sit tight and wait for the deal
          to be confirmed!
        </Text>

        {/* Order Card */}
        <View style={styles.orderCard}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderId}>{orderId}</Text>

          <View style={styles.divider} />

          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>⏳</Text>
            <View>
              <Text style={styles.statusTitle}>Awaiting Group Confirmation</Text>
              <Text style={styles.statusSubtitle}>
                33 more members needed to unlock this deal
              </Text>
            </View>
          </View>
        </View>

        {/* What's Next */}
        <View style={styles.nextSteps}>
          <Text style={styles.nextTitle}>What's Next?</Text>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share with friends</Text>
              <Text style={styles.stepDesc}>
                Help the group buy succeed by sharing with your network!
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Wait for confirmation</Text>
              <Text style={styles.stepDesc}>
                We'll notify you once the deal is confirmed and ready for pickup.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Pick up your order</Text>
              <Text style={styles.stepDesc}>
                Collect your order at the designated pickup location.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={[styles.bottomButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title="Share to Get More Members"
          onPress={() => {}}
          variant="secondary"
          fullWidth
          style={styles.shareBtn}
        />
        <Button
          title="View My Orders"
          onPress={() => navigation.navigate('Orders')}
          variant="primary"
          fullWidth
          style={styles.viewOrdersBtn}
        />
      </View>
    </View>
  );
};


