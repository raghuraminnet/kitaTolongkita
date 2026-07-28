import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { notificationsApi } from '../../api/client';

const ICON_MAP: Record<string, string> = {
  order_update: '📦',
  deal_closing: '⏰',
  promo: '🔥',
  chat: '💬',
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    const mins = Math.floor(diff / (60 * 1000));
    return `${mins}m ago`;
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notifItem, !item.read && styles.unread]}
      onPress={() => {
        if (item.type === 'chat') navigation.navigate('ChatInbox');
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.notifIcon}>{ICON_MAP[item.type] ?? '🔔'}</Text>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={[styles.notifTitle, !item.read && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.notifTime}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.notifDesc}>{item.body}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors['primary-container']} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
  },
  backBtn: { fontSize: 24, color: colors['on-surface'] },
  headerTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700',
    color: colors['on-background'],
  },
  list: { paddingBottom: 100 },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: spacing.md, borderBottomWidth: 1,
    borderBottomColor: colors['outline-variant'],
    backgroundColor: colors['surface-container-lowest'],
  },
  unread: { backgroundColor: '#FFF3E0' },
  notifIcon: { fontSize: 24, marginRight: spacing.md, marginTop: 2 },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: {
    fontFamily: 'Inter_400Regular', fontSize: 15, fontWeight: '400',
    color: colors['on-surface'],
  },
  unreadTitle: { fontWeight: '700' },
  notifTime: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'],
  },
  notifDesc: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: colors['on-surface-variant'],
    lineHeight: 18,
  },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors['primary-container'],
    marginLeft: spacing.xs, marginTop: 4,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyText: {
    fontFamily: 'Inter_400Regular', fontSize: 16, color: colors['on-surface-variant'],
  },
});
