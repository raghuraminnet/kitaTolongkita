import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { contributorApi } from '../../api/client';

const NATIONALITIES = ['Malaysian', 'Singaporean', 'Indonesian', 'Thai', 'Filipino', 'Vietnamese', 'Myanmar', 'Indian', 'Chinese', 'Other'];
const RACES = ['Malay', 'Chinese', 'Indian', 'Indigenous', 'Other'];
const RESIDENT_STATUSES = ['Resident', 'Non-Resident'];

export const ContributorApplyScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

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
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
    intro: { backgroundColor: colors['surface-container-lowest'], borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.lg },
    introTitle: { ...typography['title-md'], color: colors['on-surface'], fontWeight: '700', marginBottom: spacing.sm },
    introBody: { ...typography['body-md'], color: colors['on-surface-variant'], lineHeight: 22 },
    fieldGroup: { marginBottom: spacing.lg },
    fieldLabel: { ...typography['label-md'], color: colors['on-surface'], fontWeight: '700', marginBottom: spacing.sm },
    input: {
      backgroundColor: colors['surface-container-lowest'],
      borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors['outline-variant'],
      paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      fontFamily: 'Inter_400Regular', fontSize: 16, color: colors['on-surface'],
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors['outline-variant'],
      backgroundColor: colors['surface-container-lowest'],
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { ...typography['label-sm'], color: colors['on-surface-variant'] },
    chipTextActive: { color: colors.white, fontWeight: '700' },
    disclaimer: {
      backgroundColor: '#e3f2fd', borderRadius: borderRadius.lg,
      padding: spacing.md, marginBottom: spacing.lg,
    },
    disclaimerText: { ...typography['label-sm'], color: '#1565c0', lineHeight: 18 },
    submitBtn: {
      backgroundColor: colors.primary, borderRadius: borderRadius.lg,
      paddingVertical: spacing.md, alignItems: 'center',
    },
    submitBtnDisabled: { backgroundColor: colors['outline-variant'] },
    submitBtnText: { ...typography['body-lg'], color: colors.white, fontWeight: '700' },
    successState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    successEmoji: { fontSize: 80, marginBottom: spacing.lg },
    successTitle: { ...typography['headline-sm'], color: colors['on-surface'], fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' },
    successBody: { ...typography['body-md'], color: colors['on-surface-variant'], textAlign: 'center', lineHeight: 24, marginBottom: spacing.xl },
    doneBtn: {
      backgroundColor: colors.primary, borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.xl * 2, paddingVertical: spacing.md,
    },
    doneBtnText: { ...typography['body-lg'], color: colors.white, fontWeight: '700' },
  });
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [mobileNo, setMobileNo] = useState('');
  const [icNo, setIcNo] = useState('');
  const [nationality, setNationality] = useState('');
  const [race, setRace] = useState('');
  const [residentStatus, setResidentStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success' | 'pending'>('form');

  const isValid = mobileNo.trim() && icNo.trim() && nationality && race && residentStatus;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await contributorApi.apply({ mobileNo: mobileNo.trim(), icPassportNo: icNo.trim(), nationality, race, residentStatus });
      setStep('success');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contributor Application</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.successState}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successBody}>
            Your contributor application is under review. We'll notify you once our admin team has reviewed your KYC details. This usually takes 1-2 business days.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Contributor</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>🏅 Contributor Application</Text>
          <Text style={styles.introBody}>
            As a contributor, you can post group buy deals and manage your own deals. Please fill in your KYC details for verification.
          </Text>
        </View>

        {/* Mobile No */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Mobile Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +60 12-345 6789"
            placeholderTextColor={colors['on-surface-variant']}
            value={mobileNo}
            onChangeText={setMobileNo}
            keyboardType="phone-pad"
          />
        </View>

        {/* IC / Passport */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>IC or Passport Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 001234-05-1234"
            placeholderTextColor={colors['on-surface-variant']}
            value={icNo}
            onChangeText={setIcNo}
          />
        </View>

        {/* Nationality */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Nationality *</Text>
          <View style={styles.chipRow}>
            {NATIONALITIES.map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, nationality === n && styles.chipActive]}
                onPress={() => setNationality(n)}
              >
                <Text style={[styles.chipText, nationality === n && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Race */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Race *</Text>
          <View style={styles.chipRow}>
            {RACES.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, race === r && styles.chipActive]}
                onPress={() => setRace(r)}
              >
                <Text style={[styles.chipText, race === r && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Resident Status */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Resident Status *</Text>
          <View style={styles.chipRow}>
            {RESIDENT_STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, residentStatus === s && styles.chipActive]}
                onPress={() => setResidentStatus(s)}
              >
                <Text style={[styles.chipText, residentStatus === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            🔒 Your information is encrypted and stored securely. It will only be used for KYC verification purposes and will not be shared with third parties.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};


