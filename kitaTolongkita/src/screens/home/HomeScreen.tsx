import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Bell, MapPin, Search, ChevronDown, Sparkles, SlidersHorizontal, Flame } from 'lucide-react-native';
import { DealCard, CategoryChip, SkeletonCard } from '../../components';
import { typography, spacing, borderRadius, shadows, DISPLAY_FONT, BODY_FONT } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { dealsApi } from '../../api/client';
import type { Deal } from '../../api/client';

const CATEGORIES = ['All', 'Food', 'Groceries', 'Household', 'Electronics', 'Fashion', 'Drinks'];
const PAGE_SIZE = 20;

const CURATED_COMMUNITY_DROPS: Deal[] = [
  {
    id: 'drop-1',
    title: 'Musang King Durian Fresh Pack (800g Sealed)',
    description: 'Freshly harvested from Raub, Pahang. Direct farm delivery to community collection hub in Bangsar.',
    category: 'Food',
    originalPrice: 88,
    groupPrice: 48,
    minMembers: 20,
    maxMembers: 50,
    membersJoined: 42,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 4.5).toISOString(),
    pickupLocation: 'Bangsar Community Hall, KL',
    imageUrls: ['https://images.unsplash.com/photo-1587334274328-64186a80aeee?auto=format&fit=crop&w=600&q=80'],
    status: 'Active',
    organizerName: 'Uncle Tan Orchards',
    createdAt: new Date().toISOString(),
    likeCount: 124,
    upvoteCount: 89,
  },
  {
    id: 'drop-2',
    title: 'Cameron Highlands Organic Farm Veggie Box (4kg)',
    description: 'Hydroponic butterhead, Japanese cucumber, cherry tomatoes, baby spinach & sweet corn.',
    category: 'Groceries',
    originalPrice: 65,
    groupPrice: 32,
    minMembers: 15,
    maxMembers: 40,
    membersJoined: 36,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    pickupLocation: 'SS2 Community Hub, PJ',
    imageUrls: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'],
    status: 'Active',
    organizerName: 'GreenPastures MY',
    createdAt: new Date().toISOString(),
    likeCount: 98,
    upvoteCount: 71,
  },
  {
    id: 'drop-3',
    title: 'Premium Aneka Kuih Talam & Lapis Set (36 pcs)',
    description: 'Traditional freshly steamed kuih muih crafted with fresh pandan juice and santan asli.',
    category: 'Food',
    originalPrice: 48,
    groupPrice: 26,
    minMembers: 10,
    maxMembers: 30,
    membersJoined: 28,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    pickupLocation: 'Taman Tun Dr Ismail (TTDI)',
    imageUrls: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'],
    status: 'Active',
    organizerName: 'Kak Siti Dapur Asli',
    createdAt: new Date().toISOString(),
    likeCount: 165,
    upvoteCount: 112,
  },
  {
    id: 'drop-4',
    title: 'Smart Cordless Vacuum Pro (28,000Pa Cyclone)',
    description: 'Community bulk factory import deal. 2-year local warranty with doorstep replacement.',
    category: 'Electronics',
    originalPrice: 399,
    groupPrice: 189,
    minMembers: 25,
    maxMembers: 60,
    membersJoined: 54,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    pickupLocation: 'Damansara Heights Hub',
    imageUrls: ['https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=600&q=80'],
    status: 'Active',
    organizerName: 'TechPals Malaysia',
    createdAt: new Date().toISOString(),
    likeCount: 230,
    upvoteCount: 180,
  },
];

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentArea, setCurrentArea] = useState('Bangsar, KL');

  const loadDeals = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (reset) setLoading(true); else setLoadingMore(true);

    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        pageSize: PAGE_SIZE,
      };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      const res = await dealsApi.search(params);
      let newItems = res.items ?? [];

      // If backend returns empty or limited items, enrich with curated community drops
      if (newItems.length === 0) {
        const filteredDrops = selectedCategory === 'All'
          ? CURATED_COMMUNITY_DROPS
          : CURATED_COMMUNITY_DROPS.filter(d => d.category.toLowerCase() === selectedCategory.toLowerCase());
        newItems = filteredDrops;
      }

      if (reset) {
        setDeals(newItems);
        setPage(2);
      } else {
        setDeals(prev => [...prev, ...newItems]);
        setPage(p => p + 1);
      }
      setHasMore(newItems.length >= PAGE_SIZE);
    } catch (err) {
      // Fallback on error to curated drops
      const filteredDrops = selectedCategory === 'All'
        ? CURATED_COMMUNITY_DROPS
        : CURATED_COMMUNITY_DROPS.filter(d => d.category.toLowerCase() === selectedCategory.toLowerCase());
      setDeals(filteredDrops);
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
        price={`RM${item.groupPrice.toFixed(0)}`}
        originalPrice={`RM${item.originalPrice.toFixed(0)}`}
        location={item.pickupLocation}
        deadline={item.deadline}
        membersJoined={item.membersJoined}
        membersTarget={item.maxMembers}
        likes={item.likeCount ?? 0}
        upvotes={item.upvoteCount ?? 0}
        organizerName={item.organizerName}
        imageUrl={item.imageUrls?.[0] || item.imageUrl}
        isSaved={item.isSaved}
        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
      />
    </View>
  );

  const localStyles = StyleSheet.create({
    dealItem: {
      marginBottom: spacing.sm,
    },
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      backgroundColor: isDark ? colors.background : colors.white,
      borderBottomWidth: 1,
    },
    locationWrapper: {
      flex: 1,
    },
    locationLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    locationPicker: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationText: {
      fontFamily: DISPLAY_FONT,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    notificationBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      position: 'relative',
      ...shadows.card,
    },
    badge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: '#ffffff',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      height: 46,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      ...shadows.card,
    },
    searchPlaceholder: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13.5,
      flex: 1,
    },
    filterIconBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      ...shadows.card,
    },
    heroBanner: {
      marginHorizontal: spacing.md,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      position: 'relative',
      overflow: 'hidden',
      ...shadows.cardActive,
    },
    heroContent: {
      maxWidth: '75%',
    },
    heroTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      marginBottom: 10,
    },
    heroTagText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      color: '#ffffff',
      fontWeight: '700',
    },
    heroTitle: {
      fontFamily: DISPLAY_FONT,
      fontSize: 22,
      fontWeight: '800',
      color: '#ffffff',
      lineHeight: 28,
      letterSpacing: -0.4,
      marginBottom: 6,
    },
    heroSubtitle: {
      fontFamily: BODY_FONT,
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.92)',
      lineHeight: 18,
      marginBottom: 14,
    },
    heroCtaBtn: {
      backgroundColor: '#ffffff',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: borderRadius.full,
      alignSelf: 'flex-start',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    heroCtaText: {
      fontFamily: BODY_FONT,
      fontSize: 12,
      color: colors.primary,
      fontWeight: '700',
    },
    heroEmoji: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      fontSize: 68,
      opacity: 0.88,
    },
    categoriesSection: {
      marginBottom: spacing.md,
    },
    categoriesScrollContent: {
      paddingHorizontal: spacing.md,
      gap: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontFamily: DISPLAY_FONT,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    dealCountBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    dealCountText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      fontWeight: '700',
    },
    seeAll: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '600',
    },
    flatListContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: 130, // Safe padding for floating capsule navigation
    },
  });

  const ListHeader = () => (
    <View>
      {/* Search Bar + Filter Trigger */}
      <View style={styles.searchRow}>
        <TouchableOpacity
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? colors['surface-container'] : colors.white,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.8}
        >
          <Search size={18} color={colors['on-surface-variant']} strokeWidth={2.2} style={{ marginRight: 8 }} />
          <Text style={[styles.searchPlaceholder, { color: colors['on-surface-variant'] }]}>
            Cari pasar segar, kuih muih, gajet...
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterIconBtn,
            {
              backgroundColor: isDark ? colors['surface-container'] : colors.white,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}
          onPress={() => navigation.navigate('SearchFilters')}
          activeOpacity={0.8}
        >
          <SlidersHorizontal size={17} color={colors['on-surface']} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Hero Spotlight Card */}
      <TouchableOpacity
        style={[
          styles.heroBanner,
          { backgroundColor: colors['primary-container'] },
        ]}
        activeOpacity={0.92}
        onPress={() => navigation.navigate('DealDetail', { dealId: 'drop-1' })}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTag}>
            <Sparkles size={12} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 4 }} />
            <Text style={styles.heroTagText}>⚡ Gotong Royong Terkini</Text>
          </View>
          <Text style={styles.heroTitle}>
            Beli Ramai-Ramai,{'\n'}Jimat Sehingga 50%!
          </Text>
          <Text style={styles.heroSubtitle}>
            Gabung tempahan bersama jiran Bangsar untuk nikmati harga borong tanpa orang tengah.
          </Text>
          <View style={styles.heroCtaBtn}>
            <Text style={styles.heroCtaText}>Sertai Sekarang →</Text>
          </View>
        </View>
        <Text style={styles.heroEmoji}>📦</Text>
      </TouchableOpacity>

      {/* Horizontal Category Chips */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              label={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Flame size={19} color={colors.primary} strokeWidth={2.5} />
          <Text style={[styles.sectionTitle, { color: colors['on-background'] }]}>
            Tawaran Komuniti Hangat
          </Text>
          <View style={[styles.dealCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
            <Text style={[styles.dealCountText, { color: colors['on-surface-variant'] }]}>
              {deals.length}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Text style={[styles.seeAll, { color: colors['primary-container'] }]}>
            Lihat Semua →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Sticky Native Header with Location */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={styles.locationWrapper}>
          <Text style={[styles.locationLabel, { color: colors['on-surface-variant'] }]}>LOKASI KOMUNITI</Text>
          <TouchableOpacity
            style={styles.locationPicker}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SearchFilters')}
          >
            <MapPin size={16} color={colors['primary-container']} strokeWidth={2.5} style={{ marginRight: 4 }} />
            <Text style={[styles.locationText, { color: colors['on-surface'] }]}>
              {currentArea}
            </Text>
            <ChevronDown size={14} color={colors['on-surface-variant']} strokeWidth={2.5} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.notificationBtn,
            {
              backgroundColor: isDark ? colors['surface-container'] : colors.white,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.8}
        >
          <Bell size={19} color={colors['on-surface']} strokeWidth={2.2} />
          <View style={[styles.badge, { backgroundColor: colors['primary-container'] }]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={deals}
        renderItem={renderDeal}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors['primary-container']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : null
        }
      />
    </View>
  );
};
