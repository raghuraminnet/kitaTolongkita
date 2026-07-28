import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DealCard, CategoryChip } from '../../components';
import { colors, typography, spacing } from '../../theme';
import { dealsApi } from '../../api/client';
import type { Deal } from '../../api/client';

const CATEGORIES = [
  'All',
  'Food',
  'Electronics',
  'Fashion',
  'Home',
  'Beauty',
  'Sports',
  'Drinks',
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDeals = useCallback(async () => {
    try {
      const params: Record<string, string | number> = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      const res = await dealsApi.search(params);
      setDeals(res.items);
    } catch (err) {
      console.warn('Failed to load deals', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDeals();
  };

  const formatCountdown = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const renderDeal = ({ item }: { item: Deal }) => (
    <View style={styles.dealItem}>
      <DealCard
        title={item.title}
        price={`RM${item.groupPrice.toFixed(2)}`}
        originalPrice={`RM${item.originalPrice.toFixed(2)}`}
        location={item.pickupLocation}
        countdown={formatCountdown(item.deadline)}
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
        <View>
          <Text style={styles.greeting}>Selamat Datang 👋</Text>
          <Text style={styles.headerTitle}>KitaTolongKita</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors['primary-container']} />
        }
      >
        {/* Hero Banner */}
        <TouchableOpacity style={styles.heroBanner} activeOpacity={0.9}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Gotong Royong{'\n'}Lebih Jimat! 🎉
            </Text>
            <Text style={styles.heroSubtitle}>
              Join group buys and save up to 50%
            </Text>
          </View>
          <Text style={styles.heroEmoji}>🛒</Text>
        </TouchableOpacity>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              label={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              style={styles.categoryChip}
            />
          ))}
        </ScrollView>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Hot Deals</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>

        {/* Deal List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading deals...</Text>
          </View>
        ) : deals.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No deals found</Text>
          </View>
        ) : (
          <FlatList
            data={deals}
            renderItem={renderDeal}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.dealList}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  greeting: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
  },
  headerTitle: {
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    color: colors['primary-container'],
    lineHeight: 32,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors['surface-container'],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors['primary-container'],
    borderRadius: 20,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 32,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400',
    color: colors['on-primary'],
    opacity: 0.9,
  },
  heroEmoji: {
    fontSize: 56,
    marginLeft: spacing.sm,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryChip: {
    marginRight: spacing.sm,
  },
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
    color: colors['on-background'],
  },
  seeAll: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: colors['primary-container'],
  },
  dealList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  dealItem: {
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors['on-surface-variant'],
  },
});
