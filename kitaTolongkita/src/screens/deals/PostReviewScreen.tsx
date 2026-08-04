import React from 'react';
import { View, Text, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from '../../components';
import { typography, spacing, borderRadius, shadows } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface DealResult {
  id: string;
  title: string;
  groupPrice: number;
  originalPrice: number;
  minMembers: number;
  maxMembers: number;
  imageUrls?: string[];
}

interface PostReviewScreenProps {
  navigation?: any;
  route?: any;
}

export const PostReviewScreen: React.FC<PostReviewScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Deal data passed from PostDealScreen after successful creation
  const deal: DealResult | null = route?.params?.deal ?? null;

  const discountPct =
    deal && deal.originalPrice > 0
      ? Math.round((1 - deal.groupPrice / deal.originalPrice) * 100)
      : 0;

  const handleShare = async () => {
    if (!deal) return;
    const message = `Check out this deal: ${deal.title} for RM${deal.groupPrice}!\nkitatolong://deal/${deal.id}`;
    try {
      await Share.share({ message });
    } catch { /* ignore */ }
  };

  const handleBackToHome = () => {
    navigation?.popToTop();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      flex: 1,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: { marginBottom: spacing.xl },
    statusChip: {
      backgroundColor: colors['secondary-container'],
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      marginBottom: spacing.md,
    },
    statusChipText: {
      ...typography['label-sm'],
      color: colors['on-secondary-container'],
      fontWeight: '700',
    },
    pendingCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors['surface-container'],
      alignItems: 'center',
      justifyContent: 'center',
    },
    pendingIcon: { fontSize: 48 },
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
    infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
    infoIcon: { fontSize: 24, marginRight: spacing.md },
    infoContent: { flex: 1 },
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
      alignItems: 'flex-start',
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
    emptyState: {
      alignItems: 'center',
      padding: spacing.lg,
    },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyText: {
      ...typography['body-md'],
      color: colors['on-surface-variant'],
      textAlign: 'center',
    },
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Pending Illustration */}
        <View style={styles.iconContainer}>
          <View style={styles.pendingCircle}>
            <Text style={styles.pendingIcon}>⏳</Text>
          </View>
        </View>

        {/* Status chip */}
        <View style={styles.statusChip}>
          <Text style={styles.statusChipText}>
            ⏳ {t('deals.underReview', 'Under Review')}
          </Text>
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

        {/* Deal Summary Card — real data from API */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Deal Summary</Text>

          {deal ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Deal</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>{deal.title}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={styles.summaryValue}>RM {deal.groupPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Target</Text>
                <Text style={styles.summaryValue}>
                  {deal.minMembers} – {deal.maxMembers} members
                </Text>
              </View>
              {discountPct > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: colors.secondary }]}>
                    {discountPct}% OFF
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>
                Your deal was submitted successfully.{"\n"}Check "My Deals" for status updates.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.bottomButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title="Share to Get Members"
          onPress={handleShare}
          variant="secondary"
          fullWidth
          disabled={!deal}
        />
        <Button
          title="Back to Home"
          onPress={handleBackToHome}
          variant="primary"
          fullWidth
        />
      </View>
    </View>
  );
};
