import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, ProgressBar, Avatar } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { dealsApi } from '../../api/client';
import type { Deal } from '../../api/client';

const MOCK_DEAL: Deal = {
  id: '1',
  title: 'Aneka Kuih Muih — Premium Ramadan Set A',
  description: 'Premium quality kuih muih assortment perfect for Ramadan gatherings. Contains 12 varieties of traditional Malaysian kuih including kuih lapis, kuih kochi, onde-onde, and more. Freshly made daily.',
  category: 'Food',
  originalPrice: 38,
  groupPrice: 25,
  minMembers: 50,
  maxMembers: 100,
  membersJoined: 42,
  deadline: new Date(Date.now() + 216000000).toISOString(),
  pickupLocation: 'Pasar Malam Taman Melawati, Jln Hulu Kelang, 53100 Kuala Lumpur',
  imageUrls: [],
  status: 'Active',
  organizerName: 'Nur Aisyah Boutique',
  createdAt: new Date().toISOString(),
};

export const DealDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  const dealId = route.params?.dealId;
  const dealParam = route.params?.deal;

  useEffect(() => {
    loadDeal();
  }, []);

  const loadDeal = async () => {
    try {
      if (dealId) {
        const data = await dealsApi.getById(dealId);
        setDeal(data);
      } else {
        setDeal(dealParam ?? MOCK_DEAL);
      }
    } catch {
      setDeal(dealParam ?? MOCK_DEAL);
    } finally {
      setLoading(false);
    }
  };

  const displayDeal = deal ?? MOCK_DEAL;

  const discount = Math.round((1 - displayDeal.groupPrice / displayDeal.originalPrice) * 100);
  const countdown = getCountdown(displayDeal.deadline);
  const spotsLeft = displayDeal.maxMembers - displayDeal.membersJoined;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {displayDeal.imageUrls?.[0] ? (
            <Image source={{ uri: displayDeal.imageUrls[0] }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>🛒</Text>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={[styles.shareBtn, { top: insets.top + 8 }]}>
            <Text style={{ fontSize: 18 }}>📤</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Price & Title */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>RM {displayDeal.groupPrice.toFixed(2)}</Text>
            <Text style={styles.originalPrice}>RM {displayDeal.originalPrice.toFixed(2)}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          </View>

          <Text style={styles.title}>{displayDeal.title}</Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownIcon}>⏰</Text>
            <Text style={styles.countdownLabel}>Ends in: </Text>
            <Text style={styles.countdownValue}>{countdown}</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Group Buy Progress</Text>
              <Text style={styles.progressValue}>
                {displayDeal.membersJoined} / {displayDeal.maxMembers} joined
              </Text>
            </View>
            <ProgressBar
              current={displayDeal.membersJoined}
              total={displayDeal.maxMembers}
              height={10}
              showText={false}
            />
            <Text style={styles.progressSubtext}>
              {spotsLeft > 0 ? `${spotsLeft} more needed to unlock deal` : 'Deal unlocked! 🥳'}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Seller Info */}
          <View style={styles.sellerSection}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <View style={styles.sellerCard}>
              <Avatar name={displayDeal.organizerName} size={48} verified />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{displayDeal.organizerName}</Text>
                <Text style={styles.sellerMeta}>📍 {displayDeal.pickupLocation?.split(',')[0] ?? 'Kuala Lumpur'}</Text>
              </View>
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => navigation.navigate('ChatInbox')}
              >
                <Text style={{ fontSize: 18 }}>💬</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{displayDeal.description}</Text>
          </View>

          {/* Pickup Location */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <View style={styles.locationCard}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{displayDeal.pickupLocation.split(',')[0]}</Text>
                <Text style={styles.locationAddress}>{displayDeal.pickupLocation}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.ctaLeft}>
          <Text style={styles.ctaPrice}>RM {displayDeal.groupPrice.toFixed(2)}</Text>
          <Text style={styles.ctaLabel}>per pack</Text>
        </View>
        <Button
          title="Join Group Buy"
          onPress={() => navigation.navigate('Checkout', { deal: displayDeal })}
          variant="primary"
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
};

function getCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 100 },
  imageContainer: { height: 300, backgroundColor: colors['surface-container'], position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors['surface-container-high'] },
  placeholderEmoji: { fontSize: 64 },
  backBtn: { position: 'absolute', left: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, fontWeight: '600', color: colors['on-surface'] },
  shareBtn: { position: 'absolute', right: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  price: { fontFamily: 'NunitoSans_800ExtraBold', fontSize: 32, fontWeight: '800', color: colors['primary-container'] },
  originalPrice: { fontFamily: 'NunitoSans_700Bold', fontSize: 20, fontWeight: '700', color: colors['on-surface-variant'], textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: colors.error, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginLeft: spacing.xs },
  discountText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '700', color: colors.white },
  title: { fontFamily: 'NunitoSans_700Bold', fontSize: 22, fontWeight: '700', color: colors['on-background'], marginBottom: spacing.md, lineHeight: 30 },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors['secondary-container'], paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.lg },
  countdownIcon: { fontSize: 16, marginRight: spacing.xs },
  countdownLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-secondary-container'] },
  countdownValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '700', color: colors['on-secondary-container'] },
  progressSection: { marginBottom: spacing.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface'], fontWeight: '600' },
  progressValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '700', color: colors.secondary },
  progressSubtext: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'], marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors['outline-variant'], marginVertical: spacing.lg },
  sellerSection: { marginBottom: 0 },
  sectionTitle: { fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700', color: colors['on-background'], marginBottom: spacing.md },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors['surface-container-lowest'], padding: spacing.md, borderRadius: borderRadius.lg, ...shadows.card },
  sellerInfo: { flex: 1, marginLeft: spacing.md },
  sellerName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', color: colors['on-surface'], marginBottom: 2 },
  sellerMeta: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors['on-surface-variant'] },
  messageBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors['surface-container'], alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 0 },
  description: { fontFamily: 'Inter_400Regular', fontSize: 16, color: colors['on-surface'], lineHeight: 26 },
  locationCard: { flexDirection: 'row', backgroundColor: colors['surface-container-lowest'], padding: spacing.md, borderRadius: borderRadius.lg, ...shadows.card },
  locationIcon: { fontSize: 24, marginRight: spacing.md },
  locationInfo: { flex: 1 },
  locationName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', color: colors['on-surface'], marginBottom: 2 },
  locationAddress: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors['on-surface-variant'], lineHeight: 20 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, backgroundColor: colors['surface-container-lowest'], ...shadows.modal },
  ctaLeft: { marginRight: spacing.lg },
  ctaPrice: { fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700', color: colors['on-surface'] },
  ctaLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'] },
  ctaButton: { flex: 1 },
});
