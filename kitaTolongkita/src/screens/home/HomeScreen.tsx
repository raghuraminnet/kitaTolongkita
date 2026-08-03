import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { DealCard, CategoryChip, SkeletonCard, EmptyState } from '../../components';
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { dealsApi } from '../../api/client';
import type { Deal } from '../../api/client';

const CATEGORIES = ['All', 'Food', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Drinks'];

const PAGE_SIZE = 20;

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadDeals = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (reset) setLoading(true); else setLoadingMore(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        pageSize: PAGE_SIZE,
      };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      const res = await dealsApi.search(params);
      const newItems = res.items ?? [];

      if (reset) {
        setDeals(newItems);
        setPage(2);
      } else {
        setDeals(prev => [...prev, ...newItems]);
        setPage(p => p + 1);
      }
      setHasMore(newItems.length === PAGE_SIZE);
    } catch (err) {
      setError('Could not load deals. Pull to retry.');
      console.warn('Failed to load deals', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, page]);

  useEffect(() => {
    setPage(1);
    loadDeals(true);
  }, [selectedCategory]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadDeals(true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    loadDeals(false);
  };

  const renderDeal = ({ item }: { item: Deal }) => (
    <View style={localStyles.dealItem}>
      <DealCard
        title={item.title}
        price={`RM${item.groupPrice.toFixed(2)}`}
        originalPrice={`RM${item.originalPrice.toFixed(2)}`}
        location={item.pickupLocation}
        deadline={item.deadline}
        membersJoined={item.membersJoined}
        membersTarget={item.maxMembers}
        likes={item.likeCount ?? 0}
        upvotes={item.upvoteCount ?? 0}
        organizerName={item.organizerName}
        isSaved={item.isSaved}
        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
      />
    </View>
  );

  const ListFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator size="small" color={colors['primary-container']} style={{ paddingVertical: spacing.md }} />;
  };

  const ListHeader = () => (
    <View>
      {/* Hero Banner */}
      <TouchableOpacity
        style={[styles.heroBanner, { backgroundColor: colors['primary-container'] }]}
        activeOpacity={0.9}
      >
        <View style={styles.heroContent}>
          <Text style={[styles.heroTitle, { color: colors.white }]}>
            Gotong Royong{'\n'}Lebih Jimat! ✨
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.white, opacity: 0.9 }]}>
            Join group buys & save up to 50%
          </Text>
        </View>
        <Text style={styles.heroEmoji}>🛒</Text>
      </TouchableOpacity>

      {/* Category Chips */}
      <View style={styles.categoriesScrollWrap}>
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            label={cat}
            selected={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
            style={styles.categoryChip}
          />
        ))}
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors['on-background'] }]}>
          🔥 Hot Deals
        </Text>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: colors['primary-container'] }]}>
            See All →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Selamat Datang 👋</Text>
          <Text style={[styles.headerTitle, { color: colors['primary-container'] }]}>
            KitaTolongKita
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.notificationBtn, { backgroundColor: colors['surface-container'] }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Bell size={20} color={colors['on-surface-variant']} strokeWidth={2} />
          <View style={[styles.badge, { backgroundColor: colors.error }]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={deals}
        renderItem={renderDeal}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        ListEmptyComponent={
          loading ? null : error && deals.length === 0 ? (
            <EmptyState
              icon="⚠️"
              title="Couldn't load deals"
              message={error ?? ''}
              actionLabel="Try Again"
              onAction={handleRefresh}
            />
          ) : (
            <EmptyState
              icon="🛒"
              title="No deals yet"
              message={`Be the first to post a deal${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}!`}
              actionLabel="Post a Deal"
              onAction={() => navigation.navigate('Post')}
            />
          )
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors['primary-container']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  greeting: {
    ...typography['body-md'],
    color: 'transparent',
  },
  headerTitle: {
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: { paddingBottom: 100 },
  heroBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroContent: { flex: 1 },
  heroTitle: {
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  heroEmoji: { fontSize: 48, marginLeft: spacing.sm },
  categoriesScrollWrap: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  categoryChip: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
});

const localStyles = StyleSheet.create({
  dealItem: { marginBottom: spacing.sm, paddingHorizontal: spacing.md },
});
