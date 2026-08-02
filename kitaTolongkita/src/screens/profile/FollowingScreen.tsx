import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Avatar } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { followApi, getAccessToken } from '../../api/client';
import type { FollowItem } from '../../api/client';

interface RouteParams {
  userId?: string;
  mode?: 'followers' | 'following';
}

export const FollowingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { userId, mode = 'followers' } = route.params as RouteParams;

  const [items, setItems] = useState<FollowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      const uid = userId ?? 'me';
      const res: any = mode === 'followers'
        ? await followApi.getFollowers(uid, pageNum)
        : await followApi.getFollowing(uid, pageNum);

      const newItems = res?.followers ?? res?.following ?? [];
      if (isRefresh) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
      setHasMore(newItems.length === 20);
      setTotal(mode === 'followers' ? res?.totalFollowers : res?.totalFollowing);
    } catch { /* silent */ }
  }, [userId, mode]);

  useEffect(() => {
    setLoading(true);
    fetchItems(1).finally(() => setLoading(false));
  }, [fetchItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchItems(1, true);
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchItems(nextPage);
  };

  const handleUserPress = (uid: string) => {
    navigation.navigate('PublicProfile', { userId: uid });
  };

  const renderItem = ({ item }: { item: FollowItem }) => (
    <TouchableOpacity style={styles.userRow} onPress={() => handleUserPress(item.userId)}>
      <View style={styles.avatarWrap}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{item.fullName?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.fullName}</Text>
        <Text style={styles.userMeta}>
          Followed {new Date(item.followedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'followers' ? 'Followers' : 'Following'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.userId}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <Text style={styles.totalText}>
            {total} {mode === 'followers' ? (total === 1 ? 'Follower' : 'Followers') : (total === 1 ? 'Following' : 'Following')}
          </Text>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{mode === 'followers' ? '👥' : '👤'}</Text>
              <Text style={styles.emptyText}>
                {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator style={{ paddingVertical: spacing.xl }} /> : null}
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
    backgroundColor: colors['surface-container-lowest'],
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: colors['on-surface'] },
  headerTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700', flex: 1, textAlign: 'center' },
  listContent: { paddingBottom: spacing.xl * 2 },
  totalText: {
    ...typography['label-sm'], color: colors['on-surface-variant'],
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors['surface-container-lowest'],
  },
  avatarWrap: { marginRight: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors['surface-container-highest'],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: colors['on-surface-variant'] },
  userInfo: { flex: 1 },
  userName: { ...typography['body-md'], color: colors['on-surface'], fontWeight: '600' },
  userMeta: { ...typography['label-xs'], color: colors['on-surface-variant'], marginTop: 2 },
  arrow: { fontSize: 20, color: colors['on-surface-variant'] },
  separator: { height: 1, backgroundColor: colors['outline-variant'] },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography['body-md'], color: colors['on-surface-variant'] },
});
