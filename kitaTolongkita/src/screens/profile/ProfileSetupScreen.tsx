import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../components';
import { typography, spacing, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface ProfileSetupScreenProps {
  navigation?: any;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  const handleComplete = () => {
    nav.replace('Main');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.skipBtn} onPress={handleComplete}>Skip</Text>
        <Text style={styles.stepText}>Step {step} of 2</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 2) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>
              Let your community know who you are. This helps build trust!
            </Text>

            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarEmoji}>👤</Text>
                </View>
                <TouchableOpacity style={styles.cameraBtn}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.avatarHint}>Tap to add photo</Text>
            </View>

            <Input
              label="Display Name"
              
              value={name}
              onChangeText={setName}
              prefix="✏️"
              containerStyle={styles.input}
            />

            <Input
              label="Bio (optional)"
              
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              prefix="💬"
              containerStyle={styles.input}
            />

            <Button title="Continue" onPress={() => setStep(2)} fullWidth variant="primary" />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Where Are You?</Text>
            <Text style={styles.subtitle}>
              Set your location so we can show you relevant deals nearby!
            </Text>

            <View style={styles.locationSelector}>
              <TouchableOpacity style={styles.locationOption}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>Use Current Location</Text>
                <Text style={styles.locationArrow}>→</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Input
                label="Enter Your Area"
                
                value={location}
                onChangeText={setLocation}
                prefix="🏠"
                containerStyle={styles.input}
              />
            </View>

            <Text style={styles.sectionLabel}>Popular Areas</Text>
            <View style={styles.areaChips}>
              {['Kuala Lumpur', 'Petaling Jaya', 'Shah Alam', 'Penang', 'Johor Bahru'].map((area) => (
                <TouchableOpacity
                  key={area}
                  style={styles.areaChip}
                  onPress={() => setLocation(area)}
                >
                  <Text style={styles.areaChipText}>{area}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.btnRow}>
              <Button title="Back" onPress={() => setStep(1)} variant="secondary" style={styles.halfBtn} />
              <Button title="Complete Setup" onPress={handleComplete} variant="primary" style={styles.halfBtn} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  skipBtn: { ...typography['body-lg'], color: colors['on-surface-variant'] },
  stepText: { ...typography['body-md'], color: colors['on-surface-variant'] },
  progressBar: {
    height: 4, backgroundColor: colors['outline-variant'],
    marginHorizontal: spacing.md, borderRadius: 2, marginBottom: spacing.xl,
  },
  progressFill: { height: '100%', backgroundColor: colors['primary-container'], borderRadius: 2 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  title: { ...typography['display-lg'], color: colors['on-background'], marginBottom: spacing.sm },
  subtitle: { ...typography['body-lg'], color: colors['on-surface-variant'], marginBottom: spacing.xl, lineHeight: 26 },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatarWrapper: { position: 'relative', marginBottom: spacing.sm },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors['surface-container'], alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 40 },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors['primary-container'], alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.white,
  },
  cameraIcon: { fontSize: 16 },
  avatarHint: { ...typography['body-md'], color: colors['on-surface-variant'] },
  input: { marginBottom: spacing.md },
  sectionLabel: {
    ...typography['label-sm'], color: colors['on-surface-variant'],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  locationSelector: { marginBottom: spacing.lg },
  locationOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors['secondary-container'], padding: spacing.md, borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  locationIcon: { fontSize: 24, marginRight: spacing.md },
  locationText: { ...typography['body-lg'], color: colors['on-secondary-container'], fontWeight: '600', flex: 1 },
  locationArrow: { fontSize: 20, color: colors['on-secondary-container'] },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors['outline-variant'] },
  dividerText: { ...typography['body-md'], color: colors['on-surface-variant'], paddingHorizontal: spacing.md },
  areaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  areaChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: colors['surface-container'], borderWidth: 1, borderColor: colors['outline-variant'],
  },
  areaChipText: { ...typography['label-sm'], color: colors['on-surface'] },
  btnRow: { flexDirection: 'row', gap: spacing.md },
  halfBtn: { flex: 1 },
});
