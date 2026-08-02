import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components';
import { typography, spacing } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

const SCREENS = [
  {
    emoji: '🤝',
    title: 'Gotong Royong,\nLebih Jimat!',
    subtitle:
      'Join forces with your neighbors to unlock group deals and save together.',
    illustration: '🛒',
  },
  {
    emoji: '🔒',
    title: 'Safe & Verified\nCommunity',
    subtitle:
      'Every seller is verified. Every transaction is secure. Your trust is our priority.',
    illustration: '🛡️',
  },
  {
    emoji: '💰',
    title: 'Split Deals,\nShare the Joy',
    subtitle:
      'Found a great deal? Share it with your community and unlock lower prices for everyone.',
    illustration: '💸',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
    },
    skip: {
      ...typography['body-lg'],
      color: colors['on-surface-variant'],
      alignSelf: 'flex-end',
      paddingVertical: spacing.md,
    },
    illustration: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    illustrationText: {
      fontSize: 120,
    },
    content: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      ...typography['display-lg'],
      color: colors['on-background'],
      textAlign: 'center',
      marginBottom: spacing.md,
      lineHeight: 40,
    },
    subtitle: {
      ...typography['body-lg'],
      color: colors['on-surface-variant'],
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
      lineHeight: 26,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors['outline-variant'],
    },
    dotActive: {
      width: 24,
      backgroundColor: colors['primary-container'],
    },
    buttons: {
      gap: spacing.sm,
    },
  });
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

  const screen = SCREENS[current];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Skip */}
      {!isLast && (
        <Text style={styles.skip} onPress={handleSkip}>
          Skip
        </Text>
      )}

      {/* Illustration */}
      <View style={styles.illustration}>
        <Text style={styles.illustrationText}>{screen.illustration}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{screen.title}</Text>
        <Text style={styles.subtitle}>{screen.subtitle}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SCREENS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === current && styles.dotActive]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={[styles.buttons, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Button
          title={isLast ? 'Get Started' : 'Next'}
          onPress={handleNext}
          fullWidth
          variant="primary"
        />
        {!isLast && (
          <Button
            title="Back"
            onPress={() => setCurrent((c) => Math.max(0, c - 1))}
            fullWidth
            variant="ghost"
          />
        )}
      </View>
    </View>
  );
};


