import React, { useState, useEffect } from 'react';
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
import { notificationSettingsApi } from '../../api/client';
import { clearTokens } from '../../api/client';
import { useAuth } from '../../api/authContext';
import { useTheme } from '../../contexts/ThemeContext';

import {
  ArrowLeft,
  User,
  Lock,
  Smartphone,
  Mail,
  Bell,
  BellOff,
  MessageSquare,
  Heart,
  Package,
  Moon,
  Type,
  Shield,
  UserX,
  HelpCircle,
  MessageCircle,
  AlertCircle,
  Globe,
  FileText,
  Info,
  LogOut,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';

interface SettingsScreenProps {
  navigation?: any;
}

interface SettingRow {
  icon: React.ReactNode;
  label: string;
  type: 'toggle' | 'chevron' | 'value';
  value?: boolean | string;
  description?: string;
  onPress?: () => void;
  onToggle?: (v: boolean) => void;
}

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { signOut, isDemo } = useAuth();
  const { i18n } = useTranslation();
  const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [langRefresh, setLangRefresh] = useState(0);

  // Granular notification preferences
  const [notifyFollow, setNotifyFollow] = useState(true);
  const [notifyFollowedDeal, setNotifyFollowedDeal] = useState(false);
  const [notifyLikes, setNotifyLikes] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyLookups, setNotifyLookups] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    loadNotificationPrefs();
  }, []);

  const loadNotificationPrefs = async () => {
    try {
      const prefs: any = await notificationSettingsApi.getSettings();
      setNotifyFollow(prefs?.notifyFollow ?? true);
      setNotifyFollowedDeal(prefs?.notifyFollowedDeal ?? false);
      setNotifyLikes(prefs?.notifyLikes ?? true);
      setNotifyComments(prefs?.notifyComments ?? true);
      setNotifyLookups(prefs?.notifyLookups ?? true);
    } catch { /* ignore */ }
    finally { setPrefsLoading(false); }
  };

  const updatePref = async (key: string, value: boolean) => {
    try {
      await notificationSettingsApi.updateSettings({ [key]: value });
    } catch { Alert.alert('Error', 'Could not save preference'); }
  };

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors['surface-container-lowest'] }]}>{children}</View>
    </View>
  );

  const Row: React.FC<SettingRow> = ({
    icon,
    label,
    type,
    value,
    description,
    onPress,
    onToggle,
  }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors['outline-variant'] }]}
      onPress={onPress}
      disabled={type === 'toggle'}
      activeOpacity={type === 'chevron' ? 0.7 : 1}
    >
      <View style={styles.rowIconContainer}>{icon}</View>
      <View style={styles.rowLabelWrap}>
        <Text style={[styles.rowLabel, { color: colors['on-surface'] }]}>{label}</Text>
        {description && <Text style={[styles.rowDescription, { color: colors['on-surface-variant'] }]}>{description}</Text>}
      </View>
      {type === 'toggle' && onToggle && (
        <Switch
          value={value as boolean}
          onValueChange={onToggle}
          trackColor={{ false: colors['outline-variant'], true: colors['primary-container'] }}
          thumbColor={colors.white}
        />
      )}
      {type === 'chevron' && <ChevronRight size={18} color={colors['on-surface-variant']} strokeWidth={2} />}
      {type === 'value' && (
        <Text style={[styles.rowValue, { color: colors['on-surface-variant'] }]}>{value as string}</Text>
      )}
    </TouchableOpacity>
  );

  const iconColor = colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color={colors['on-surface']} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors['on-background'] }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Section title="Account">
          {isDemo && (
            <View style={styles.demoBanner}>
              <Text style={styles.demoBannerText}>Demo Mode — All data is stored locally</Text>
            </View>
          )}
          <Row icon={<User size={19} color={iconColor} strokeWidth={2} />} label="Edit Profile" type="chevron" />
          <Row icon={<Lock size={19} color={iconColor} strokeWidth={2} />} label="Change Password" type="chevron" />
          <Row icon={<Smartphone size={19} color={iconColor} strokeWidth={2} />} label="Phone Number" type="value" value="+60 12-345 6789" />
          <Row icon={<Mail size={19} color={iconColor} strokeWidth={2} />} label="Email" type="value" value="ahmad@email.com" />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row
            icon={<Bell size={19} color={iconColor} strokeWidth={2} />}
            label="Push Notifications"
            type="toggle"
            value={pushEnabled}
            onToggle={setPushEnabled}
          />
          <Row
            icon={<Mail size={19} color={iconColor} strokeWidth={2} />}
            label="Email Notifications"
            type="toggle"
            value={emailEnabled}
            onToggle={setEmailEnabled}
          />
          <Row icon={<BellOff size={19} color={iconColor} strokeWidth={2} />} label="Do Not Disturb" type="chevron" />
        </Section>

        {/* Social Notifications */}
        <Section title="Social Notifications">
          <Row
            icon={<User size={19} color={iconColor} strokeWidth={2} />}
            label="When someone follows me"
            description="Get notified when someone follows you"
            type="toggle"
            value={notifyFollow}
            onToggle={(v) => { setNotifyFollow(v); updatePref('notifyFollow', v); }}
          />
          <Row
            icon={<FileText size={19} color={iconColor} strokeWidth={2} />}
            label="When followed user posts"
            description="Notify when someone you follow posts a deal"
            type="toggle"
            value={notifyFollowedDeal}
            onToggle={(v) => { setNotifyFollowedDeal(v); updatePref('notifyFollowedDeal', v); }}
          />
          <Row
            icon={<Heart size={19} color="#E11D48" strokeWidth={2} />}
            label="Likes & Upvotes"
            type="toggle"
            value={notifyLikes}
            onToggle={(v) => { setNotifyLikes(v); updatePref('notifyLikes', v); }}
          />
          <Row
            icon={<MessageSquare size={19} color={iconColor} strokeWidth={2} />}
            label="Comments"
            type="toggle"
            value={notifyComments}
            onToggle={(v) => { setNotifyComments(v); updatePref('notifyComments', v); }}
          />
          <Row
            icon={<Package size={19} color={iconColor} strokeWidth={2} />}
            label="Lookup Updates"
            description="Deal status updates for your group buy orders"
            type="toggle"
            value={notifyLookups}
            onToggle={(v) => { setNotifyLookups(v); updatePref('notifyLookups', v); }}
          />
        </Section>

        {/* Appearance & Theme Customization */}
        <Section title="Appearance & Theme">
          <View style={styles.themeSelectorContainer}>
            {(['system', 'light', 'dark'] as const).map((mode) => {
              const isActive = themeMode === mode;
              const modeLabel =
                mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark AMOLED';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeOptionBtn,
                    {
                      backgroundColor: isActive
                        ? colors['primary-container']
                        : isDark
                        ? colors['surface-container']
                        : '#F1F5F9',
                      borderColor: isActive
                        ? colors['primary-container']
                        : isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                  onPress={() => setThemeMode(mode)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      {
                        color: isActive
                          ? '#ffffff'
                          : isDark
                          ? colors['on-surface']
                          : '#334155',
                      },
                    ]}
                  >
                    {mode === 'system' ? '📱 System' : mode === 'light' ? '☀️ Light' : '🌙 Dark'}
                  </Text>
                  {isActive && <Text style={styles.themeActiveDot}>●</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Privacy & Security */}
        <Section title="Privacy & Security">
          <Row icon={<Shield size={19} color={iconColor} strokeWidth={2} />} label="Privacy Settings" type="chevron" />
          <Row icon={<Lock size={19} color={iconColor} strokeWidth={2} />} label="Login & Security" type="chevron" />
          <Row icon={<UserX size={19} color={iconColor} strokeWidth={2} />} label="Blocked Users" type="chevron" />
        </Section>

        {/* Support */}
        <Section title="Support">
          <Row icon={<HelpCircle size={19} color={iconColor} strokeWidth={2} />} label="Help & FAQ" type="chevron" />
          <Row icon={<MessageCircle size={19} color={iconColor} strokeWidth={2} />} label="Contact Us" type="chevron" />
          <Row icon={<AlertCircle size={19} color={iconColor} strokeWidth={2} />} label="Report a Problem" type="chevron" />
        </Section>

        {/* Language Selection */}
        <Section title="Language / Bahasa / 语言">
          <Row
            icon={<Globe size={19} color={iconColor} strokeWidth={2} />}
            label="English"
            type="value"
            value={i18n.language?.startsWith('en') ? '✓ Active' : ''}
            onPress={async () => {
              await setLanguage('en');
              setLangRefresh(n => n + 1);
            }}
          />
          <Row
            icon={<Globe size={19} color={iconColor} strokeWidth={2} />}
            label="Bahasa Malaysia"
            type="value"
            value={i18n.language?.startsWith('bm') || i18n.language?.startsWith('ms') ? '✓ Aktif' : ''}
            onPress={async () => {
              await setLanguage('bm');
              setLangRefresh(n => n + 1);
            }}
          />
          <Row
            icon={<Globe size={19} color={iconColor} strokeWidth={2} />}
            label="简体中文 (Chinese)"
            type="value"
            value={i18n.language?.startsWith('zh') ? '✓ 已启用' : ''}
            onPress={async () => {
              await setLanguage('zh');
              setLangRefresh(n => n + 1);
            }}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row icon={<FileText size={19} color={iconColor} strokeWidth={2} />} label="Terms of Service" type="chevron" />
          <Row icon={<Shield size={19} color={iconColor} strokeWidth={2} />} label="Privacy Policy" type="chevron" />
          <Row icon={<Info size={19} color={iconColor} strokeWidth={2} />} label="About KitaTolongKita" type="chevron" />
          <Row icon={<Smartphone size={19} color={iconColor} strokeWidth={2} />} label="App Version" type="value" value="1.0.0" />
        </Section>

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.dangerBtn, { backgroundColor: colors['surface-container-lowest'] }]}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LogOut size={18} color={colors.error} strokeWidth={2} />
              <Text style={[styles.dangerText, { color: colors.error }]}>Log Out</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors['surface-container-lowest'] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trash2 size={18} color={colors.error} strokeWidth={2} />
              <Text style={[styles.deleteText, { color: colors.error }]}>Delete Account</Text>
            </View>
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
  rowIconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    flex: 1,
  },
  rowLabelWrap: { flex: 1 },
  rowDescription: {
    ...typography['label-sm'],
    color: colors['on-surface-variant'],
    marginTop: 2,
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
    backgroundColor: colors['primary-container'],
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
  themeSelectorContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: 8,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  themeOptionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    fontWeight: '700',
  },
  themeActiveDot: {
    fontSize: 8,
    color: '#ffffff',
    marginLeft: 4,
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
