import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { dealsApi, getAccessToken, lookupsApi } from '../../api/client';
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
  const { colors } = useTheme();
  const { t } = useTranslation();

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
    tabsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
    tab: {
      flex: 1, paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: colors['surface-container-lowest'],
      alignItems: 'center',
    },
    tabActive: { backgroundColor: colors.primary },
    tabText: { ...typography['label-sm'], color: colors['on-surface-variant'], fontWeight: '700' },
    tabTextActive: { color: colors.white },
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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'lookups'>('orders');
  const [lookups, setLookups] = useState<any[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  useEffect(() => {
    loadOrders();
    startOrderPolling();

    const unsubscribe = subscribeToOrders((orders) => setOrders(orders));

    return () => {
      unsubscribe();
      stopOrderPolling();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'lookups' && lookups.length === 0) loadLookups();
  }, [activeTab]);

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

  const loadLookups = async () => {
    setLookupsLoading(true);
    try {
      const res: any = await lookupsApi.getMyLookups();
      setLookups(res?.lookups ?? []);
    } catch { setLookups([]); }
    finally { setLookupsLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'orders') await loadOrders();
    else await loadLookups();
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

  const renderLookup = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('LookupDetail', { lookupId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle} numberOfLines={1}>{item.dealTitle}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6B7280' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.orderMeta}>
        <Text style={styles.orderQty}>Booking: {item.bookingId}</Text>
        <Text style={styles.orderPrice}>RM {item.totalPrice.toFixed(2)}</Text>
      </View>
      <Text style={styles.orderDate}>
        {item.qrVerified ? '✅ Verified Delivery' : '⏳ Pending Delivery'}
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

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lookups' && styles.tabActive]}
          onPress={() => setActiveTab('lookups')}
        >
          <Text style={[styles.tabText, activeTab === 'lookups' && styles.tabTextActive]}>LookUps</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'orders' ? orders : lookups}
        renderItem={activeTab === 'orders' ? renderOrder : renderLookup}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          !(loading || lookupsLoading) ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{activeTab === 'orders' ? '📦' : '🔍'}</Text>
              <Text style={styles.emptyTitle}>{activeTab === 'orders' ? 'No orders yet' : 'No lookups yet'}</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'orders' ? 'Join a group deal to get started!' : 'Join a group buy deal to see it here.'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};


