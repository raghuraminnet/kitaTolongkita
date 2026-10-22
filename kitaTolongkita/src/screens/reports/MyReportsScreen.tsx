import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { reportsApi } from '../../api/client';
import type { Report } from '../../api/client';
import { ArrowLeft, CheckCircle2, Tag, User as UserIcon, FileText } from 'lucide-react-native';

function getReportStatusColors(status: string, col: typeof colors) {
  const map: Record<string, { bg: string; text: string }> = {
    New:        { bg: col['status-warning-bg'], text: col['status-warning-text'] },
    UnderReview:{ bg: col['status-info-bg'],    text: col['status-info-text']    },
    ActionTaken:{ bg: col['status-warning-bg'], text: col['status-warning-text'] },
    Dismissed:  { bg: col['status-neutral-bg'], text: col['status-neutral-text'] },
    Resolved:   { bg: col['status-success-bg'], text: col['status-success-text'] },
  };
  return map[status] ?? { bg: col['status-neutral-bg'], text: col['status-neutral-text'] };
}

const STATUS_LABELS: Record<string, string> = {
  New: 'New',
  UnderReview: 'Under Review',
  ActionTaken: 'Action Taken',
  Dismissed: 'Dismissed',
  Resolved: 'Resolved',
};

export const MyReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await reportsApi.mine();
      setReports(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setReports([]);
      setError(null);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderReport = ({ item }: { item: Report }) => {
    const statusColor = getReportStatusColors(item.status, colors).text;
    const Icon = item.type === 'Deal' ? Tag : UserIcon;
    return (
      <View style={styles.reportCard}>
        <View style={styles.reportCardHeader}>
          <View style={styles.reportTypeRow}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors['surface-container'], alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
              <Icon size={14} color={colors['primary-container']} strokeWidth={2} />
            </View>
            <Text style={styles.reportTypeLabel}>{item.type === 'Deal' ? 'Deal Report' : 'User Report'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        {item.targetTitle && (
          <Text style={styles.targetTitle} numberOfLines={2}>{item.targetTitle}</Text>
        )}

        <View style={styles.reasonsRow}>
          {item.reasons.slice(0, 3).map((reason) => (
            <View key={reason} style={styles.reasonChip}>
              <Text style={styles.reasonChipText}>{reason.replace(/([A-Z])/g, ' $1').trim()}</Text>
            </View>
          ))}
          {item.reasons.length > 3 && (
            <Text style={styles.moreReasonsText}>+{item.reasons.length - 3} more</Text>
          )}
        </View>

        <View style={styles.reportCardFooter}>
          <Text style={styles.reportDate}>
            {new Date(item.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          {item.resolvedAt && (
            <Text style={styles.resolvedDate}>
              Resolved {new Date(item.resolvedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={22} color={colors['on-surface']} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centerState}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors['surface-container'], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
            <CheckCircle2 size={36} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.emptyTitle}>No Reports Filed</Text>
          <Text style={styles.emptyHint}>If you see something that violates our guidelines, you can report it from the deal or user profile.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
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
  headerTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700' },
  listContent: { padding: spacing.md },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { ...typography['body-lg'], color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  retryText: { ...typography['body-md'], color: colors.primary, fontWeight: '600' },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700', marginBottom: spacing.sm },
  emptyHint: { ...typography['body-md'], color: colors['on-surface-variant'], textAlign: 'center', lineHeight: 22 },
  reportCard: {
    backgroundColor: colors['surface-container-lowest'], borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors['outline-variant'],
  },
  reportCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  reportTypeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reportTypeEmoji: { fontSize: 16 },
  reportTypeLabel: { ...typography['label-sm'], color: colors['on-surface-variant'], fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typography['label-sm'], fontWeight: '700' },
  targetTitle: { ...typography['body-md'], color: colors['on-surface'], fontWeight: '600', marginBottom: spacing.sm },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  reasonChip: {
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  reasonChipText: { ...typography['label-sm'], color: colors['on-surface-variant'] },
  moreReasonsText: { ...typography['label-sm'], color: colors['on-surface-variant'], alignSelf: 'center' },
  reportCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  reportDate: { ...typography['label-sm'], color: colors['on-surface-variant'] },
  resolvedDate: { ...typography['label-sm'], color: colors['status-success-text'] },
});
