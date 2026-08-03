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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Avatar, Button } from '../../components';
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { authApi, dealsApi, clearTokens, getAccessToken, followApi, repostsApi, lookupsApi, ratingsApi } from '../../api/client';
import { useAuth } from '../../api/authContext';
import type { User } from '../../api/client';
import type { Deal } from '../../api/client';

const TABS = ['Deals', 'Reposts', 'LookUps', 'Ratings'];

export const ProfileScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 120 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    },
    headerTitle: {
      fontFamily: 'NunitoSans_700Bold', fontSize: 24, fontWeight: '700',
      color: colors['on-background'],
    },
    settingsIcon: { fontSize: 24 },
    profileCard: {
      alignItems: 'center', paddingVertical: spacing.xl,
      backgroundColor: colors['surface-container-lowest'],
      marginHorizontal: spacing.md, borderRadius: borderRadius.xl,
      marginBottom: spacing.md,
    },
    userName: {
      fontFamily: 'NunitoSans_700Bold', fontSize: 20, fontWeight: '700',
      color: colors['on-background'], marginTop: spacing.md,
    },
    userEmail: {
      fontFamily: 'Inter_400Regular', fontSize: 14,
      color: colors['on-surface-variant'], marginTop: spacing.xs, textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    verifiedBadge: {
      backgroundColor: '#e3f2fd', borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.sm,
    },
    verifiedText: { fontSize: 11, color: '#1565c0', fontWeight: '700' },
    contributorBadge: {
      backgroundColor: '#fff8e1', borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.sm,
    },
    contributorBadgeText: { fontSize: 11, color: '#e65100', fontWeight: '700' },
    becomeContributorBtn: {
      marginTop: spacing.md, backgroundColor: '#e65100',
      borderRadius: borderRadius.full, paddingVertical: spacing.sm, alignItems: 'center',
    },
    becomeContributorBtnText: { ...typography['label-sm'], color: colors.white, fontWeight: '700' },
    demoBadge: {
      backgroundColor: colors['primary-container'], borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    },
    demoBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.white },
    profileMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    profileMetaText: { fontSize: 13, color: colors['on-surface-variant'] },
    followStatsRow: {
      flexDirection: 'row', justifyContent: 'space-around',
      width: '100%', paddingHorizontal: spacing.md,
      marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors['outline-variant'],
      paddingTop: spacing.lg,
    },
    followStatItem: { alignItems: 'center', minWidth: 60 },
    followStatValue: {
      fontFamily: 'NunitoSans_800ExtraBold', fontSize: 18, fontWeight: '800',
      color: colors['primary-container'],
    },
    followStatLabel: {
      fontFamily: 'Inter_400Regular', fontSize: 11,
      color: colors['on-surface-variant'], marginTop: 2,
    },
    tabsContainer: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
    tabsScroll: { flexDirection: 'row', gap: spacing.xs },
    tab: {
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
      borderRadius: borderRadius.full, backgroundColor: colors['surface-container-lowest'],
    },
    tabActive: { backgroundColor: colors['primary-container'] },
    tabText: {
      fontFamily: 'Inter_600SemiBold', fontSize: 14,
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
    star: { fontSize: 16, color: '#f59e0b' },
    menuSection: {
      marginHorizontal: spacing.md, backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.xl, overflow: 'hidden', marginTop: spacing.lg,
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
    if (!loading) loadTabData(activeTab);
  }, [activeTab, loading]);

  const loadProfile = async () => {
    try {
      const token = await getAccessToken();
      if (!token) { setLoading(false); return; }
      const me = await authApi.getMe();
      setUser(me);
      const orders = await dealsApi.getOrders();
      const myDealsData = await dealsApi.getMyDeals();
      setDealsCount(myDealsData.length);
      setLookupCount(orders.length);

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

  const loadTabData = async (tab: string) => {
    setTabLoading(true);
    try {
      if (tab === 'Deals') {
        const deals = await dealsApi.getMyDeals();
        setMyDeals(deals ?? []);
      } else if (tab === 'Reposts') {
        const res: any = await repostsApi.getMyReposts();
        setMyReposts(res?.reposts ?? []);
      } else if (tab === 'LookUps') {
        const res: any = await lookupsApi.getMyLookups();
        setMyLookups(res?.lookups ?? []);
      } else if (tab === 'Ratings') {
        // For own profile, show lookups that have been delivered (for rating)
        const res: any = await lookupsApi.getMyLookups('Delivered');
        setMyRatings(res?.lookups ?? []);
      }
    } catch { /* silent */ }
    finally { setTabLoading(false); }
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
    { icon: '🔖', label: 'My Saves', onPress: () => navigation.navigate('MySaves') },
    { icon: '🚩', label: 'My Reports', onPress: () => navigation.navigate('MyReports') },
    { icon: '👤', label: 'Edit Profile', onPress: () => navigation.navigate('ProfileSetup') },
    { icon: '📍', label: 'My Addresses', onPress: () => {} },
    { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { icon: '💬', label: 'Chat Inbox', onPress: () => navigation.navigate('ChatInbox') },
    { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('Settings') },
  ];

  const renderTab = (tab: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        onPress={() => setActiveTab(tab)}
        style={[styles.tab, isActive && styles.tabActive]}
      >
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
        <View style={lookupStatusBadge(item.status)}>
          <Text style={lookupStatusText(item.status)}>{item.status}</Text>
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

    if (activeTab === 'Deals') {
      if (myDeals.length === 0) return <View style={styles.emptyState}><Text style={styles.emptyText}>You haven't posted any deals yet.</Text></View>;
      return <FlatList data={myDeals} renderItem={renderDealItem} keyExtractor={d => d.id} scrollEnabled={false} />;
    }
    if (activeTab === 'Reposts') {
      if (myReposts.length === 0) return <View style={styles.emptyState}><Text style={styles.emptyText}>No reposts yet.</Text></View>;
      return <FlatList data={myReposts} renderItem={renderRepostItem} keyExtractor={r => r.repostId} scrollEnabled={false} />;
    }
    if (activeTab === 'LookUps') {
      if (myLookups.length === 0) return <View style={styles.emptyState}><Text style={styles.emptyText}>No group buy lookups yet.</Text></View>;
      return <FlatList data={myLookups} renderItem={renderLookupItem} keyExtractor={l => l.id} scrollEnabled={false} />;
    }
    if (activeTab === 'Ratings') {
      if (myRatings.length === 0) return <View style={styles.emptyState}><Text style={styles.emptyText}>No delivered orders to rate.</Text></View>;
      return <FlatList data={myRatings} renderItem={renderRatingItem} keyExtractor={r => r.id} scrollEnabled={false} />;
    }
  };

  const displayUser = user;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar name={displayUser?.fullName ?? 'User'} uri={displayUser?.avatarUrl} size={80} />
          <Text style={styles.userName}>{displayUser?.fullName ?? 'Your Name'}</Text>
          <Text style={styles.userEmail}>{displayUser?.bio ?? displayUser?.email ?? ''}</Text>
          {displayUser?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
          {displayUser?.isContributor && (
            <View style={styles.contributorBadge}>
              <Text style={styles.contributorBadgeText}>🏅 Contributor</Text>
            </View>
          )}
          {!displayUser?.isContributor && (
            <TouchableOpacity
              style={styles.becomeContributorBtn}
              onPress={() => navigation.navigate('ContributorApply')}
            >
              <Text style={styles.becomeContributorBtnText}>🏅 Become a Contributor</Text>
            </TouchableOpacity>
          )}
          {!loading && !user && (
            <View style={[styles.demoBadge, { marginTop: spacing.md }]}>
              <Text style={styles.demoBadgeText}>Demo Mode</Text>
            </View>
          )}

          {/* Location + Website */}
          {(displayUser?.city || displayUser?.website) && (
            <View style={styles.profileMeta}>
              {displayUser?.city && <Text style={styles.profileMetaText}>📍 {displayUser.city}</Text>}
              {displayUser?.website && <Text style={styles.profileMetaText}>🌐 {displayUser.website}</Text>}
            </View>
          )}

          {/* Follow stats row */}
          <TouchableOpacity
            style={styles.followStatsRow}
            onPress={() => navigation.navigate('Followers')}
          >
            <View style={styles.followStatItem}>
              <Text style={styles.followStatValue}>{dealsCount}</Text>
              <Text style={styles.followStatLabel}>Deals</Text>
            </View>
            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => navigation.navigate('Followers', { userId: user?.id, mode: 'followers' })}
            >
              <Text style={styles.followStatValue}>{followerCount}</Text>
              <Text style={styles.followStatLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => navigation.navigate('Following', { userId: user?.id })}
            >
              <Text style={styles.followStatValue}>{followingCount}</Text>
              <Text style={styles.followStatLabel}>Following</Text>
            </TouchableOpacity>
            {displayUser?.isContributor && (
              <View style={styles.followStatItem}>
                <Text style={styles.followStatValue}>★ {displayUser?.contributorRating?.toFixed(1) ?? '—'}</Text>
                <Text style={styles.followStatLabel}>Rating</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {TABS.map(renderTab)}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
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

// Helper for lookup status badge colors
const lookupStatusBadge = (status: string) => ({
  backgroundColor:
    status === 'Delivered' ? '#e8f5e9' :
    status === 'Secured' ? '#e3f2fd' :
    status === 'InProcess' ? '#fff3e0' :
    status === 'Cancelled' ? '#ffebee' : '#f5f5f5',
});
const lookupStatusText = (status: string) => ({
  color:
    status === 'Delivered' ? '#2e7d32' :
    status === 'Secured' ? '#1565c0' :
    status === 'InProcess' ? '#e65100' :
    status === 'Cancelled' ? '#c62828' : '#666',
  fontSize: 11, fontWeight: '700' as const,
});


