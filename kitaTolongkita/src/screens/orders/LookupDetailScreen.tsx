import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { lookupsApi } from '../../api/client';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#FF9800',
  Secured: '#1565c0',
  InProcess: '#e65100',
  Delivered: '#2e7d32',
  Cancelled: '#c62828',
};

export const LookupDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
      backgroundColor: colors['surface-container-lowest'],
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    backBtnText: { fontSize: 22, color: colors['on-surface'] },
    headerTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700', flex: 1, textAlign: 'center' },
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
    errorText: { ...typography['body-lg'], color: colors.error },
    bookingCard: {
      backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.xl,
      borderLeftWidth: 4,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    bookingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
    statusText: { ...typography['label-sm'], fontWeight: '700' },
    bookingId: { fontFamily: 'monospace', fontSize: 16, fontWeight: '800', color: colors['on-surface'] },
    dealTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700' },
    contributorName: { ...typography['body-md'], color: colors['on-surface-variant'], marginTop: 2 },
    divider: { height: 1, backgroundColor: colors['outline-variant'], marginVertical: spacing.md },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
    detailLabel: { ...typography['body-md'], color: colors['on-surface-variant'] },
    detailValue: { ...typography['body-md'], color: colors['on-surface'], fontWeight: '600' },
    qrSection: { marginBottom: spacing.lg },
    sectionTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700', marginBottom: spacing.xs },
    qrSubtitle: { ...typography['body-md'], color: colors['on-surface-variant'], marginBottom: spacing.md },
    qrPlaceholder: {
      backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.xl, padding: spacing.xl,
      alignItems: 'center',
      borderWidth: 2, borderColor: colors['outline-variant'],
      borderStyle: 'dashed',
    },
    qrEmoji: { fontSize: 64, marginBottom: spacing.sm },
    qrNote: { ...typography['label-sm'], color: colors['on-surface-variant'] },
    qrId: { fontFamily: 'monospace', fontSize: 18, fontWeight: '800', color: colors['on-surface'], marginTop: spacing.xs },
    verifiedBanner: {
      backgroundColor: '#e8f5e9', borderRadius: borderRadius.lg,
      padding: spacing.md, marginTop: spacing.md, alignItems: 'center',
    },
    verifiedText: { ...typography['body-md'], color: '#2e7d32', fontWeight: '700' },
    verifiedTime: { ...typography['label-sm'], color: '#2e7d32', marginTop: 4 },
    pendingText: { ...typography['body-md'], color: '#FF9800', textAlign: 'center', marginTop: spacing.md },
    deliverySection: { marginBottom: spacing.lg },
    deliveryCard: {
      backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.xl, padding: spacing.lg,
    },
    deliveryLabel: { ...typography['label-sm'], color: colors['on-surface-variant'], marginBottom: 2 },
    deliveryValue: { ...typography['body-md'], color: colors['on-surface'], fontWeight: '600', marginBottom: spacing.md },
    deliveryModeRow: { marginTop: spacing.xs },
    dispatchNotes: { marginTop: spacing.sm, backgroundColor: '#fff8e1', borderRadius: borderRadius.md, padding: spacing.sm },
    dispatchNotesLabel: { ...typography['label-sm'], color: '#e65100', fontWeight: '700' },
    dispatchNotesText: { ...typography['body-md'], color: '#e65100', marginTop: 2 },
    actionsSection: { marginTop: spacing.md },
    cancelBtn: {
      padding: spacing.md, borderRadius: borderRadius.lg,
      borderWidth: 1, borderColor: colors.error,
      alignItems: 'center',
    },
    cancelBtnText: { ...typography['label-lg'], color: colors.error, fontWeight: '700' },
  });
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { lookupId } = route.params as { lookupId: string };

  const [lookup, setLookup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    lookupsApi.getLookupDetail(lookupId)
      .then((res: any) => setLookup(res))
      .catch(() => Alert.alert('Error', 'Could not load lookup'))
      .finally(() => setLoading(false));
  }, [lookupId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lookup) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Lookup not found</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[lookup.status] ?? '#666';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Lookup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status + Booking ID */}
        <View style={[styles.bookingCard, { borderLeftColor: statusColor }]}>
          <View style={styles.bookingHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{lookup.status}</Text>
            </View>
            <Text style={styles.bookingId}>{lookup.bookingId}</Text>
          </View>

          <Text style={styles.dealTitle}>{lookup.dealTitle}</Text>
          <Text style={styles.contributorName}>by {lookup.contributorName}</Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{lookup.quantity}x</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Price</Text>
            <Text style={styles.detailValue}>RM {lookup.totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{lookup.category}</Text>
          </View>
        </View>

        {/* QR Code Display */}
        {lookup.qrCode ? (
          <View style={styles.qrSection}>
            <Text style={styles.sectionTitle}>📱 QR Code</Text>
            <Text style={styles.qrSubtitle}>Show this to the contributor when collecting</Text>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrEmoji}>📱</Text>
              <Text style={styles.qrNote}>QR Code</Text>
              <Text style={styles.qrId}>{lookup.bookingId}</Text>
            </View>
            {lookup.qrVerified ? (
              <View style={styles.verifiedBanner}>
                <Text style={styles.verifiedText}>✅ Delivery Confirmed</Text>
                {lookup.qrVerifiedAt && (
                  <Text style={styles.verifiedTime}>
                    {new Date(lookup.qrVerifiedAt).toLocaleString('en-GB')}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.pendingText}>
                ⏳ Waiting for delivery confirmation
              </Text>
            )}
          </View>
        ) : null}

        {/* Delivery Info */}
        <View style={styles.deliverySection}>
          <Text style={styles.sectionTitle}>📍 Delivery</Text>
          <View style={styles.deliveryCard}>
            <Text style={styles.deliveryLabel}>Pickup Location</Text>
            <Text style={styles.deliveryValue}>{lookup.pickupLocation}</Text>

            {lookup.deliveryMode && (
              <View style={styles.deliveryModeRow}>
                <Text style={styles.deliveryLabel}>Mode</Text>
                <Text style={styles.deliveryValue}>
                  {lookup.deliveryMode === 'ContributorDeliver'
                    ? '🚚 Contributor Deliver — Face to Face'
                    : '📦 Self Collect — Face to Face'}
                </Text>
              </View>
            )}

            {lookup.etd && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estimated Delivery</Text>
                <Text style={styles.detailValue}>
                  {new Date(lookup.etd).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            )}

            {lookup.dispatchNotes && (
              <View style={styles.dispatchNotes}>
                <Text style={styles.dispatchNotesLabel}>Notes</Text>
                <Text style={styles.dispatchNotesText}>{lookup.dispatchNotes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {lookup.status === 'Pending' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => Alert.alert('Cancel Lookup', 'Contact support to cancel your lookup.')}
            >
              <Text style={styles.cancelBtnText}>Cancel Lookup</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};


