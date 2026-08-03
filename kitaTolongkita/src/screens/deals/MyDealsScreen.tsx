import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { typography, spacing, borderRadius, shadows } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { request, getAccessToken } from '../../api/client';
import { useTranslation } from 'react-i18next';

interface DealListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  originalPrice: number;
  groupPrice: number;
  minMembers: number;
  maxMembers: number;
  membersJoined: number;
  deadline: string;
  pickupLocation: string;
  imageUrls: string[];
  status: 'Draft' | 'Active' | 'Fulfilled' | 'Cancelled' | 'Expired';
  createdAt: string;
  hashtags: string[];
  upvoteCount: number;
  likeCount: number;
  moderationStatus: 'Pending' | 'UnderReview' | 'Approved' | 'Rejected' | 'Expired';
  moderationRejectReason?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Draft:       { label: 'Draft',       color: '#6B7280', bg: '#F3F4F6' },
  Active:       { label: 'Active',      color: '#059669', bg: '#D1FAE5' },
  Fulfilled:    { label: 'Fulfilled',   color: '#3B82F6', bg: '#DBEAFE' },
  Cancelled:    { label: 'Cancelled',   color: '#DC2626', bg: '#FEE2E2' },
  Expired:      { label: 'Expired',     color: '#92400E', bg: '#FEF3C7' },
};

const MODERATION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Pending:     { label: '⏳ Pending Review',  color: '#92400E', bg: '#FEF3C7' },
  UnderReview: { label: '🔍 Under Review',   color: '#1D4ED8', bg: '#DBEAFE' },
  Approved:    { label: '✅ Approved',        color: '#065F46', bg: '#D1FAE5' },
  Rejected:    { label: '❌ Rejected',        color: '#991B1B', bg: '#FEE2E2' },
  Expired:     { label: '⏰ Expired',         color: '#6B7280', bg: '#F3F4F6' },
};

export const MyDealsScreen: React.FC = () => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors['outline-variant'],
    },
    backBtn: { padding: spacing.sm },
    backBtnText: { fontSize: 22, fontWeight: '700' },
    headerTitle: { ...typography['title-md'], fontWeight: '800', flex: 1, textAlign: 'center' },
    addBtn: { backgroundColor: '#0e6a5b', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    loadingText: { ...typography['body-lg'], color: colors['on-surface-variant'] },
    emptyIcon: { fontSize: 64, marginBottom: spacing.md },
    emptyTitle: { ...typography['title-md'], fontWeight: '800', marginBottom: spacing.sm },
    emptySubtitle: { ...typography['body-md'], color: colors['on-surface-variant'], textAlign: 'center', marginBottom: spacing.xl },
    postDealBtn: { backgroundColor: '#0e6a5b', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
    postDealBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    list: { padding: spacing.md },
    card: {
      backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      ...shadows.card,
    },
    cardImage: {
      height: 140,
      backgroundColor: colors['surface-container'],
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardImageText: { fontSize: 40 },
    discountBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: '#EF4444',
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    discountText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    cardContent: { padding: spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
    cardTitle: { ...typography['title-md'], fontWeight: '700', flex: 1 },
    statusChip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardCategory: { ...typography['body-md'], color: colors['on-surface-variant'], marginBottom: spacing.xs },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm },
    groupPrice: { ...typography['title-md'], fontWeight: '800', color: '#0e6a5b' },
    originalPrice: { ...typography['body-md'], color: colors['on-surface-variant'], textDecorationLine: 'line-through' },
    modChip: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm, marginBottom: spacing.sm },
    modText: { fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: spacing.lg },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statIcon: { fontSize: 14 },
    statText: { ...typography['body-md'], fontWeight: '600' },
    expiredText: { color: '#DC2626' },
  });
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDeals = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        Alert.alert('Login Required', 'Please login to see your deals.');
        return;
      }
      const data = await request<DealListItem[]>('GET', '/deals/mine', undefined, true);
      setDeals(data);
    } catch (err: any) {
      console.error('Failed to load my deals:', err);
      Alert.alert('Error', 'Could not load your deals. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  const onRefresh = () => { setRefreshing(true); loadDeals(); };

  const renderDeal = ({ item }: { item: DealListItem }) => {
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Draft;
    const mod = MODERATION_CONFIG[item.moderationStatus] ?? MODERATION_CONFIG.Pending;
    const discount = Math.round((1 - item.groupPrice / item.originalPrice) * 100);
    const deadline = new Date(item.deadline);
    const isExpired = deadline < new Date();

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
        activeOpacity={0.8}
      >
        {/* Image */}
        <View style={styles.cardImage}>
          {item.imageUrls?.[0] ? (
            <Text style={styles.cardImageText}>📷</Text>
          ) : (
            <Text style={styles.cardImageText}>🏷️</Text>
          )}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <Text style={styles.cardCategory}>{item.category}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.groupPrice}>RM{item.groupPrice.toFixed(2)}</Text>
            <Text style={styles.originalPrice}>RM{item.originalPrice.toFixed(2)}</Text>
          </View>

          {/* Moderation Status */}
          <View style={[styles.modChip, { backgroundColor: mod.bg }]}>
            <Text style={[styles.modText, { color: mod.color }]}>{mod.label}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={styles.statText}>{item.membersJoined}/{item.maxMembers}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>👍</Text>
              <Text style={styles.statText}>{item.upvoteCount}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>❤️</Text>
              <Text style={styles.statText}>{item.likeCount}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>⏰</Text>
              <Text style={[styles.statText, isExpired && styles.expiredText]}>
                {isExpired ? 'Expired' : 'Active'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Deals</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('PostDeal')}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Post Deal</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><Text style={styles.loadingText}>Loading your deals...</Text></View>
      ) : deals.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No deals yet</Text>
          <Text style={styles.emptySubtitle}>Post your first group deal and start building your community!</Text>
          <TouchableOpacity
            style={styles.postDealBtn}
            onPress={() => navigation.navigate('PostDeal')}
          >
            <Text style={styles.postDealBtnText}>Post a Deal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={deals}
          renderItem={renderDeal}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}
    </View>
  );
};


