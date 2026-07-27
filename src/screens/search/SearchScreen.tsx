import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DealCard } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { dealsApi } from '../../api/client';
import type { Deal } from '../../api/client';

const MOCK_DEALS: Deal[] = [
  { id: '1', title: 'Aneka Kuih Muih — Premium Ramadan Set A', description: '', category: 'Food', originalPrice: 38, groupPrice: 25, minMembers: 50, maxMembers: 100, membersJoined: 42, deadline: new Date(Date.now() + 216000000).toISOString(), pickupLocation: 'Kuala Lumpur', imageUrls: [], status: 'Active', organizerName: 'Makcik Ros', createdAt: new Date().toISOString() },
  { id: '2', title: 'Wireless Earbuds Pro — Noise Cancelling', description: '', category: 'Electronics', originalPrice: 149, groupPrice: 89, minMembers: 30, maxMembers: 80, membersJoined: 78, deadline: new Date(Date.now() + 108000000).toISOString(), pickupLocation: 'Petaling Jaya', imageUrls: [], status: 'Active', organizerName: 'TechDeals MY', createdAt: new Date().toISOString() },
  { id: '3', title: 'Malaysian Batik — Limited Edition 2024', description: '', category: 'Fashion', originalPrice: 99, groupPrice: 65, minMembers: 20, maxMembers: 50, membersJoined: 15, deadline: new Date(Date.now() + 324000000).toISOString(), pickupLocation: 'Shah Alam', imageUrls: [], status: 'Active', organizerName: 'Batik Heritage', createdAt: new Date().toISOString() },
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => { loadDeals(); }, []);

  const loadDeals = async () => {
    try {
      const result = await dealsApi.search({ SortBy: 'Newest' });
      setDeals(result.items ?? MOCK_DEALS);
    } catch {
      setDeals(MOCK_DEALS);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await dealsApi.search({ search: query });
      setDeals(result.items ?? []);
    } catch {
      setDeals(MOCK_DEALS.filter(d => d.title.toLowerCase().includes(query.toLowerCase())));
    } finally {
      setSearching(false);
    }
  };

  const CATEGORIES = ['All', 'Food', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Drinks'];
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredDeals = activeCategory === 'All'
    ? deals
    : deals.filter(d => d.category === activeCategory);

  const renderDeal = ({ item }: { item: Deal }) => (
    <View style={styles.dealItem}>
      <DealCard
        title={item.title}
        price={`RM ${item.groupPrice.toFixed(0)}`}
        originalPrice={`RM ${item.originalPrice.toFixed(0)}`}
        location={item.pickupLocation}
        countdown={getCountdown(item.deadline)}
        membersJoined={item.membersJoined}
        membersTarget={item.maxMembers}
        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
      />
    </View>
  );

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
            placeholder="Search deals..."
            placeholderTextColor={colors['on-surface-variant']}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => navigation.navigate('SearchFilters')}
        >
          <Text style={styles.filterBtnText}>⚙️ Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <View style={styles.categoriesScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.categoryChipText, activeCategory === cat && styles.categoryChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors['primary-container']} /></View>
      ) : (
        <FlatList
          data={filteredDeals}
          renderItem={renderDeal}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No deals found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

function getCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${Math.floor((diff % 3600000) / 60000)}m`;
}

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
    gap: spacing.sm, marginBottom: spacing.md,
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
  filterBtn: {
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, height: 44, justifyContent: 'center',
  },
  filterBtnText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface'] },
  categoriesScroll: {
    flexDirection: 'row', paddingHorizontal: spacing.md,
    gap: spacing.sm, marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors['surface-container'],
  },
  categoryChipActive: { backgroundColor: colors['primary-container'] },
  categoryChipText: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: colors['on-surface'],
  },
  categoryChipTextActive: { color: colors.white, fontWeight: '700' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  dealItem: { marginBottom: spacing.sm },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyText: {
    fontFamily: 'Inter_400Regular', fontSize: 16, color: colors['on-surface-variant'],
  },
});
