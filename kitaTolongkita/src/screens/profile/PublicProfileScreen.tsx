import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { usersApi, dealsApi } from '../../api/client';
import type { PublicUserProfile, Deal } from '../../api/client';

function DealCard({ deal, onPress }: { deal: Deal; onPress: () => void }) {
  const discount = deal.originalPrice > 0
    ? Math.round((1 - Number(deal.groupPrice) / Number(deal.originalPrice)) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.dealCard} onPress={onPress} activeOpacity={0.8}>
      {deal.imageUrls && deal.imageUrls[0] ? (
        <Image source={{ uri: deal.imageUrls[0] }} style={styles.dealImage} />
      ) : (
        <View style={styles.dealImagePlaceholder}>
          <Text style={styles.dealImagePlaceholderText}>🏷️</Text>
        </View>
      )}
      {deal.isSaved && (
        <View style={styles.savedBadge}>
          <Text style={{ fontSize: 12 }}>📌</Text>
        </View>
      )}
      <View style={styles.dealInfo}>
        <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
        <View style={styles.dealMeta}>
          <Text style={styles.dealPrice}>RM{Number(deal.groupPrice).toFixed(2)}</Text>
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
        </View>
        <View style={styles.dealStats}>
          <Text style={styles.dealMembers}>
            {deal.membersJoined}/{deal.minMembers} joined
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (deal.membersJoined / deal.minMembers) * 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface RouteParams {
  userId: string;
  userName?: string;
}

export const PublicProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { userId, userName } = route.params as RouteParams;

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [profileData, dealsData] = await Promise.all([
        usersApi.getPublicProfile(userId),
        usersApi.getDealsByUser(userId),
      ]);
      setProfile(profileData as any);
      setDeals((dealsData as any) ?? []);
      setError(null);
    } catch (err: any) {
      setError('Could not load profile. This user may not exist.');
    }
  }, [userId]);

  useEffect(() => {
    load().finally(() => { setLoading(false); setDealsLoading(false); });
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDealPress = (deal: Deal) => {
    navigation.navigate('DealDetail', { dealId: deal.id });
  };

  const joinedDate = profile
    ? new Date(profile.createdAt).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
    : '';

  if (loading) {
    return (
      <View style={[styles.container, styles.centerState, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{userName ?? 'User'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.centerState, { flex: 1 }]}>
          <Text style={styles.errorEmoji}>👤</Text>
          <Text style={styles.errorText}>{error ?? 'User not found'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{profile.fullName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={deals}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <Avatar name={profile.fullName} uri={profile.avatarUrl} size={80} verified />
              <Text style={styles.userName}>{profile.fullName}</Text>
              <Text style={styles.memberSince}>📅 Member since {joinedDate}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.activeDealsCount}</Text>
                  <Text style={styles.statLabel}>Active Deals</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{deals.length}</Text>
                  <Text style={styles.statLabel}>Posted</Text>
                </View>
              </View>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Deals</Text>
              <Text style={styles.sectionCount}>{deals.length} posted</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <DealCard deal={item} onPress={() => handleDealPress(item)} />
        )}
        ListEmptyComponent={
          dealsLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Active Deals</Text>
              <Text style={styles.emptyHint}>This user hasn't posted any active deals yet.</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerState: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
    backgroundColor: colors['surface-container-lowest'],
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: colors['on-surface'] },
  headerTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700', flex: 1, textAlign: 'center' },

  // Profile card
  profileCard: {
    alignItems: 'center', padding: spacing.xl,
    backgroundColor: colors['surface-container-lowest'],
    borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
  },
  userName: { ...typography['headline-sm'], color: colors['on-surface'], fontWeight: '800', marginTop: spacing.md },
  memberSince: { ...typography['body-sm'], color: colors['on-surface-variant'], marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.xl },
  statItem: { alignItems: 'center' },
  statValue: { ...typography['headline-sm'], color: colors['on-surface'], fontWeight: '800' },
  statLabel: { ...typography['label-sm'], color: colors['on-surface-variant'], marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors['outline-variant'] },

  // Section
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  sectionTitle: { ...typography['title-sm'], color: colors['on-surface'], fontWeight: '700' },
  sectionCount: { ...typography['label-sm'], color: colors['on-surface-variant'] },

  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  // Deal card
  dealCard: {
    flexDirection: 'row', backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors['outline-variant'],
  },
  dealImage: { width: 100, height: '100%', minHeight: 100 },
  dealImagePlaceholder: {
    width: 100, height: '100%', minHeight: 100, backgroundColor: colors['surface-container'],
    alignItems: 'center', justifyContent: 'center',
  },
  dealImagePlaceholderText: { fontSize: 32 },
  savedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealInfo: { flex: 1, padding: spacing.md },
  dealTitle: { ...typography['body-md'], color: colors['on-surface'], fontWeight: '600', marginBottom: spacing.xs },
  dealMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dealPrice: { ...typography['title-md'], color: colors.primary, fontWeight: '800' },
  discountBadge: {
    backgroundColor: colors.secondary, paddingHorizontal: spacing.xs, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: { ...typography['label-xs'], color: colors.white, fontWeight: '700' },
  dealStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dealMembers: { ...typography['label-xs'], color: colors['on-surface-variant'] },
  progressBar: { flex: 1, height: 4, backgroundColor: colors['outline-variant'], borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },

  // States
  emptyState: { alignItems: 'center', padding: spacing.xl * 2 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700', marginBottom: spacing.xs },
  emptyHint: { ...typography['body-sm'], color: colors['on-surface-variant'], textAlign: 'center' },
  errorEmoji: { fontSize: 48, marginBottom: spacing.md },
  errorText: { ...typography['body-lg'], color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  retryText: { ...typography['body-md'], color: colors.primary, fontWeight: '600' },
});
