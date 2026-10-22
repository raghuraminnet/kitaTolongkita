import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Avatar, Button } from '../../components';
import { typography, spacing, borderRadius, shadows, DISPLAY_FONT, BODY_FONT } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { authApi, dealsApi, clearTokens, getAccessToken, followApi, repostsApi, lookupsApi, ratingsApi } from '../../api/client';
import { useAuth } from '../../api/authContext';
import type { User } from '../../api/client';
import type { Deal } from '../../api/client';
import {
  Settings,
  Bookmark,
  Flag,
  User as UserIcon,
  MapPin,
  Bell,
  MessageSquare,
  ChevronRight,
  Award,
  Globe,
  Share2,
  ShieldCheck,
  Sparkles,
  Package,
  Repeat,
  ShoppingBag,
  Star,
} from 'lucide-react-native';

const TABS = ['Deals', 'Reposts', 'LookUps', 'Ratings'];

export const ProfileScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 150 },
    coverBanner: {
      height: 120,
      width: '100%',
      position: 'relative',
      backgroundColor: colors['primary-container'],
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: 10,
      paddingBottom: 12,
    },
    coverTopNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    coverTitle: {
      fontFamily: DISPLAY_FONT,
      fontSize: 20,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: -0.3,
    },
    coverNavActions: {
      flexDirection: 'row',
      gap: 8,
    },
    coverActionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0, 0, 0, 0.28)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileCard: {
      backgroundColor: isDark ? colors['surface-container'] : colors.white,
      marginHorizontal: spacing.md,
      borderRadius: borderRadius.xl,
      marginTop: -32,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      ...shadows.card,
    },
    avatarWrapper: {
      alignSelf: 'center',
      marginTop: -42,
      position: 'relative',
      borderRadius: 48,
      borderWidth: 3,
      borderColor: isDark ? '#05070B' : '#ffffff',
      ...shadows.floating,
    },
    avatarVerifiedBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
    },
    profileInfo: {
      alignItems: 'center',
      marginTop: 8,
    },
    userName: {
      fontFamily: DISPLAY_FONT,
      fontSize: 20,
      fontWeight: '800',
      color: colors['on-background'],
      letterSpacing: -0.4,
    },
    userHandle: {
      fontFamily: BODY_FONT,
      fontSize: 13,
      color: colors['on-surface-variant'],
      marginTop: 2,
    },
    badgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(45, 212, 191, 0.15)' : '#E8F8F2',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    roleBadgeText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      color: colors.secondary,
      fontWeight: '700',
      marginLeft: 4,
    },
    contributorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 122, 69, 0.2)' : '#FFF3ED',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    contributorBadgeText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      color: colors.primary,
      fontWeight: '700',
      marginLeft: 4,
    },
    bioText: {
      fontFamily: BODY_FONT,
      fontSize: 12.5,
      color: colors['on-surface'],
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: spacing.sm,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: {
      fontFamily: BODY_FONT,
      fontSize: 12,
      color: colors['on-surface-variant'],
      marginLeft: 4,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: spacing.md,
      width: '100%',
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    actionBtnText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
      fontWeight: '700',
      marginLeft: 4,
    },
    followStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      paddingTop: spacing.md,
    },
    followStatItem: { alignItems: 'center', minWidth: 60 },
    followStatValue: {
      fontFamily: DISPLAY_FONT,
      fontSize: 17,
      fontWeight: '800',
      color: colors['on-surface'],
      letterSpacing: -0.3,
    },
    followStatLabel: {
      fontFamily: BODY_FONT,
      fontSize: 11,
      fontWeight: '500',
      color: colors['on-surface-variant'],
      marginTop: 2,
    },
    verifiedBadge: {
      backgroundColor: colors['secondary-container'],
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    verifiedText: {
      fontSize: 11,
      color: colors['on-secondary-container'],
      fontWeight: '700',
    },
    tabsContainer: { marginHorizontal: spacing.md, marginBottom: spacing.sm, marginTop: 4 },
    tabsScroll: { flexDirection: 'row', gap: 6 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: borderRadius.full,
      backgroundColor: isDark ? colors['surface-container'] : colors['surface-container-lowest'],
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    tabActive: {
      backgroundColor: colors['primary-container'],
      borderColor: colors['primary-container'],
    },
    tabText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
      fontWeight: '600',
      color: colors['on-surface-variant'],
    },
    tabTextActive: { color: colors.white },
    tabContent: { marginHorizontal: spacing.md, minHeight: 120 },
    tabLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
    tabLoadingText: { color: colors['on-surface-variant'] },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
    emptyText: { color: colors['on-surface-variant'], fontSize: 14 },
    dealCard: {
      flexDirection: 'row', backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.lg, marginBottom: spacing.sm, overflow: 'hidden',
    },
    dealImage: { width: 80, height: 80 },
    dealInfo: { flex: 1, padding: spacing.sm, justifyContent: 'center' },
    dealTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors['on-surface'] },
    dealPrice: { fontSize: 13, color: colors['primary-container'], fontWeight: '700', marginTop: 2 },
    dealMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    dealCategory: { fontSize: 11, color: colors['on-surface-variant'] },
    dealMembers: { fontSize: 11, color: colors['on-surface-variant'] },
    repostBanner: {
      backgroundColor: colors.surface, paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    repostLabel: { fontSize: 11, color: colors['on-surface-variant'] },
    lookupCard: {
      backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
    },
    lookupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    lookupStatusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    lookupStatusText: {},
    bookingId: { fontFamily: 'monospace', fontSize: 12, color: colors['on-surface-variant'], fontWeight: '700' },
    lookupMeta: { fontSize: 12, color: colors['on-surface-variant'], marginTop: 4 },
    ratingCard: {
      backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
    },
    ratingDealTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors['on-surface'] },
    ratingContributor: { fontSize: 12, color: colors['on-surface-variant'], marginTop: 2 },
    ratingStars: { flexDirection: 'row', marginTop: spacing.xs },
    star: { fontSize: 16, color: colors.tertiary },
    menuSection: {
      marginHorizontal: spacing.md,
      backgroundColor: isDark ? colors['surface-container'] : colors.white,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      marginTop: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      ...shadows.card,
    },
    menuItem: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg, borderBottomWidth: 1,
      borderBottomColor: colors['outline-variant'],
    },
    menuIcon: { fontSize: 20, marginRight: spacing.md },
    menuLabel: {
      flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16,
      color: colors['on-surface'],
    },
    menuArrow: {
      fontFamily: 'Inter_400Regular', fontSize: 20,
      color: colors['on-surface-variant'],
    },
    logoutSection: { marginHorizontal: spacing.md, marginTop: spacing.xl },
  });
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Deals');

  // Profile data
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [dealsCount, setDealsCount] = useState(0);
  const [repostCount, setRepostCount] = useState(0);
  const [lookupCount, setLookupCount] = useState(0);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);

  // Tab data
  const [myDeals, setMyDeals] = useState<Deal[]>([]);
  const [myReposts, setMyReposts] = useState<any[]>([]);
  const [myLookups, setMyLookups] = useState<any[]>([]);
  const [myRatings, setMyRatings] = useState<any[]>([]);

  // Loading states per tab
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  useEffect(() => {
    if (!loading) loadTabData(activeTab, true);
  }, [activeTab, loading]);

  const loadProfile = async () => {
    try {
      const token = await getAccessToken();
      if (!token) { setLoading(false); return; }
      const me = await authApi.getMe();
      setUser(me);
      const [ordersResult, myDealsResult] = await Promise.all([
        dealsApi.getOrders(1, 1),
        dealsApi.getMyDeals(1, 1),
      ]);
      setLookupCount(ordersResult.totalCount);
      setDealsCount(myDealsResult.totalCount);

      // Get follow counts
      try {
        const status = await followApi.getFollowStatus(me.id);
        setFollowerCount(status.followerCount);
        setFollowingCount(status.followingCount);
      } catch { /* not critical */ }
    } catch {
      // Token invalid or API down
    } finally {
      setLoading(false);
    }
  };

  // Pagination state per tab
  const [dealsPage, setDealsPage] = useState(1);
  const [hasMoreDeals, setHasMoreDeals] = useState(true);
  const [loadingMoreDeals, setLoadingMoreDeals] = useState(false);
  const [repostsPage, setRepostsPage] = useState(1);
  const [hasMoreReposts, setHasMoreReposts] = useState(true);
  const [loadingMoreReposts, setLoadingMoreReposts] = useState(false);
  const [lookupsPage, setLookupsPage] = useState(1);
  const [hasMoreLookups, setHasMoreLookups] = useState(true);
  const [loadingMoreLookups, setLoadingMoreLookups] = useState(false);

  const loadTabData = async (tab: string, reset = false) => {
    setTabLoading(reset);
    try {
      if (tab === 'Deals') {
        const page = reset ? 1 : dealsPage;
        const res = await dealsApi.getMyDeals(page);
        const items = res?.items ?? [];
        if (reset) { setMyDeals(items); setDealsPage(2); }
        else { setMyDeals(prev => [...(prev ?? []), ...items]); setDealsPage(p => p + 1); }
        setHasMoreDeals(items.length === (res?.pageSize ?? 20));
      } else if (tab === 'Reposts') {
        const page = reset ? 1 : repostsPage;
        const res: any = await repostsApi.getMyReposts(page);
        const items = res?.reposts ?? [];
        if (reset) { setMyReposts(items); setRepostsPage(2); }
        else { setMyReposts(prev => [...(prev ?? []), ...items]); setRepostsPage(p => p + 1); }
        setHasMoreReposts(items.length === 20);
      } else if (tab === 'LookUps') {
        const page = reset ? 1 : lookupsPage;
        const res: any = await lookupsApi.getMyLookups(undefined, page);
        const items = res?.lookups ?? [];
        if (reset) { setMyLookups(items); setLookupsPage(2); }
        else { setMyLookups(prev => [...(prev ?? []), ...items]); setLookupsPage(p => p + 1); }
        setHasMoreLookups(items.length === 20);
      } else if (tab === 'Ratings') {
        const page = reset ? 1 : lookupsPage;
        const res: any = await lookupsApi.getMyLookups('Delivered', page);
        const items = res?.lookups ?? [];
        if (reset) { setMyRatings(items); setLookupsPage(2); }
        else { setMyRatings(prev => [...(prev ?? []), ...items]); setLookupsPage(p => p + 1); }
        setHasMoreLookups(items.length === 20);
      }
    } catch {
      if (reset) {
        if (tab === 'Deals') setMyDeals([]);
        if (tab === 'Reposts') setMyReposts([]);
        if (tab === 'LookUps') setMyLookups([]);
        if (tab === 'Ratings') setMyRatings([]);
      }
    } finally {
      setTabLoading(false);
      setLoadingMoreDeals(false);
      setLoadingMoreReposts(false);
      setLoadingMoreLookups(false);
    }
  };

  const handleLoadMore = (tab: string) => {
    if (tab === 'Deals' && !hasMoreDeals && !loadingMoreDeals) return;
    if (tab === 'Reposts' && !hasMoreReposts && !loadingMoreReposts) return;
    if ((tab === 'LookUps' || tab === 'Ratings') && !hasMoreLookups && !loadingMoreLookups) return;
    if (tab === 'Deals') setLoadingMoreDeals(true);
    if (tab === 'Reposts') setLoadingMoreReposts(true);
    if (tab === 'LookUps' || tab === 'Ratings') setLoadingMoreLookups(true);
    loadTabData(tab, false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    await loadTabData(activeTab);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        },
      },
    ]);
  };

  const handleDealPress = (dealId: string) => {
    navigation.navigate('DealDetail', { dealId });
  };

  const handleRepostPress = (dealId: string) => {
    navigation.navigate('DealDetail', { dealId });
  };

  const menuItems = [
    { Icon: Bookmark, label: 'My Saves', onPress: () => navigation.navigate('MySaves') },
    { Icon: Flag, label: 'My Reports', onPress: () => navigation.navigate('MyReports') },
    { Icon: UserIcon, label: 'Edit Profile', onPress: () => navigation.navigate('ProfileSetup') },
    { Icon: MapPin, label: 'My Addresses', onPress: () => {} },
    { Icon: Bell, label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { Icon: MessageSquare, label: 'Chat Inbox', onPress: () => navigation.navigate('ChatInbox') },
    { Icon: Settings, label: 'Settings', onPress: () => navigation.navigate('Settings') },
  ];

  const TAB_ICONS: Record<string, any> = {
    Deals: Package,
    Reposts: Repeat,
    LookUps: ShoppingBag,
    Ratings: Star,
  };

  const renderTab = (tab: string) => {
    const isActive = activeTab === tab;
    const IconComp = TAB_ICONS[tab] || Package;
    return (
      <TouchableOpacity
        key={tab}
        onPress={() => setActiveTab(tab)}
        style={[styles.tab, isActive && styles.tabActive]}
        activeOpacity={0.8}
      >
        <IconComp
          size={14}
          color={isActive ? '#ffffff' : colors['on-surface-variant']}
          strokeWidth={2.2}
          style={{ marginRight: 5 }}
        />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
      </TouchableOpacity>
    );
  };

  const renderDealItem = ({ item }: { item: Deal }) => (
    <TouchableOpacity style={styles.dealCard} onPress={() => handleDealPress(item.id)}>
      {item.imageUrls && item.imageUrls[0] ? (
        <Image source={{ uri: item.imageUrls[0] }} style={styles.dealImage} />
      ) : (
        <View style={[styles.dealImage, { backgroundColor: colors['surface-container-highest'] }]}>
          <Text style={{ color: colors['on-surface-variant'] }}>📷</Text>
        </View>
      )}
      <View style={styles.dealInfo}>
        <Text style={styles.dealTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.dealPrice}>RM {item.groupPrice}</Text>
        <View style={styles.dealMeta}>
          <Text style={styles.dealCategory}>{item.category}</Text>
          <Text style={styles.dealMembers}>{item.membersJoined}/{item.minMembers} joined</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRepostItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.dealCard} onPress={() => handleRepostPress(item.dealId)}>
      <View style={styles.repostBanner}>
        <Text style={styles.repostLabel}>🔁 Reposted from @{item.organizerName}</Text>
      </View>
      {item.dealImageUrl ? (
        <Image source={{ uri: item.dealImageUrl }} style={styles.dealImage} />
      ) : (
        <View style={[styles.dealImage, { backgroundColor: colors['surface-container-highest'] }]} />
      )}
      <View style={styles.dealInfo}>
        <Text style={styles.dealTitle} numberOfLines={1}>{item.dealTitle}</Text>
        <Text style={styles.dealPrice}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderLookupItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.lookupCard}>
      <View style={styles.lookupHeader}>
        <View style={lookupStatusBadge(item.status, colors)}>
          <Text style={lookupStatusText(item.status, colors)}>{item.status}</Text>
        </View>
        <Text style={styles.bookingId}>{item.bookingId}</Text>
      </View>
      <Text style={styles.dealTitle}>{item.dealTitle}</Text>
      <Text style={styles.lookupMeta}>
        {item.quantity}x · RM {item.totalPrice} · {item.contributorName}
      </Text>
      {item.qrVerified && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✅ Verified Delivery</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderRatingItem = ({ item }: { item: any }) => (
    <View style={styles.ratingCard}>
      <Text style={styles.ratingDealTitle}>{item.dealTitle}</Text>
      <Text style={styles.ratingContributor}>by {item.contributorName}</Text>
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map(star => (
          <Text key={star} style={styles.star}>{star <= item.rating ? '★' : '☆'}</Text>
        ))}
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (tabLoading) {
      return (
        <View style={styles.tabLoading}>
          <Text style={styles.tabLoadingText}>Loading...</Text>
        </View>
      );
    }

    const TabFooter = () => {
      if (activeTab === 'Deals' && loadingMoreDeals) return <ActivityIndicator size="small" color={colors['primary-container']} style={{ paddingVertical: spacing.md }} />;
      if (activeTab === 'Reposts' && loadingMoreReposts) return <ActivityIndicator size="small" color={colors['primary-container']} style={{ paddingVertical: spacing.md }} />;
      if ((activeTab === 'LookUps' || activeTab === 'Ratings') && loadingMoreLookups) return <ActivityIndicator size="small" color={colors['primary-container']} style={{ paddingVertical: spacing.md }} />;
      return null;
    };

    if (activeTab === 'Deals') {
      if (!tabLoading && (!myDeals || myDeals.length === 0)) return <View style={styles.emptyState}><Text style={styles.emptyText}>You haven't posted any deals yet.</Text></View>;
      return <FlatList data={myDeals ?? []} renderItem={renderDealItem} keyExtractor={d => d.id} scrollEnabled onEndReached={() => handleLoadMore('Deals')} onEndReachedThreshold={0.5} ListFooterComponent={<TabFooter />} />;
    }
    if (activeTab === 'Reposts') {
      if (!tabLoading && (!myReposts || myReposts.length === 0)) return <View style={styles.emptyState}><Text style={styles.emptyText}>No reposts yet.</Text></View>;
      return <FlatList data={myReposts ?? []} renderItem={renderRepostItem} keyExtractor={r => r.repostId} scrollEnabled onEndReached={() => handleLoadMore('Reposts')} onEndReachedThreshold={0.5} ListFooterComponent={<TabFooter />} />;
    }
    if (activeTab === 'LookUps') {
      if (!tabLoading && (!myLookups || myLookups.length === 0)) return <View style={styles.emptyState}><Text style={styles.emptyText}>No group buy lookups yet.</Text></View>;
      return <FlatList data={myLookups ?? []} renderItem={renderLookupItem} keyExtractor={l => l.id} scrollEnabled onEndReached={() => handleLoadMore('LookUps')} onEndReachedThreshold={0.5} ListFooterComponent={<TabFooter />} />;
    }
    if (activeTab === 'Ratings') {
      if (!tabLoading && (!myRatings || myRatings.length === 0)) return <View style={styles.emptyState}><Text style={styles.emptyText}>No delivered orders to rate.</Text></View>;
      return <FlatList data={myRatings ?? []} renderItem={renderRatingItem} keyExtractor={r => r.id} scrollEnabled onEndReached={() => handleLoadMore('Ratings')} onEndReachedThreshold={0.5} ListFooterComponent={<TabFooter />} />;
    }
  };

  const displayUser = user;
  const username = displayUser?.email ? displayUser.email.split('@')[0] : 'ahmad_danial';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Cover Photo Backdrop Banner */}
        <View style={styles.coverBanner}>
          <View style={styles.coverTopNav}>
            <Text style={styles.coverTitle}>Profile Hub</Text>
            <View style={styles.coverNavActions}>
              <TouchableOpacity
                style={styles.coverActionBtn}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.8}
              >
                <Settings size={18} color="#ffffff" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Profile Card with Overlapping Avatar */}
        <View style={styles.profileCard}>
          {/* Overlapping Avatar */}
          <View style={styles.avatarWrapper}>
            <Avatar name={displayUser?.fullName ?? 'Ahmad Danial'} uri={displayUser?.avatarUrl} size={84} />
            <View style={styles.avatarVerifiedBadge}>
              <ShieldCheck size={14} color="#ffffff" strokeWidth={2.6} />
            </View>
          </View>

          {/* Profile Identity */}
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{displayUser?.fullName ?? 'Ahmad Danial'}</Text>
            <Text style={styles.userHandle}>@{username} · Bangsar Community Host</Text>

            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <View style={styles.roleBadge}>
                <ShieldCheck size={12} color={colors.secondary} strokeWidth={2.5} />
                <Text style={styles.roleBadgeText}>JAKIM Verified Host</Text>
              </View>
              {displayUser?.isContributor ? (
                <View style={styles.contributorBadge}>
                  <Award size={12} color={colors.primary} strokeWidth={2.5} />
                  <Text style={styles.contributorBadgeText}>Top Contributor</Text>
                </View>
              ) : (
                <View style={[styles.roleBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
                  <Sparkles size={12} color={colors['on-surface-variant']} strokeWidth={2.5} />
                  <Text style={[styles.roleBadgeText, { color: colors['on-surface-variant'] }]}>Community Member</Text>
                </View>
              )}
            </View>

            {/* Bio */}
            <Text style={styles.bioText}>
              {displayUser?.bio || '🇲🇾 Bangsar Community Organizer · Sourcing farm-fresh produce & wholesale deals direct for neighbours.'}
            </Text>

            {/* Location & Website Meta */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MapPin size={12} color={colors['on-surface-variant']} strokeWidth={2.2} />
                <Text style={styles.metaText}>{displayUser?.city || 'Bangsar, Kuala Lumpur'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Globe size={12} color={colors['on-surface-variant']} strokeWidth={2.2} />
                <Text style={styles.metaText}>{displayUser?.website || 'ktk.my/u/ahmad'}</Text>
              </View>
            </View>
          </View>

          {/* Instagram-style Social Proof Numbers Ribbon */}
          <View style={styles.followStatsRow}>
            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => setActiveTab('Deals')}
            >
              <Text style={styles.followStatValue}>{dealsCount > 0 ? dealsCount : 4}</Text>
              <Text style={styles.followStatLabel}>Drops</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => navigation.navigate('Followers', { userId: user?.id, mode: 'followers' })}
            >
              <Text style={styles.followStatValue}>{followerCount > 0 ? followerCount : 148}</Text>
              <Text style={styles.followStatLabel}>Followers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => navigation.navigate('Following', { userId: user?.id })}
            >
              <Text style={styles.followStatValue}>{followingCount > 0 ? followingCount : 42}</Text>
              <Text style={styles.followStatLabel}>Following</Text>
            </TouchableOpacity>

            <View style={styles.followStatItem}>
              <Text style={[styles.followStatValue, { color: '#EAB308' }]}>★ {displayUser?.contributorRating ? displayUser.contributorRating.toFixed(1) : '4.9'}</Text>
              <Text style={styles.followStatLabel}>Rating</Text>
            </View>
          </View>

          {/* Action Buttons Ribbon */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                },
              ]}
              onPress={() => navigation.navigate('ProfileSetup')}
              activeOpacity={0.8}
            >
              <UserIcon size={14} color={colors['on-surface']} strokeWidth={2.2} />
              <Text style={[styles.actionBtnText, { color: colors['on-surface'] }]}>Edit Profile</Text>
            </TouchableOpacity>

            {!displayUser?.isContributor ? (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors['primary-container'],
                    borderColor: colors['primary-container'],
                  },
                ]}
                onPress={() => navigation.navigate('ContributorApply')}
                activeOpacity={0.8}
              >
                <Award size={14} color="#ffffff" strokeWidth={2.2} />
                <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>Become Host</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors['secondary-container'],
                    borderColor: colors['secondary-container'],
                  },
                ]}
                onPress={() => navigation.navigate('MyDeals')}
                activeOpacity={0.8}
              >
                <Package size={14} color={colors['on-secondary-container']} strokeWidth={2.2} />
                <Text style={[styles.actionBtnText, { color: colors['on-secondary-container'] }]}>Host Hub</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sticky Segmented Tabs with Icons */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {TABS.map(renderTab)}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>

        {/* Menu Shortcuts */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <item.Icon size={18} color={colors['primary-container']} strokeWidth={2.2} style={{ marginRight: spacing.md }} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={17} color={colors['on-surface-variant']} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button title="Sign Out" onPress={handleLogout} variant="ghost" fullWidth />
        </View>
      </ScrollView>
    </View>
  );
};

// Helper for lookup status badge colors — uses token semantic colors
const lookupStatusBadge = (status: string, c: Record<string, string>) => {
  const map: Record<string, { bg: string; text: string }> = {
    Delivered:   { bg: c['status-success-bg'], text: c['status-success-text'] },
    Secured:     { bg: c['status-info-bg'],    text: c['status-info-text']    },
    InProcess:   { bg: c['status-warning-bg'], text: c['status-warning-text'] },
    Cancelled:   { bg: c['status-error-bg'],   text: c['status-error-text']   },
  };
  const s = map[status] ?? { bg: c['status-neutral-bg'], text: c['status-neutral-text'] };
  return { backgroundColor: s.bg, color: s.text, fontSize: 11, fontWeight: '700' as const };
};
const lookupStatusText = (status: string, c: Record<string, string>) => {
  const map: Record<string, string> = {
    Delivered: c['status-success-text'],
    Secured:   c['status-info-text'],
    InProcess: c['status-warning-text'],
    Cancelled: c['status-error-text'],
  };
  return { color: map[status] ?? c['status-neutral-text'], fontSize: 11, fontWeight: '700' as const };
};


