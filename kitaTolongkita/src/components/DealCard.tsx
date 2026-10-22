import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { typography, spacing, borderRadius, shadows } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { timeUntil } from '../utils/time';
import { MapPin, Clock, Bookmark, Heart, ThumbsUp, ShieldCheck, Leaf, Check, Package, User } from 'lucide-react-native';

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
  halalStatus?: string;
  state?: string;
  layout?: 'list' | 'grid';
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
  halalStatus,
  state,
  layout = 'list',
  onPress,
  onBookmarkPress,
}) => {
  const isGrid = layout === 'grid';
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

  const renderHalalBadge = () => {
    if (!halalStatus || halalStatus === 'NotApplicable' || halalStatus === 'None') return null;
    let label = '';
    let bg = '#ECFDF5';
    let text = '#047857';
    let border = '#A7F3D0';
    let Icon = ShieldCheck;

    if (halalStatus === 'JakimCertified' || halalStatus === 'JakimHalal') {
      label = 'JAKIM Halal';
      bg = '#ECFDF5';
      text = '#047857';
      border = '#A7F3D0';
      Icon = ShieldCheck;
    } else if (halalStatus === 'MuslimOwned') {
      label = 'Muslim-Owned';
      bg = '#F0FDF4';
      text = '#15803D';
      border = '#BBF7D0';
      Icon = Check;
    } else if (halalStatus === 'PorkFree') {
      label = 'Pork-Free';
      bg = '#FFFBEB';
      text = '#B45309';
      border = '#FDE68A';
      Icon = Check;
    } else if (halalStatus === 'Vegetarian') {
      label = 'Vegetarian';
      bg = '#F0FDF4';
      text = '#166534';
      border = '#BBF7D0';
      Icon = Leaf;
    } else {
      return null;
    }

    return (
      <View style={[styles.halalBadge, { backgroundColor: bg, borderColor: border, flexDirection: 'row', alignItems: 'center' }]}>
        <Icon size={11} color={text} strokeWidth={2.5} style={{ marginRight: 4 }} />
        <Text style={[styles.halalBadgeText, { color: text }]}>{label}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isGrid && styles.cardGrid,
        {
          backgroundColor: isDark ? colors['surface-container'] : colors.white,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* ── Image Header ─────────────────────────────── */}
      <View style={[styles.imageContainer, isGrid && styles.imageContainerGrid]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: isDark ? colors['surface-container-high'] : '#F1F5F9' },
            ]}
          >
            <Package size={isGrid ? 28 : 36} color={colors['on-surface-variant']} strokeWidth={1.5} />
          </View>
        )}

        {/* Discount Badge */}
        {discountPct > 0 && (
          <View style={[styles.discountBadge, isGrid && styles.discountBadgeGrid, { backgroundColor: colors['primary-container'] }]}>
            <Text style={[styles.discountText, isGrid && styles.discountTextGrid]}>-{discountPct}%</Text>
          </View>
        )}

        {/* Countdown Badge */}
        {countdown && !isGrid && (
          <View style={styles.countdownBadge}>
            <Clock size={11} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 4 }} />
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        {/* Bookmark Action */}
        <TouchableOpacity
          style={[
            styles.bookmarkBtn,
            isGrid && styles.bookmarkBtnGrid,
            { backgroundColor: isSaved ? colors['primary-container'] : 'rgba(15, 23, 42, 0.5)' },
          ]}
          onPress={onBookmarkPress || onPress}
          activeOpacity={0.8}
        >
          <Bookmark
            size={isGrid ? 12 : 14}
            color="#ffffff"
            fill={isSaved ? '#ffffff' : 'none'}
            strokeWidth={2.2}
          />
        </TouchableOpacity>
      </View>

      {/* ── Card Body ───────────────────────────────── */}
      <View style={[styles.body, isGrid && styles.bodyGrid]}>
        {!isGrid && renderHalalBadge()}

        {/* Title */}
        <Text
          style={[styles.title, isGrid && styles.titleGrid, { color: colors['on-surface'] }]}
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Price Row */}
        <View style={[styles.priceRow, isGrid && styles.priceRowGrid]}>
          <Text style={[styles.price, isGrid && styles.priceGrid, { color: colors['primary-container'] }]}>
            {price}
          </Text>
          {originalPrice && (
            <Text style={[styles.originalPrice, isGrid && styles.originalPriceGrid, { color: colors['on-surface-variant'] }]}>
              {originalPrice}
            </Text>
          )}
        </View>

        {/* Location & Host */}
        <View style={[styles.metaRow, isGrid && styles.metaRowGrid]}>
          <MapPin size={isGrid ? 11 : 13} color={colors['on-surface-variant']} strokeWidth={2} style={{ marginRight: 3 }} />
          <Text style={[styles.location, isGrid && styles.locationGrid, { color: colors['on-surface-variant'] }]} numberOfLines={1}>
            {location}
          </Text>
        </View>

        {/* ── Community Group-Buy Meter ────────────── */}
        <View style={[styles.meterSection, isGrid && styles.meterSectionGrid]}>
          <View style={[styles.meterHeader, isGrid && styles.meterHeaderGrid]}>
            {/* Social Avatars + Count */}
            <View style={styles.avatarStack}>
              <View style={[styles.miniAvatar, isGrid && styles.miniAvatarGrid, { backgroundColor: '#FF6B35' }]}>
                <User size={isGrid ? 8 : 10} color="#ffffff" strokeWidth={2.6} />
              </View>
              <View style={[styles.miniAvatar, isGrid && styles.miniAvatarGrid, { backgroundColor: '#00897B', marginLeft: -5 }]}>
                <User size={isGrid ? 8 : 10} color="#ffffff" strokeWidth={2.6} />
              </View>
              <Text style={[styles.meterJoinedText, isGrid && styles.meterJoinedTextGrid, { color: colors['on-surface'] }]}>
                {membersJoined}/{membersTarget}
              </Text>
            </View>

            {/* Slots status */}
            <Text
              style={[
                styles.slotsText,
                isGrid && styles.slotsTextGrid,
                { color: isGoalReached ? colors.secondary : colors['primary-container'] },
              ]}
            >
              {isGoalReached ? '✓' : `${slotsRemaining} left`}
            </Text>
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressTrack,
              isGrid && styles.progressTrackGrid,
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
    marginBottom: 10,
  },
  cardGrid: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 10,
    borderRadius: 14,
  },

  /* ── Image ─────────────────────────────────────── */
  imageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: '#F1F5F9',
  },
  imageContainerGrid: {
    height: 114,
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
  discountBadgeGrid: {
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  discountTextGrid: {
    fontSize: 9.5,
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
  bookmarkBtnGrid: {
    top: 6,
    right: 6,
    width: 25,
    height: 25,
    borderRadius: 12.5,
  },

  /* ── Body ──────────────────────────────────────── */
  body: {
    padding: 12,
  },
  bodyGrid: {
    padding: 8,
  },
  title: {
    ...typography['title-md'],
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 5,
  },
  titleGrid: {
    fontSize: 12.5,
    lineHeight: 16,
    marginBottom: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  priceRowGrid: {
    marginBottom: 3,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
    letterSpacing: -0.3,
  },
  priceGrid: {
    fontSize: 14.5,
    marginRight: 4,
  },
  originalPrice: {
    fontSize: 12.5,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  originalPriceGrid: {
    fontSize: 10.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaRowGrid: {
    marginBottom: 5,
  },
  location: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  locationGrid: {
    fontSize: 10.5,
  },

  /* ── Meter Section ─────────────────────────────── */
  meterSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  meterSectionGrid: {
    paddingTop: 5,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  meterHeaderGrid: {
    marginBottom: 3,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  miniAvatarGrid: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  avatarEmoji: {
    fontSize: 10,
  },
  meterJoinedText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 5,
  },
  meterJoinedTextGrid: {
    fontSize: 9.5,
    marginLeft: 3,
  },
  slotsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  slotsTextGrid: {
    fontSize: 9.5,
  },
  progressTrack: {
    height: 5,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressTrackGrid: {
    height: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  halalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: 6,
  },
  halalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
