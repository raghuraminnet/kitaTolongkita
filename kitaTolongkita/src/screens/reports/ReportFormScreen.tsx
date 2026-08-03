import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { reportsApi } from '../../api/client';
import type { ReportReason, ReportType } from '../../api/client';

const REPORT_REASONS: { key: ReportReason; label: string; emoji: string; hint: string }[] = [
  { key: 'PriceGouging',        label: 'Price Gouging',        emoji: '💰', hint: 'Price is unrealistic or inflated' },
  { key: 'MisleadingPricing',   label: 'Misleading Price',     emoji: '🏷️', hint: 'Original price shown is fake' },
  { key: 'Counterfeit',         label: 'Counterfeit',          emoji: '⚠️', hint: 'Suspected fake / counterfeit product' },
  { key: 'ItemNotAsDescribed', label: 'Not As Described',     emoji: '📦', hint: 'Product doesn\'t match photos or description' },
  { key: 'DangerousProduct',   label: 'Safety Concern',       emoji: '🚨', hint: 'Safety, health, or legal concern' },
  { key: 'SpamDuplicate',      label: 'Spam / Duplicate',      emoji: '📢', hint: 'Duplicate post or spam' },
  { key: 'CoordinatedDeals',   label: 'Coordinated Scam',     emoji: '🎯', hint: 'Organized suspicious group deal activity' },
  { key: 'InappropriateContent',label: 'Inappropriate',         emoji: '🔞', hint: 'Offensive or explicit content' },
  { key: 'Harassment',         label: 'Harassment',            emoji: '😰', hint: 'Bullying, threats, or harassment' },
  { key: 'FakeDeal',           label: 'Fake Deal',             emoji: '🎭', hint: 'Completely fake deal or bait-and-switch' },
  { key: 'PhishingScam',       label: 'Phishing / Scam',      emoji: '🎣', hint: 'Contains scam intent or phishing link' },
  { key: 'FakeEngagement',     label: 'Fake Engagement',      emoji: '🤖', hint: 'Fake upvotes, likes, or reviews' },
  { key: 'SuspiciousPoster',   label: 'Suspicious Poster',    emoji: '👤', hint: 'Poster appears fake, bot-like, or impersonating' },
  { key: 'Other',              label: 'Something Else',       emoji: '❓', hint: 'Requires a detailed description' },
];

interface RouteParams {
  type: ReportType;
  targetId: string;
  targetTitle?: string;
}

export const ReportFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { type, targetId, targetTitle } = route.params as RouteParams;
  const isDealReport = type === 'Deal';

  const [selectedReasons, setSelectedReasons] = useState<ReportReason[]>([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleReason = (reason: ReportReason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      Alert.alert('Select a Reason', 'Please select at least one reason for your report.');
      return;
    }
    if (selectedReasons.includes('Other') && !description.trim()) {
      Alert.alert('Description Required', 'Please describe the issue when selecting "Something Else".');
      return;
    }

    setSubmitting(true);
    try {
      await reportsApi.submit({
        type,
        targetId,
        reasons: selectedReasons,
        description: description.trim() || undefined,
      });
      Alert.alert(
        'Report Submitted',
        `Thank you. Your report about this ${isDealReport ? 'deal' : 'user'} has been received and will be reviewed by our team.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      if (err?.message?.includes('already submitted')) {
        Alert.alert('Already Reported', 'You have already submitted an unresolved report for this content.');
      } else {
        Alert.alert('Submission Failed', err.message || 'Could not submit report. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report {isDealReport ? 'Deal' : 'User'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Target info */}
        {targetTitle && (
          <View style={styles.targetCard}>
            <Text style={styles.targetLabel}>You are reporting:</Text>
            <Text style={styles.targetTitle} numberOfLines={2}>{targetTitle}</Text>
          </View>
        )}

        {/* Reason selection */}
        <Text style={styles.sectionTitle}>What's wrong?</Text>
        <Text style={styles.sectionHint}>Select all reasons that apply</Text>
        <View style={styles.reasonGrid}>
          {REPORT_REASONS.map((reason) => {
            const selected = selectedReasons.includes(reason.key);
            return (
              <TouchableOpacity
                key={reason.key}
                style={[styles.reasonChip, selected && styles.reasonChipSelected]}
                onPress={() => toggleReason(reason.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.reasonEmoji}>{reason.emoji}</Text>
                <View style={styles.reasonTextGroup}>
                  <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                    {reason.label}
                  </Text>
                  <Text style={[styles.reasonHint, selected && styles.reasonHintSelected]}>
                    {reason.hint}
                  </Text>
                </View>
                {selected && <Text style={styles.reasonCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Additional Details</Text>
        <Text style={styles.sectionHint}>Optional — helps our team investigate faster</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe what happened or why you're reporting this..."
          placeholderTextColor={colors['on-surface-variant']}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Warning */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Filing false reports may result in restrictions on your account.
            Our team reviews all reports and takes appropriate action.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          title={submitting ? 'Submitting...' : 'Submit Report'}
          onPress={handleSubmit}
          disabled={submitting || selectedReasons.length === 0}
          variant="primary"
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
    backgroundColor: colors['surface-container-lowest'],
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: colors['on-surface-variant'] },
  headerTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700' },
  scrollContent: { padding: spacing.md, paddingBottom: 120 },
  targetCard: {
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  targetLabel: { ...typography['label-sm'], color: colors['on-surface-variant'], marginBottom: spacing.xs },
  targetTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700' },
  sectionTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700', marginBottom: spacing.xs },
  sectionHint: { ...typography['body-md'], color: colors['on-surface-variant'], marginBottom: spacing.md },
  reasonGrid: { gap: spacing.sm, marginBottom: spacing.xl },
  reasonChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors['outline-variant'],
    gap: spacing.sm,
  },
  reasonChipSelected: {
    backgroundColor: colors['primary-container'], borderColor: colors['primary-container'],
  },
  reasonEmoji: { fontSize: 20 },
  reasonTextGroup: { flex: 1 },
  reasonLabel: { ...typography['body-md'], color: colors['on-surface'], fontWeight: '600' },
  reasonLabelSelected: { color: colors.white, fontWeight: '700' },
  reasonHint: { ...typography['label-sm'], color: colors['on-surface-variant'], marginTop: 2 },
  reasonHintSelected: { color: 'rgba(255,255,255,0.8)' },
  reasonCheck: { color: colors.white, fontWeight: '800', fontSize: 16 },
  descriptionInput: {
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.lg,
    padding: spacing.md, ...typography['body-md'], color: colors['on-surface'],
    borderWidth: 1, borderColor: colors['outline-variant'],
    minHeight: 120, marginBottom: spacing.lg,
  },
  warningBox: {
    backgroundColor: 'rgba(255,183,77,0.15)', borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,183,77,0.3)',
  },
  warningText: { ...typography['body-md'], color: colors['on-surface-variant'], lineHeight: 20 },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors['surface-container-lowest'],
    paddingTop: spacing.md, paddingHorizontal: spacing.md,
    borderTopWidth: 1, borderTopColor: colors['outline-variant'],
  },
});
