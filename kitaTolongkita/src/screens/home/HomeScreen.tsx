import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Bell } from 'lucide-react-native';
import { DealCard, CategoryChip, SkeletonCard, EmptyState } from '../../components';
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
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

const SKELETON_COUNT = Array(4).fill(null);

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

  const loadDeals = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string | number> = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      const res = await dealsApi.search(params);
      setDeals(res.items ?? []);
    } catch (err) {
      setError('Could not load deals. Pull to retry.');
      console.warn('Failed to load deals', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    loadDeals();
  }, [loadDeals]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDeals();
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
        likes={item.likes ?? 0}
        upvotes={item.upvotes ?? 0}
        organizerName={item.organizerName}
        isSaved={item.isSaved}
        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
      />
    </View>
  );

  const renderSkeletons = () =>
    SKELETON_COUNT.map((_, i) => (
      <View key={i} style={localStyles.dealItem}>
        <SkeletonCard />
      </View>
    ));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors['primary-container']}
          />
        }
      >
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
          <Text style={[styles.sectionTitle, { color: colors['on-background'] }]}>
            🔥 Hot Deals
          </Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors['primary-container'] }]}>
              See All →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Deal List */}
        <View style={styles.dealList}>
          {loading ? (
            renderSkeletons()
          ) : error && deals.length === 0 ? (
            <EmptyState
              icon="⚠️"
              title="Couldn't load deals"
              message={error}
              actionLabel="Try Again"
              onAction={handleRefresh}
            />
          ) : deals.length === 0 ? (
            <EmptyState
              icon="🛒"
              title="No deals yet"
              message={`Be the first to post a deal${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}!`}
              actionLabel="Post a Deal"
              onAction={() => navigation.navigate('Post')}
            />
          ) : (
            <FlatList
              data={deals}
              renderItem={renderDeal}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
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
  scrollContent: { paddingBottom: 100 },
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
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryChip: { marginRight: spacing.sm },
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
  dealList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  dealItem: { marginBottom: spacing.sm },
});

const localStyles = StyleSheet.create({
  dealItem: { marginBottom: spacing.sm },
});
