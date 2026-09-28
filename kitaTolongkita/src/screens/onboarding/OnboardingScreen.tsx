import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components';
import { typography, spacing, borderRadius, shadows, DISPLAY_FONT, BODY_FONT } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

const SCREENS = [
  {
    badge: '🤝 Gotong Royong 2.0',
    title: 'Beli Ramai-Ramai,\nLebih Jimat!',
    subtitle:
      'Pool orders with your neighbours in Bangsar, PJ & beyond to unlock wholesale bulk savings.',
    illustration: '🛍️',
    stat: 'Save up to 45%',
  },
  {
    badge: '🛡️ 100% Verified Community',
    title: 'Selamat & Dipercayai\nTanpa Ragu',
    subtitle:
      'Every host and merchant is community-verified. Safe QR pickup codes and secure transactions.',
    illustration: '✨',
    stat: '4.9 ★ Community Trust',
  },
  {
    badge: '📦 Hyperlocal Pickup',
    title: 'Ambil Dekat Rumah,\nSifar Caj Penghantaran',
    subtitle:
      'Collect your fresh produce, kuih-muih & gadgets directly from your residential community hub.',
    illustration: '🏘️',
    stat: 'RM 0 Delivery Fees',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const isLast = current === SCREENS.length - 1;

  const handleNext = () => {
    if (isLast) {
      navigation.replace('Login');
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const handleSkip = () => {
    navigation.replace('Login');
  };

  const handleExplore = () => {
    navigation.replace('Main');
  };

  const screen = SCREENS[current];

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
      justifyContent: 'space-between',
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    brandBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : colors['primary-subtle'],
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
    },
    brandBadgeText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
      color: colors['primary-container'],
      fontWeight: '700',
    },
    skipBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    skipText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: colors['on-surface-variant'],
      fontWeight: '600',
    },
    heroCard: {
      backgroundColor: isDark ? colors['surface-container'] : colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      ...shadows.card,
    },
    illustrationRing: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: isDark ? 'rgba(255, 107, 53, 0.12)' : colors['primary-subtle'],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 107, 53, 0.3)' : 'rgba(255, 107, 53, 0.2)',
    },
    illustrationText: {
      fontSize: 68,
    },
    screenBadge: {
      backgroundColor: colors['secondary-subtle'],
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      marginBottom: spacing.md,
    },
    screenBadgeText: {
      fontFamily: BODY_FONT,
      fontSize: 12,
      color: colors['secondary'],
      fontWeight: '700',
    },
    title: {
      fontFamily: DISPLAY_FONT,
      fontSize: 26,
      fontWeight: '800',
      color: colors['on-background'],
      textAlign: 'center',
      marginBottom: spacing.sm,
      lineHeight: 34,
    },
    subtitle: {
      fontFamily: BODY_FONT,
      fontSize: 14.5,
      color: colors['on-surface-variant'],
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: spacing.sm,
    },
    statPill: {
      marginTop: spacing.md,
      backgroundColor: isDark ? 'rgba(0, 137, 123, 0.15)' : '#E0F2F1',
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
    },
    statPillText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 12.5,
      color: '#00695C',
      fontWeight: '700',
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginVertical: spacing.lg,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors['outline'],
    },
    dotActive: {
      width: 28,
      borderRadius: 6,
      backgroundColor: colors['primary-container'],
    },
    actionSection: {
      gap: spacing.sm,
      paddingBottom: Math.max(insets.bottom, 20),
    },
    exploreBtn: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    exploreBtnText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: colors['primary-container'],
      fontWeight: '600',
    },
  });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={s.topBar}>
        <View style={s.brandBadge}>
          <Text style={s.brandBadgeText}>KitaTolongKita 🤝</Text>
        </View>
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipText}>Sign In ›</Text>
        </TouchableOpacity>
      </View>

      {/* Main Hero Card */}
      <View style={s.heroCard}>
        <View style={s.illustrationRing}>
          <Text style={s.illustrationText}>{screen.illustration}</Text>
        </View>
        <View style={s.screenBadge}>
          <Text style={s.screenBadgeText}>{screen.badge}</Text>
        </View>
        <Text style={s.title}>{screen.title}</Text>
        <Text style={s.subtitle}>{screen.subtitle}</Text>
        <View style={s.statPill}>
          <Text style={s.statPillText}>⚡ {screen.stat}</Text>
        </View>
      </View>

      {/* Progress Dots */}
      <View style={s.dotsRow}>
        {SCREENS.map((_, i) => (
          <View key={i} style={[s.dot, i === current && s.dotActive]} />
        ))}
      </View>

      {/* Action Buttons */}
      <View style={s.actionSection}>
        <Button
          title={isLast ? 'Get Started 🚀' : 'Next ›'}
          onPress={handleNext}
          fullWidth
          variant="primary"
        />

        <TouchableOpacity style={s.exploreBtn} onPress={handleExplore} activeOpacity={0.7}>
          <Text style={s.exploreBtnText}>👀 Explore Deals as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};



