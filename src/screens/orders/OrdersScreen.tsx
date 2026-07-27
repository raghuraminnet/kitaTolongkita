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
import { dealsApi, getAccessToken } from '../../api/client';
import { startOrderPolling, stopOrderPolling, subscribeToOrders } from '../../api/orderPolling';
import type { Order } from '../../api/client';

const MOCK_ORDERS: Order[] = [
  { id: '1', dealId: 'd1', dealTitle: 'Aneka Kuih Muih — Ramadan Set A', quantity: 1, totalPrice: 25, status: 'Confirmed', createdAt: new Date().toISOString() },
  { id: '2', dealId: 'd2', dealTitle: 'Wireless Earbuds Pro', quantity: 2, totalPrice: 178, status: 'Ready', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', dealId: 'd3', dealTitle: 'Malaysian Batik — Limited Edition', quantity: 1, totalPrice: 65, status: 'Collected', createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const STATUS_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  Confirmed: '#3B82F6',
  Ready: '#10B981',
  Collected: '#6B7280',
  Cancelled: '#EF4444',
  Refunded: '#EF4444',
};

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
    startOrderPolling();

    const unsubscribe = subscribeToOrders((orders) => setOrders(orders));

    return () => {
      unsubscribe();
      stopOrderPolling();
    };
  }, []);

  const loadOrders = async () => {
    try {
      const token = await getAccessToken();
      if (!token) { setOrders(MOCK_ORDERS); setLoading(false); return; }
      const data = await dealsApi.getOrders();
      setOrders(data);
    } catch {
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('DealDetail', { dealId: item.dealId })}
      activeOpacity={0.8}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle} numberOfLines={1}>{item.dealTitle}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6B7280' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.orderMeta}>
        <Text style={styles.orderQty}>Qty: {item.quantity}</Text>
        <Text style={styles.orderPrice}>RM {item.totalPrice.toFixed(2)}</Text>
      </View>
      <Text style={styles.orderDate}>
        {new Date(item.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.bell}>🔔</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>Join a group deal to get started!</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 24, fontWeight: '700',
    color: colors['on-background'],
  },
  bell: { fontSize: 24 },
  list: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  orderCard: {
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.xl, padding: spacing.md,
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderTitle: {
    flex: 1, fontFamily: 'NunitoSans_700Bold', fontSize: 16, fontWeight: '700',
    color: colors['on-background'], marginRight: spacing.sm,
  },
  statusBadge: {
    borderRadius: borderRadius.full, paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, fontWeight: '600',
    color: colors.white,
  },
  orderMeta: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  orderQty: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
  },
  orderPrice: {
    fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600',
    color: colors['primary-container'],
  },
  orderDate: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'],
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 20, fontWeight: '700',
    color: colors['on-background'], marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface-variant'],
  },
});
