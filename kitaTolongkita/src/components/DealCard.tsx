import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius, shadows } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { timeUntil } from '../utils/time';
import { MapPin, Clock, Bookmark, Heart, ThumbsUp } from 'lucide-react-native';

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
  onBookmarkPress?: () => void;
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
  onBookmarkPress,
}) => {
  const { colors, isDark } = useTheme();

  const safeTarget = membersTarget > 0 ? membersTarget : 1;
  const progress = Math.min((membersJoined / safeTarget) * 100, 100);
  const countdown = deadline ? timeUntil(deadline) : null;
  const isGoalReached = membersJoined >= safeTarget;
  const slotsRemaining = Math.max(safeTarget - membersJoined, 0);

  // Compute discount percentage if original price is available
  let discountPct = 0;
  if (originalPrice) {
    const numPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    const numOrig = parseFloat(originalPrice.replace(/[^0-9.]/g, ''));
    if (numOrig > numPrice && numOrig > 0) {
      discountPct = Math.round(((numOrig - numPrice) / numOrig) * 100);
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors['surface-container'] : colors.white,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* ── Image Header ─────────────────────────────── */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: isDark ? colors['surface-container-high'] : '#F1F5F9' },
            ]}
          >
            <Text style={styles.placeholderEmoji}>📦</Text>
          </View>
        )}

        {/* Discount Badge */}
        {discountPct > 0 && (
          <View style={[styles.discountBadge, { backgroundColor: colors['primary-container'] }]}>
            <Text style={styles.discountText}>-{discountPct}%</Text>
          </View>
        )}

        {/* Countdown Badge */}
        {countdown && (
          <View style={styles.countdownBadge}>
            <Clock size={11} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 4 }} />
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        {/* Bookmark Action */}
        <TouchableOpacity
          style={[
            styles.bookmarkBtn,
            { backgroundColor: isSaved ? colors['primary-container'] : 'rgba(15, 23, 42, 0.5)' },
          ]}
          onPress={onBookmarkPress || onPress}
          activeOpacity={0.8}
        >
          <Bookmark
            size={14}
            color="#ffffff"
            fill={isSaved ? '#ffffff' : 'none'}
            strokeWidth={2.2}
          />
        </TouchableOpacity>
      </View>

      {/* ── Card Body ───────────────────────────────── */}
      <View style={styles.body}>
        {/* Title */}
        <Text
          style={[styles.title, { color: colors['on-surface'] }]}
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors['primary-container'] }]}>
            {price}
          </Text>
          {originalPrice && (
            <Text style={[styles.originalPrice, { color: colors['on-surface-variant'] }]}>
              {originalPrice}
            </Text>
          )}
        </View>

        {/* Location & Host */}
        <View style={styles.metaRow}>
          <MapPin size={13} color={colors['on-surface-variant']} strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={[styles.location, { color: colors['on-surface-variant'] }]} numberOfLines={1}>
            {location}
          </Text>
        </View>

        {/* ── Community Group-Buy Meter ────────────── */}
        <View style={styles.meterSection}>
          <View style={styles.meterHeader}>
            {/* Social Avatars + Count */}
            <View style={styles.avatarStack}>
              <View style={[styles.miniAvatar, { backgroundColor: '#FF6B35' }]}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
              <View style={[styles.miniAvatar, { backgroundColor: '#00897B', marginLeft: -6 }]}>
                <Text style={styles.avatarEmoji}>🧑</Text>
              </View>
              <Text style={[styles.meterJoinedText, { color: colors['on-surface'] }]}>
                {membersJoined}/{membersTarget} joined
              </Text>
            </View>

            {/* Slots status */}
            <Text
              style={[
                styles.slotsText,
                { color: isGoalReached ? colors.secondary : colors['primary-container'] },
              ]}
            >
              {isGoalReached ? 'Unlocked! ✓' : `${slotsRemaining} slots left`}
            </Text>
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: isGoalReached ? colors.secondary : colors['primary-container'],
                },
              ]}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
    marginBottom: spacing.md,
  },

  /* ── Image ─────────────────────────────────────── */
  imageContainer: {
    position: 'relative',
    height: 155,
    backgroundColor: '#F1F5F9',
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
  },
  placeholderEmoji: {
    fontSize: 42,
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  countdownBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: borderRadius.full,
  },
  countdownText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Body ──────────────────────────────────────── */
  body: {
    padding: spacing.md,
  },
  title: {
    ...typography['title-md'],
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  price: {
    fontSize: 19,
    fontWeight: '800',
    marginRight: 8,
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  location: {
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },

  /* ── Meter Section ─────────────────────────────── */
  meterSection: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarEmoji: {
    fontSize: 10,
  },
  meterJoinedText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  slotsText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
