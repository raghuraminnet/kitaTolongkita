import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

interface SkeletonCardProps {
  width?: number | string;
}

/**
 * Animated shimmer skeleton card — mimics DealCard layout.
 * Uses Animated API (no Reanimated needed) for broad compatibility.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({ width = '100%' }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <View style={[styles.card, typeof width === 'number' ? { width } : {}]}>
      {/* Image skeleton */}
      <Animated.View style={[styles.image, { opacity }]} />

      {/* Body skeleton */}
      <View style={styles.body}>
        <Animated.View style={[styles.lineShort, { opacity }]} />
        <Animated.View style={[styles.lineMedium, { opacity }]} />

        <View style={styles.priceRow}>
          <Animated.View style={[styles.priceBadge, { opacity }]} />
          <Animated.View style={[styles.priceStrike, { opacity }]} />
        </View>

        <Animated.View style={[styles.lineLong, { opacity }]} />
      </View>

      {/* Footer skeleton */}
      <View style={styles.footer}>
        <Animated.View style={[styles.progressTrack, { opacity }]}>
          <Animated.View style={[styles.progressFill, { opacity }]} />
        </Animated.View>
        <Animated.View style={[styles.lineShort, { opacity, marginTop: 6 }]} />
      </View>
    </View>
  );
};

const ShimmerRect = ({ width, height, style }: { width: string | number; height: number; style?: any }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const s = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true })
    );
    s.start();
    return () => s.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });
  return <Animated.View style={[{ width, height, borderRadius: borderRadius.sm, backgroundColor: colors['on-surface-variant'], opacity }, style]} />;
};

export const SkeletonLine: React.FC<{ width?: string | number; height?: number; style?: any }> = ({
  width = '100%',
  height = 14,
  style,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const s = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true })
    );
    s.start();
    return () => s.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });
  return <Animated.View style={[{ width, height, borderRadius: borderRadius.sm, backgroundColor: colors['on-surface-variant'], opacity }, style]} />;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    height: 140,
    backgroundColor: colors['surface-container-high'],
    borderRadius: borderRadius.lg,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  lineShort: {
    height: 12,
    width: '45%',
    borderRadius: borderRadius.sm,
    backgroundColor: colors['on-surface-variant'],
  },
  lineMedium: {
    height: 16,
    width: '75%',
    borderRadius: borderRadius.sm,
    backgroundColor: colors['on-surface-variant'],
  },
  lineLong: {
    height: 12,
    width: '60%',
    borderRadius: borderRadius.sm,
    backgroundColor: colors['on-surface-variant'],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  priceBadge: {
    height: 20,
    width: 70,
    borderRadius: borderRadius.sm,
    backgroundColor: colors['on-surface-variant'],
  },
  priceStrike: {
    height: 14,
    width: 50,
    borderRadius: borderRadius.sm,
    backgroundColor: colors['on-surface-variant'],
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors['surface-container-high'],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: colors['on-surface-variant'],
    borderRadius: borderRadius.full,
  },
});
