import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Avatar, Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { authApi, clearTokens, getAccessToken } from '../../api/client';
import { useAuth } from '../../api/authContext';
import type { User } from '../../api/client';

const MOCK_USER: User = {
  id: '1',
  email: 'ahmad@example.com',
  fullName: 'Ahmad bin Ali',
  avatarUrl: undefined,
  emailVerified: true,
  phoneVerified: false,
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await getAccessToken();
      if (!token) { setLoading(false); return; }
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      // Token invalid or API down — use mock
      setUser(MOCK_USER);
    } finally {
      setLoading(false);
    }
  };

  const { signOut } = useAuth();

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

  const stats = [
    { label: 'Orders', value: '12' },
    { label: 'Deals Joined', value: '28' },
    { label: 'Reviews', value: '5' },
  ];

  const menuItems = [
    { icon: '👤', label: 'Edit Profile', onPress: () => navigation.navigate('ProfileSetup') },
    { icon: '📍', label: 'My Addresses', onPress: () => {} },
    { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { icon: '💬', label: 'Chat Inbox', onPress: () => navigation.navigate('ChatInbox') },
    { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('Settings') },
  ];

  const displayUser = user ?? MOCK_USER;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profileCard}>
          <Avatar
            name={displayUser.fullName}
            uri={displayUser.avatarUrl}
            size={80}
          />
          <Text style={styles.userName}>{displayUser.fullName}</Text>
          <Text style={styles.userEmail}>{displayUser.email}</Text>
          {!loading && !user && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Demo Mode</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
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
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="ghost"
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
};

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
    marginBottom: spacing.lg,
  },
  userName: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 20, fontWeight: '700',
    color: colors['on-background'], marginTop: spacing.md,
  },
  userEmail: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
    marginTop: spacing.xs,
  },
  demoBadge: {
    backgroundColor: colors['primary-container'], borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.md,
  },
  demoBadgeText: {
    fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.white,
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginHorizontal: spacing.md, marginBottom: spacing.lg,
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.xl, padding: spacing.lg,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontFamily: 'NunitoSans_800ExtraBold', fontSize: 24, fontWeight: '800',
    color: colors['primary-container'],
  },
  statLabel: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'],
    marginTop: spacing.xs,
  },
  menuSection: {
    marginHorizontal: spacing.md, backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.xl, overflow: 'hidden',
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
