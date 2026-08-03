import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { timeUntil } from '../utils/time';

interface DealCardProps {
  title: string;
  price: string;
  originalPrice?: string;
  location: string;
  imageUrl?: string;
  /** ISO deadline string */
  deadline?: string;
  membersJoined: number;
  membersTarget: number;
  /** Number of likes — shown as social proof */
  likes?: number;
  /** Number of upvotes — shown as social proof */
  upvotes?: number;
  /** Organizer display name */
  organizerName?: string;
  /** Organizer avatar URL */
  organizerAvatar?: string;
  isSaved?: boolean;
  onPress?: () => void;
}

export const DealCard: React.FC<DealCardProps> = ({
  title,
  price,
  originalPrice,
  location,
  imageUrl,
  deadline,
  membersJoined,
  membersTarget,
  likes = 0,
  upvotes = 0,
  organizerName,
  organizerAvatar,
  isSaved,
  onPress,
}) => {
  const progress = Math.min((membersJoined / membersTarget) * 100, 100);
  const countdown = deadline ? timeUntil(deadline) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* ── Image Header ─────────────────────────────── */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>🛒</Text>
          </View>
        )}

        {/* Countdown badge */}
        {countdown && (
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        {/* Saved bookmark */}
        {isSaved && (
          <View style={styles.savedBadge}>
            <Text style={{ fontSize: 13 }}>🔖</Text>
          </View>
        )}
      </View>

      {/* ── Body ─────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{price}</Text>
          {originalPrice && (
            <Text style={styles.originalPrice}>{originalPrice}</Text>
          )}
        </View>

        {/* Social proof row */}
        {(likes > 0 || upvotes > 0) && (
          <View style={styles.socialRow}>
            {upvotes > 0 && (
              <View style={styles.socialItem}>
                <Text style={styles.socialIcon}>👍</Text>
                <Text style={styles.socialCount}>{upvotes}</Text>
              </View>
            )}
            {likes > 0 && (
              <View style={styles.socialItem}>
                <Text style={styles.socialIcon}>❤️</Text>
                <Text style={styles.socialCount}>{likes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Location + Organizer row */}
        <View style={styles.metaRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        </View>

        {/* Organizer */}
        {organizerName && (
          <View style={styles.organizerRow}>
            {organizerAvatar ? (
              <Image source={{ uri: organizerAvatar }} style={styles.organizerAvatar} />
            ) : (
              <View style={styles.organizerAvatarPlaceholder}>
                <Text style={styles.organizerInitial}>
                  {organizerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.organizerName} numberOfLines={1}>
              {organizerName}
            </Text>
          </View>
        )}
      </View>

      {/* ── Footer — Progress Bar ────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{membersJoined} joined</Text>
          <Text style={styles.progressTarget}>{membersTarget} needed</Text>
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

  /* ── Image ─────────────────────────────────────── */
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
  placeholderEmoji: {
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
  savedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Body ──────────────────────────────────────── */
  body: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  price: {
    ...typography['title-md'],
    color: colors.primary,          // darker amber — readable on warm bg
    fontWeight: '800',
    fontSize: 18,
  },
  originalPrice: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    textDecorationLine: 'line-through',
  },

  /* Social proof */
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  socialIcon: {
    fontSize: 13,
  },
  socialCount: {
    ...typography['label-sm'],
    color: colors['on-surface-variant'],
  },

  /* Location */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationIcon: {
    fontSize: 12,
  },
  location: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    flex: 1,
    fontSize: 13,
  },

  /* Organizer */
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  organizerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors['surface-container-high'],
  },
  organizerAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors['secondary-container'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerInitial: {
    fontSize: 10,
    fontWeight: '700',
    color: colors['on-secondary-container'],
  },
  organizerName: {
    ...typography['label-sm'],
    color: colors['on-surface-variant'],
    flex: 1,
    fontSize: 12,
  },

  /* ── Footer ────────────────────────────────────── */
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
