import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, Bell } from 'lucide-react-native';
import { useLocation } from '../../contexts/LocationContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dealsApi } from '../../api/client';
import { EmptyState } from '../../components';
import { timeUntil } from '../../utils/time';
import type { Deal } from '../../api/client';

const API_BASE = 'http://76.13.219.191:5000/api';
const CATEGORIES = ['All', 'Food', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Drinks'];
const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price (Low–High)' },
  { key: 'popular', label: 'Most Popular' },
];

const MOCK_DEALS: Deal[] = [
  {
    id: '1', title: 'Aneka Kuih Muih — Premium Ramadan Set A', description: '', category: 'Food',
    originalPrice: 38, groupPrice: 25, minMembers: 50, maxMembers: 100, membersJoined: 42,
    deadline: new Date(Date.now() + 216000000).toISOString(), pickupLocation: 'Kuala Lumpur',
    imageUrls: [], status: 'Active', organizerName: 'Makcik Ros', createdAt: new Date().toISOString(),
  },
  {
    id: '2', title: 'Wireless Earbuds Pro — Noise Cancelling', description: '', category: 'Electronics',
    originalPrice: 149, groupPrice: 89, minMembers: 30, maxMembers: 80, membersJoined: 78,
    deadline: new Date(Date.now() + 108000000).toISOString(), pickupLocation: 'Petaling Jaya',
    imageUrls: [], status: 'Active', organizerName: 'TechDeals MY', createdAt: new Date().toISOString(),
  },
  {
    id: '3', title: 'Malaysian Batik — Limited Edition 2024', description: '', category: 'Fashion',
    originalPrice: 99, groupPrice: 65, minMembers: 20, maxMembers: 50, membersJoined: 15,
    deadline: new Date(Date.now() + 324000000).toISOString(), pickupLocation: 'Shah Alam',
    imageUrls: [], status: 'Active', organizerName: 'Batik Heritage', createdAt: new Date().toISOString(),
  },
];

// Trending tags — in production these would come from an API
const TRENDING_TAGS = [
  'ramadan', 'kereta', 'batik', 'kuih', 'wireless', 'fashion', 'electronics', 'food', 'homemade', 'limited'
];

const MAX_RECENT_SEARCHES = 8;
const RECENT_SEARCHES_KEY = 'recent_searches';

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { latitude: userLat, longitude: userLon } = useLocation();

  const [query, setQuery] = useState('');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadDeals(true);
    loadRecentSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDeals = async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (reset) setLoading(true); else setLoadingMore(true);

    try {
      let results: Deal[] = [];

      const params: Record<string, string | number> = {
        page: currentPage,
        pageSize: 20,
        ...(query.trim() ? { query: query.trim() } : {}),
        ...(activeCategory !== 'All' ? { category: activeCategory } : {}),
        sortBy,
      };

      if (userLat && userLon) {
        params.lat = userLat;
        params.lon = userLon;
        params.radiusKm = 10;
      }

      const res = await dealsApi.search(params);
      results = res.items ?? [];

      if (results.length === 0) {
        const fallback = await dealsApi.search({ sortBy, page: currentPage, pageSize: 20 });
        results = fallback.items ?? MOCK_DEALS;
      }

      if (reset) {
        setDeals(results);
        setAllDeals(results);
        setPage(2);
      } else {
        setDeals((prev) => [...prev, ...results]);
        setAllDeals((prev) => [...prev, ...results]);
        setPage((p) => p + 1);
      }
      setHasMore(results.length >= 20);
    } catch {
      if (reset) {
        setDeals(MOCK_DEALS);
        setAllDeals(MOCK_DEALS);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  };

  const saveRecentSearch = async (term: string) => {
    if (!term.trim()) return;
    const trimmed = term.trim();
    try {
      const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch { /* ignore */ }
  };

  const handleSearch = async () => {
    await saveRecentSearch(query);
    setSearching(true);
    setPage(1);
    setShowSuggestions(false);
    try {
      await loadDeals(true);
    } finally {
      setSearching(false);
    }
  };

  const handleRecentTap = (term: string) => {
    setQuery(term);
    setShowSuggestions(false);
    setSearching(true);
    setPage(1);
    // Small delay to let state settle
    setTimeout(async () => {
      await loadDeals(true);
      setSearching(false);
    }, 100);
  };

  const handleTrendingTap = (tag: string) => {
    setQuery(tag);
    setShowSuggestions(false);
    setSearching(true);
    setPage(1);
    setTimeout(async () => {
      await loadDeals(true);
      setSearching(false);
    }, 100);
  };

  const handleCategoryChange = async (cat: string) => {
    setActiveCategory(cat);
    setPage(1);
    await loadDeals(true);
  };

  const handleSortChange = async (option: string) => {
    setSortBy(option);
    setShowSortMenu(false);
    setPage(1);
    await loadDeals(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadDeals(true);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    await loadDeals(false);
  };

  const renderDeal = ({ item }: { item: Deal }) => {
    const distance =
      item.latitude && item.longitude && userLat && userLon
        ? calcDistance(userLat, userLon, item.latitude, item.longitude)
        : null;

    return (
      <TouchableOpacity
        style={[styles.dealCard, { backgroundColor: colors['surface-container-lowest'] }]}
        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
        activeOpacity={0.8}
      >
        {/* Thumbnail */}
        <View style={[styles.thumbnail, { backgroundColor: colors['surface-container-high'] }]}>
          {item.imageUrls?.[0] ? (
            <Image source={{ uri: item.imageUrls[0] }} style={styles.thumbnailImage} />
          ) : (
            <Text style={styles.thumbnailEmoji}>🛒</Text>
          )}
          {item.isSaved && (
            <View style={[styles.savedBadge, { backgroundColor: colors['surface-container-lowest'] }]}>
              <Text style={{ fontSize: 11 }}>🔖</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.dealInfo}>
          <View style={styles.dealTopRow}>
            <View style={[styles.categoryChip, { backgroundColor: colors['secondary-container'] }]}>
              <Text style={[styles.categoryChipText, { color: colors['on-secondary-container'] }]}>
                {item.category}
              </Text>
            </View>
            {distance !== null && (
              <Text style={[styles.distance, { color: colors['on-surface-variant'] }]}>
                {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)} km`}
              </Text>
            )}
          </View>

          <Text style={[styles.dealTitle, { color: colors['on-surface'] }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.groupPrice, { color: colors.primary }]}>
              RM {item.groupPrice.toFixed(0)}
            </Text>
            <Text style={[styles.originalPrice, { color: colors['on-surface-variant'] }]}>
              RM {item.originalPrice.toFixed(0)}
            </Text>
          </View>

          <View style={styles.dealFooter}>
            <View style={[styles.progressTrack, { backgroundColor: colors['surface-container-high'] }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (item.membersJoined / item.maxMembers) * 100)}%`,
                    backgroundColor: colors.secondary,
                  },
                ]}
              />
            </View>
            <View style={styles.dealFooterMeta}>
              <Text style={[styles.membersText, { color: colors['on-surface-variant'] }]}>
                {item.membersJoined}/{item.maxMembers} joined
              </Text>
              {item.deadline && (
                <Text style={[styles.deadlineText, { color: colors.secondary }]}>
                  {timeUntil(item.deadline)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const sortLabel = SORT_OPTIONS.find((s) => s.key === sortBy)?.label ?? 'Sort';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors['on-background'] }]}>Search</Text>
        <TouchableOpacity
          style={[styles.notificationBtn, { backgroundColor: colors['surface-container'] }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Bell size={20} color={colors['on-surface-variant']} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors['surface-container'] }]}>
          <Search size={16} color={colors['on-surface-variant']} strokeWidth={2} style={{ marginRight: spacing.sm }} />
          <TextInput
            style={[styles.searchInput, { color: colors['on-surface'] }]}
            placeholder={t('search.placeholder', 'Search deals...')}
            placeholderTextColor={colors['on-surface-variant']}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowSuggestions(text.length === 0);
            }}
            onFocus={() => setShowSuggestions(true)}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color={colors['primary-container']} />}
        </View>

        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors['surface-container'] }]}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <SlidersHorizontal size={16} color={colors['on-surface']} strokeWidth={2} />
          <Text style={[styles.sortBtnText, { color: colors['on-surface'] }]}>{sortLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown */}
      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors['surface-container-lowest'] }, shadows.card]}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortMenuItem,
                sortBy === opt.key && { backgroundColor: colors['primary-container'] },
              ]}
              onPress={() => handleSortChange(opt.key)}
            >
              <Text
                style={[
                  styles.sortMenuText,
                  { color: colors['on-surface'] },
                  sortBy === opt.key && { color: colors.white, fontWeight: '700' },
                ]}
              >
                {opt.label}
              </Text>
              {sortBy === opt.key && (
                <Text style={{ color: colors.white, fontWeight: '700' }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category Chips */}
      <View style={styles.categoriesScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryFilterChip,
              { backgroundColor: colors['surface-container'] },
              activeCategory === cat && { backgroundColor: colors['primary-container'] },
            ]}
            onPress={() => handleCategoryChange(cat)}
          >
            <Text
              style={[
                styles.categoryFilterText,
                { color: colors['on-surface'] },
                activeCategory === cat && { color: colors.white, fontWeight: '700' },
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Suggestions — shown when input is empty */}
      {showSuggestions && !query && !loading && (
        <ScrollView style={styles.suggestionsWrap} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.suggestionsSection}>
              <View style={styles.suggestionsSectionHeader}>
                <Text style={[styles.suggestionsSectionTitle, { color: colors['on-surface'] }]}>
                  Recent
                </Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={[styles.clearText, { color: colors['on-surface-variant'] }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsRow}>
                {recentSearches.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={[styles.suggestionChip, { backgroundColor: colors['surface-container'] }]}
                    onPress={() => handleRecentTap(term)}
                  >
                    <Text style={styles.chipIcon}>🕐</Text>
                    <Text style={[styles.chipText, { color: colors['on-surface'] }]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Trending Tags */}
          <View style={styles.suggestionsSection}>
            <Text style={[styles.suggestionsSectionTitle, { color: colors['on-surface'] }]}>
              🔥 Trending
            </Text>
            <View style={styles.chipsRow}>
              {TRENDING_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.suggestionChip, { backgroundColor: colors['primary-container'] }]}
                  onPress={() => handleTrendingTap(tag)}
                >
                  <Text style={styles.chipIcon}>#</Text>
                  <Text style={[styles.chipText, { color: colors.white }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors['surface-container-lowest'] }]}>
              <View style={[styles.skeletonThumb, { backgroundColor: colors['surface-container-high'] }]} />
              <View style={styles.skeletonBody}>
                <View style={[styles.skeletonLine, { width: '50%', backgroundColor: colors['surface-container-high'] }]} />
                <View style={[styles.skeletonLine, { width: '80%', backgroundColor: colors['surface-container-high'] }]} />
                <View style={[styles.skeletonLine, { width: '35%', backgroundColor: colors['surface-container-high'] }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={allDeals}
          renderItem={renderDeal}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors['primary-container']} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors['primary-container']} style={{ marginVertical: spacing.md }} />
            ) : null
          }
          ListHeaderComponent={
            query && activeCategory !== 'All' ? (
              <View style={styles.activeFiltersRow}>
                <Text style={[styles.activeFilterText, { color: colors['on-surface-variant'] }]}>
                  Showing results for "{query}" in {activeCategory}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="No deals found"
              message={query ? `No results for "${query}"` : 'Try a different category or check back later'}
              actionLabel="Clear Search"
              onAction={() => { setQuery(''); setActiveCategory('All'); setPage(1); loadDeals(true); }}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 24, fontWeight: '700',
  },
  notificationBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.full, paddingHorizontal: spacing.md, height: 44,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: borderRadius.full, paddingHorizontal: spacing.md, height: 44, justifyContent: 'center',
  },
  sortBtnText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  sortMenu: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    borderRadius: borderRadius.lg, overflow: 'hidden', paddingVertical: spacing.xs,
  },
  sortMenuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  sortMenuText: { ...typography['body-md'] },
  categoriesScroll: {
    flexDirection: 'row', paddingHorizontal: spacing.md,
    gap: spacing.sm, marginBottom: spacing.md,
  },
  categoryFilterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  categoryFilterText: {
    fontFamily: 'Inter_400Regular', fontSize: 13,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  dealCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.sm,
    ...shadows.card,
  },
  thumbnail: {
    width: 88, height: 88, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbnailEmoji: { fontSize: 36 },
  savedBadge: {
    position: 'absolute', top: 4, left: 4,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  dealInfo: { flex: 1, marginLeft: spacing.sm, justifyContent: 'space-between' },
  dealTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  categoryChipText: { ...typography['label-sm'], fontSize: 10 },
  distance: { ...typography['label-sm'], fontSize: 11 },
  dealTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 18, marginBottom: 4,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  groupPrice: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 16, fontWeight: '800',
  },
  originalPrice: {
    fontFamily: 'Inter_400Regular', fontSize: 12, textDecorationLine: 'line-through',
  },
  dealFooter: { gap: 4 },
  progressTrack: { height: 4, borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  dealFooterMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  membersText: { ...typography['label-sm'], fontSize: 11 },
  deadlineText: { ...typography['label-sm'], fontSize: 11, fontWeight: '700' },
  loadingContainer: { padding: spacing.md, gap: spacing.sm },
  skeletonCard: {
    flexDirection: 'row', borderRadius: borderRadius.lg, padding: spacing.sm,
  },
  skeletonThumb: { width: 88, height: 88, borderRadius: borderRadius.md },
  skeletonBody: { flex: 1, marginLeft: spacing.sm, justifyContent: 'center', gap: spacing.sm },
  skeletonLine: { height: 12, borderRadius: borderRadius.sm },
  /* Search Suggestions */
  suggestionsWrap: {
    maxHeight: 240,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  suggestionsSection: {
    marginBottom: spacing.lg,
  },
  suggestionsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  suggestionsSectionTitle: {
    ...typography['title-md'],
    fontSize: 16,
    fontWeight: '700',
  },
  clearText: {
    ...typography['label-sm'],
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    ...typography['label-sm'],
    fontWeight: '600',
  },
  activeFiltersRow: {
    paddingBottom: spacing.sm,
  },
  activeFilterText: {
    ...typography['body-md'],
  },
});
