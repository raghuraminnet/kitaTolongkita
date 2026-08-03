import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useLocation } from '../../contexts/LocationContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { dealsApi } from '../../api/client';
import type { Deal } from '../../api/client';

const API_BASE = 'http://76.13.219.191:5000/api';
const CATEGORIES = ['All', 'Food', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Drinks'];
const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price (Low-High)' },
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

function getCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 864000000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${Math.floor((diff % 3600000) / 60000)}m`;
}

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

  useEffect(() => {
    loadDeals(true);
  }, []);

  const loadDeals = async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (reset) setLoading(true); else setLoadingMore(true);

    try {
      let results: Deal[] = [];

      if (userLat && userLon) {
        // Geo-aware search: backend sorts by distance automatically
        const params = new URLSearchParams({
          lat: String(userLat),
          lon: String(userLon),
          radiusKm: '10',
          page: String(currentPage),
          pageSize: '20',
          ...(query.trim() ? { query: query.trim() } : {}),
          ...(activeCategory !== 'All' ? { category: activeCategory } : {}),
          sortBy,
        });
        try {
          const res = await fetch(`${API_BASE}/deals?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            results = data.items ?? data ?? [];
          }
        } catch { /* fall through to fallback */ }
      } else {
        // No location — search without geo filters
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: '20',
          ...(query.trim() ? { query: query.trim() } : {}),
          ...(activeCategory !== 'All' ? { category: activeCategory } : {}),
          sortBy,
        });
        try {
          const res = await fetch(`${API_BASE}/deals?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            results = data.items ?? data ?? [];
          }
        } catch { /* fall through to fallback */ }
      }

      if (results.length === 0) {
        // Fallback to dealsApi (no location)
        const fallbackParams: Record<string, string | number> = {
          sortBy,
          page: currentPage,
          pageSize: 20,
          ...(query.trim() ? { query: query.trim() } : {}),
        };
        const result = await dealsApi.search(fallbackParams);
        results = result.items ?? MOCK_DEALS;
      }

      // Filter by category client-side if API didn't handle it
      if (activeCategory !== 'All') {
        results = results.filter((d) => d.category === activeCategory);
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
      setDeals(reset ? MOCK_DEALS : deals);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    setPage(1);
    try {
      await loadDeals(true);
    } finally {
      setSearching(false);
    }
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

  const filteredDeals = allDeals;

  const renderDeal = ({ item }: { item: Deal }) => {
    const distance =
      item.latitude && item.longitude && userLat && userLon
        ? calcDistance(userLat, userLon, item.latitude, item.longitude)
        : null;

    return (
      <TouchableOpacity
        style={styles.dealCard}
        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
        activeOpacity={0.8}
      >
        {/* Thumbnail */}
        {item.imageUrls?.[0] ? (
          <Image source={{ uri: item.imageUrls[0] }} style={styles.dealThumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailEmoji}>🛒</Text>
          </View>
        )}
        {item.isSaved && (
          <View style={styles.savedBadge}>
            <Text style={{ fontSize: 11 }}>📌</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.dealInfo}>
          <View style={styles.dealTopRow}>
            <Text style={styles.dealCategoryChip}>{item.category}</Text>
            {distance !== null && (
              <Text style={styles.dealDistance}>
                {distance < 1 ? `${(distance * 1000).toFixed(0)}m away` : `${distance.toFixed(1)} km away`}
              </Text>
            )}
          </View>
          <Text style={styles.dealTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.dealPriceRow}>
            <Text style={styles.dealGroupPrice}>RM {item.groupPrice.toFixed(0)}</Text>
            <Text style={styles.dealOriginalPrice}>RM {item.originalPrice.toFixed(0)}</Text>
          </View>
          {/* Members progress */}
          <View style={styles.membersRow}>
            <View style={styles.progressBarWrap}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (item.membersJoined / item.maxMembers) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.membersText}>
              {item.membersJoined}/{item.maxMembers} joined
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const sortLabel = SORT_OPTIONS.find((s) => s.key === sortBy)?.label ?? 'Sort';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.bell}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors['on-surface-variant']}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color={colors['primary-container']} />}
        </View>
        {/* Sort Button */}
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
          <Text style={styles.sortBtnText}>⚙️ {sortLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortMenuItem, sortBy === opt.key && styles.sortMenuItemActive]}
              onPress={() => handleSortChange(opt.key)}
            >
              <Text style={[styles.sortMenuText, sortBy === opt.key && styles.sortMenuTextActive]}>
                {opt.label}
              </Text>
              {sortBy === opt.key && <Text style={styles.sortMenuCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category Chips */}
      <View style={styles.categoriesScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
            onPress={() => handleCategoryChange(cat)}
          >
            <Text style={[styles.categoryChipText, activeCategory === cat && styles.categoryChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors['primary-container']} />
        </View>
      ) : (
        <FlatList
          data={filteredDeals}
          renderItem={renderDeal}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors['primary-container']]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors['primary-container']} style={{ marginVertical: spacing.md }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>{t('search.noResults')}</Text>
              <Text style={styles.emptyHint}>{t('search.noResultsHint')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 24, fontWeight: '700',
    color: colors['on-background'],
  },
  bell: { fontSize: 24 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    gap: spacing.sm, marginBottom: spacing.sm,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, height: 44,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16,
    color: colors['on-surface'],
  },
  sortBtn: {
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, height: 44, justifyContent: 'center',
  },
  sortBtnText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors['on-surface'] },
  sortMenu: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    backgroundColor: colors['surface-container-lowest'], borderRadius: borderRadius.lg,
    ...shadows.card, overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
  },
  sortMenuItemActive: { backgroundColor: colors['primary-container'] },
  sortMenuText: { ...typography['body-md'], color: colors['on-surface'] },
  sortMenuTextActive: { color: colors.white, fontWeight: '700' },
  sortMenuCheck: { color: colors.white, fontWeight: '700' },
  categoriesScroll: {
    flexDirection: 'row', paddingHorizontal: spacing.md,
    gap: spacing.sm, marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors['surface-container'],
  },
  categoryChipActive: { backgroundColor: colors['primary-container'] },
  categoryChipText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors['on-surface'] },
  categoryChipTextActive: { color: colors.white, fontWeight: '700' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  dealCard: {
    flexDirection: 'row', backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.sm,
    ...shadows.card,
  },
  dealThumbnail: { width: 80, height: 80, borderRadius: borderRadius.md },
  thumbnailPlaceholder: {
    width: 80, height: 80, borderRadius: borderRadius.md,
    backgroundColor: colors['surface-container-high'], alignItems: 'center', justifyContent: 'center',
  },
  thumbnailEmoji: { fontSize: 32 },
  savedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealInfo: { flex: 1, marginLeft: spacing.sm, justifyContent: 'space-between' },
  dealTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  dealCategoryChip: {
    backgroundColor: colors['secondary-container'], paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: borderRadius.sm, ...typography['label-sm'], color: colors['on-secondary-container'],
  },
  dealDistance: { ...typography['label-sm'], color: colors['on-surface-variant'] },
  dealTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors['on-surface'],
    marginBottom: 4, lineHeight: 18,
  },
  dealPriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dealGroupPrice: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 16, fontWeight: '800',
    color: colors['primary-container'],
  },
  dealOriginalPrice: {
    fontFamily: 'Inter_400Regular', fontSize: 12,
    color: colors['on-surface-variant'], textDecorationLine: 'line-through',
  },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  progressBarWrap: {
    flex: 1, height: 4, backgroundColor: colors['surface-container-high'],
    borderRadius: 2,
  },
  progressFill: { height: '100%', backgroundColor: colors['primary-container'], borderRadius: 2 },
  membersText: { ...typography['label-sm'], color: colors['on-surface-variant'] },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, color: colors['on-surface-variant'] },
  emptyHint: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
    marginTop: spacing.xs,
  },
});
