import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../../i18n';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { clearTokens } from '../../api/client';
import { useAuth } from '../../api/authContext';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingsScreenProps {
  navigation?: any;
}

interface SettingRow {
  icon: string;
  label: string;
  type: 'toggle' | 'chevron' | 'value';
  value?: boolean | string;
  onPress?: () => void;
  onToggle?: (v: boolean) => void;
}

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { signOut, isDemo } = useAuth();
  const { i18n } = useTranslation();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [langRefresh, setLangRefresh] = useState(0);
  const { isDark, toggleTheme } = useTheme();

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Row: React.FC<SettingRow> = ({
    icon,
    label,
    type,
    value,
    onPress,
    onToggle,
  }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={type === 'toggle'}
      activeOpacity={type === 'chevron' ? 0.7 : 1}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      {type === 'toggle' && onToggle && (
        <Switch
          value={value as boolean}
          onValueChange={onToggle}
          trackColor={{ false: colors['outline-variant'], true: colors.secondary }}
          thumbColor={colors.white}
        />
      )}
      {type === 'chevron' && <Text style={styles.chevron}>›</Text>}
      {type === 'value' && (
        <Text style={styles.rowValue}>{value as string}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Section title="Account">
          {isDemo && (
            <View style={styles.demoBanner}>
              <Text style={styles.demoBannerText}>🎮 Demo Mode — All data is stored locally</Text>
            </View>
          )}
          <Row icon="👤" label="Edit Profile" type="chevron" />
          <Row icon="🔐" label="Change Password" type="chevron" />
          <Row icon="📱" label="Phone Number" type="value" value="+60 12-345 6789" />
          <Row icon="✉️" label="Email" type="value" value="ahmad@email.com" />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row
            icon="🔔"
            label="Push Notifications"
            type="toggle"
            value={pushEnabled}
            onToggle={setPushEnabled}
          />
          <Row
            icon="📧"
            label="Email Notifications"
            type="toggle"
            value={emailEnabled}
            onToggle={setEmailEnabled}
          />
          <Row icon="🔕" label="Do Not Disturb" type="chevron" />
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Row
            icon="🌙"
            label="Dark Mode"
            type="toggle"
            value={isDark}
            onToggle={toggleTheme}
          />
          <Row icon="🔤" label="Text Size" type="value" value="Medium" />
        </Section>

        {/* Privacy & Security */}
        <Section title="Privacy & Security">
          <Row icon="🙈" label="Privacy Settings" type="chevron" />
          <Row icon="🔒" label="Login & Security" type="chevron" />
          <Row icon="🚫" label="Blocked Users" type="chevron" />
        </Section>

        {/* Support */}
        <Section title="Support">
          <Row icon="❓" label="Help & FAQ" type="chevron" />
          <Row icon="💬" label="Contact Us" type="chevron" />
          <Row icon="🐛" label="Report a Problem" type="chevron" />
        </Section>

        {/* Language */}
        <Section title="Language">
          <Row
            icon="🇬🇧"
            label="English"
            type="chevron"
            onPress={async () => {
              await setLanguage('en');
              setLangRefresh(n => n + 1);
            }}
          />
          <Row
            icon="🇲🇾"
            label="Bahasa Malaysia"
            type="chevron"
            onPress={async () => {
              await setLanguage('bm');
              setLangRefresh(n => n + 1);
            }}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row icon="📋" label="Terms of Service" type="chevron" />
          <Row icon="🔏" label="Privacy Policy" type="chevron" />
          <Row icon="ℹ️" label="About KitaTolongKita" type="chevron" />
          <Row icon="📲" label="App Version" type="value" value="1.0.0" />
        </Section>

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
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
            }}
          >
            <Text style={styles.dangerText}>🚪 Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn}>
            <Text style={styles.deleteText}>🗑️ Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backBtn: {
    fontSize: 28,
    fontWeight: '300',
  },
  title: {
    ...typography['title-md'],
    color: colors['on-background'],
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography['label-sm'],
    color: colors['on-surface-variant'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors['outline-variant'],
  },
  rowIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  rowLabel: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    flex: 1,
  },
  chevron: {
    fontSize: 22,
    color: colors['on-surface-variant'],
  },
  rowValue: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
  },
  demoBanner: {
    backgroundColor: '#FF7A30',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  demoBannerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  dangerBtn: {
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadows.card,
    marginBottom: spacing.sm,
  },
  dangerText: {
    ...typography['body-lg'],
    color: colors.error,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  deleteText: {
    ...typography['body-lg'],
    color: colors.error,
    fontWeight: '600',
  },
});
