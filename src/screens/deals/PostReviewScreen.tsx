import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

interface PostReviewScreenProps {
  navigation?: any;
}

export const PostReviewScreen: React.FC<PostReviewScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Pending Illustration */}
        <View style={styles.iconContainer}>
          <View style={styles.pendingCircle}>
            <Text style={styles.pendingIcon}>⏳</Text>
          </View>
        </View>

        <Text style={styles.title}>Under Review</Text>
        <Text style={styles.subtitle}>
          Your deal is being reviewed by our team. We'll notify you once it's approved and live!
        </Text>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📋</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Review Process</Text>
              <Text style={styles.infoDesc}>
                Typically takes 1-2 hours. You'll be notified via push notification and SMS.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>💡</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>While you wait...</Text>
              <Text style={styles.infoDesc}>
                Share your deal link with friends to start building your group!
              </Text>
            </View>
          </View>
        </View>

        {/* Deal Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Deal Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deal</Text>
            <Text style={styles.summaryValue}>Premium Kuih Muih Set</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price</Text>
            <Text style={styles.summaryValue}>RM25.00</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Target</Text>
            <Text style={styles.summaryValue}>50 members</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, { color: colors.secondary }]}>34% OFF</Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottomButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title="Share to Get Members"
          onPress={() => {}}
          variant="secondary"
          fullWidth
        />
        <Button
          title="Back to Home"
          onPress={() => navigation?.replace('Main')}
          variant="primary"
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  pendingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors['surface-container'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIcon: {
    fontSize: 48,
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
    lineHeight: 26,
  },
  infoCard: {
    width: '100%',
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDesc: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors['outline-variant'],
    marginVertical: spacing.md,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  summaryTitle: {
    ...typography['title-md'],
    color: colors['on-surface'],
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
  },
  summaryValue: {
    ...typography['body-md'],
    color: colors['on-surface'],
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  bottomButtons: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
