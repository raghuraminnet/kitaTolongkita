import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface DealCardProps {
  title: string;
  price: string;
  originalPrice?: string;
  location: string;
  imageUrl?: string;
  countdown?: string;
  membersJoined: number;
  membersTarget: number;
  onPress?: () => void;
}

export const DealCard: React.FC<DealCardProps> = ({
  title,
  price,
  originalPrice,
  location,
  imageUrl,
  countdown,
  membersJoined,
  membersTarget,
  onPress,
}) => {
  const progress = Math.min((membersJoined / membersTarget) * 100, 100);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image Header */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>🛒</Text>
          </View>
        )}

        {/* Countdown Badge */}
        {countdown && (
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{price}</Text>
          {originalPrice && (
            <Text style={styles.originalPrice}>{originalPrice}</Text>
          )}
        </View>

        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        </View>
      </View>

      {/* Footer - Progress Bar */}
      <View style={styles.footer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {membersJoined} joined
          </Text>
          <Text style={styles.progressTarget}>
            {membersTarget} needed
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: colors['surface-container'],
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['surface-container-high'],
  },
  placeholderText: {
    fontSize: 40,
  },
  countdownBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  countdownText: {
    ...typography['label-sm'],
    color: colors.white,
    fontWeight: '700',
    fontSize: 11,
  },
  body: {
    padding: spacing.md,
  },
  title: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  price: {
    ...typography['title-md'],
    color: colors['primary-container'],
    fontWeight: '700',
  },
  originalPrice: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    textDecorationLine: 'line-through',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    fontSize: 12,
  },
  location: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    ...typography['label-sm'],
    color: colors.secondary,
    fontWeight: '600',
  },
  progressTarget: {
    ...typography['label-sm'],
    color: colors['on-surface-variant'],
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors['surface-container-high'],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
  },
});
