import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Bell, MapPin, Search, ChevronDown, Sparkles, SlidersHorizontal, Flame, Package, LayoutGrid, List, Zap } from 'lucide-react-native';
import { DealCard, CategoryChip, SkeletonCard } from '../../components';
import { typography, spacing, borderRadius, shadows, DISPLAY_FONT, BODY_FONT } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { dealsApi } from '../../api/client';
import type { Deal } from '../../api/client';

const CATEGORIES = ['All', 'Food', 'Groceries', 'Household', 'Electronics', 'Fashion', 'Drinks'];
const PAGE_SIZE = 20;

const STORY_HIGHLIGHTS = [
  { id: 'story-1', title: 'Raub Durian', organizer: 'Uncle Tan', avatar: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80', dealId: 'drop-1' },
  { id: 'story-2', title: 'Cameron Veg', organizer: 'GreenPastures', avatar: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=120&q=80', dealId: 'drop-2' },
  { id: 'story-3', title: 'TTDI Kuih', organizer: 'Kak Siti', avatar: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=120&q=80', dealId: 'drop-3' },
  { id: 'story-4', title: 'Bulk Tech', organizer: 'TechPals', avatar: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=120&q=80', dealId: 'drop-4' },
  { id: 'story-5', title: 'Pasar Segar', organizer: 'Kelang Fresh', avatar: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80', dealId: 'drop-1' },
];

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
    imageUrls: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'],
    status: 'Active',
    organizerName: 'Uncle Tan Orchards',
    createdAt: new Date().toISOString(),
    likeCount: 124,
    upvoteCount: 89,
    halalStatus: 'Vegetarian',
    state: 'Kuala Lumpur',
    district: 'Bangsar',
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
    halalStatus: 'Vegetarian',
    state: 'Selangor',
    district: 'Petaling Jaya',
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
    halalStatus: 'MuslimOwned',
    state: 'Kuala Lumpur',
    district: 'TTDI',
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
    halalStatus: 'NotApplicable',
    state: 'Kuala Lumpur',
    district: 'Damansara',
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
    <View style={viewMode === 'grid' ? localStyles.dealGridItem : localStyles.dealItem}>
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
        imageUrl={item.imageUrls?.[0] || (item as any).imageUrl}
        isSaved={item.isSaved}
        halalStatus={item.halalStatus}
        state={item.state}
        layout={viewMode}
        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
      />
    </View>
  );

  const localStyles = StyleSheet.create({
    dealItem: {
      marginBottom: 6,
    },
    dealGridItem: {
      flex: 0.5,
      paddingHorizontal: 3,
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
      ...shadows['card-active'],
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
    heroIconWrapper: {
      position: 'absolute',
      right: 14,
      bottom: 14,
      opacity: 0.9,
    },
    categoriesSection: {
      marginBottom: 10,
    },
    categoriesScrollContent: {
      paddingHorizontal: spacing.md,
      gap: 6,
    },
    /* Stories Highlights Reel */
    storiesContainer: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      marginBottom: 10,
    },
    storiesScroll: {
      paddingHorizontal: spacing.md,
      gap: 12,
    },
    storyItem: {
      alignItems: 'center',
      width: 62,
    },
    storyRing: {
      width: 54,
      height: 54,
      borderRadius: 27,
      borderWidth: 2,
      padding: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    storyAvatar: {
      width: '100%',
      height: '100%',
      borderRadius: 25,
    },
    storyTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 10.5,
      textAlign: 'center',
    },
    /* Compact Gotong-Royong Highlight Banner */
    compactHeroBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.md,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      borderWidth: 1,
    },
    compactHeroTag: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    compactHeroContent: {
      flex: 1,
    },
    compactHeroTitle: {
      fontFamily: DISPLAY_FONT,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    compactHeroSubtitle: {
      fontFamily: BODY_FONT,
      fontSize: 11,
      marginTop: 1,
    },
    compactHeroCta: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
      marginLeft: 8,
    },
    compactHeroCtaText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      color: '#ffffff',
    },
    /* Section Header with View Mode Switcher */
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginBottom: 8,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontFamily: DISPLAY_FONT,
      fontSize: 16.5,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    dealCountBadge: {
      paddingHorizontal: 7,
      paddingVertical: 1.5,
      borderRadius: borderRadius.full,
    },
    dealCountText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 10.5,
      fontWeight: '700',
    },
    sectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    viewToggleContainer: {
      flexDirection: 'row',
      borderRadius: borderRadius.sm,
      padding: 2,
    },
    viewToggleBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    seeAll: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
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
          <Search size={17} color={colors['on-surface-variant']} strokeWidth={2.2} style={{ marginRight: 8 }} />
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

      {/* Story Highlights Reel — Instagram Creator Style */}
      <View style={styles.storiesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesScroll}
        >
          {STORY_HIGHLIGHTS.map((story) => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={() => navigation.navigate('DealDetail', { dealId: story.dealId })}
              activeOpacity={0.8}
            >
              <View style={[styles.storyRing, { borderColor: colors.primary }]}>
                <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
              </View>
              <Text style={[styles.storyTitle, { color: colors['on-surface'] }]} numberOfLines={1}>
                {story.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* High-Density Community Highlight Ribbon */}
      <TouchableOpacity
        style={[
          styles.compactHeroBanner,
          {
            backgroundColor: isDark ? colors['surface-container'] : colors['primary-subtle'],
            borderColor: isDark ? 'rgba(255, 122, 69, 0.25)' : 'rgba(255, 87, 34, 0.2)',
          },
        ]}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('DealDetail', { dealId: 'drop-1' })}
      >
        <View style={styles.compactHeroTag}>
          <Zap size={14} color="#ffffff" strokeWidth={2.5} />
        </View>
        <View style={styles.compactHeroContent}>
          <Text style={[styles.compactHeroTitle, { color: colors['on-surface'] }]} numberOfLines={1}>
            Bangsar Hub Gotong-Royong Aktif
          </Text>
          <Text style={[styles.compactHeroSubtitle, { color: colors['on-surface-variant'] }]} numberOfLines={1}>
            Jimat 50% untuk Musang King & hasil tani Pahang
          </Text>
        </View>
        <View style={[styles.compactHeroCta, { backgroundColor: colors['primary-container'] }]}>
          <Text style={styles.compactHeroCtaText}>Sertai →</Text>
        </View>
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

      {/* Section Header with View Switcher */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Flame size={18} color={colors.primary} strokeWidth={2.5} />
          <Text style={[styles.sectionTitle, { color: colors['on-background'] }]}>
            Tawaran Komuniti
          </Text>
          <View style={[styles.dealCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
            <Text style={[styles.dealCountText, { color: colors['on-surface-variant'] }]}>
              {deals.length}
            </Text>
          </View>
        </View>

        <View style={styles.sectionActions}>
          {/* View Mode Toggle: Grid vs List */}
          <View style={[styles.viewToggleContainer, { backgroundColor: isDark ? colors['surface-container'] : '#F1F5F9' }]}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'grid' && { backgroundColor: colors['primary-container'] }]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.7}
            >
              <LayoutGrid size={15} color={viewMode === 'grid' ? '#ffffff' : colors['on-surface-variant']} strokeWidth={2.2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && { backgroundColor: colors['primary-container'] }]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <List size={15} color={viewMode === 'list' ? '#ffffff' : colors['on-surface-variant']} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={[styles.seeAll, { color: colors['primary-container'] }]}>
              Semua →
            </Text>
          </TouchableOpacity>
        </View>
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
        key={viewMode}
        data={deals}
        renderItem={renderDeal}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={[
          styles.flatListContent,
          viewMode === 'grid' && { paddingHorizontal: spacing.sm },
        ]}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
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
