import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Input, ProgressBar } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

interface CheckoutScreenProps {
  route?: any;
  navigation?: any;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const deal = route.params?.deal || {
    title: 'Aneka Kuih Muih — Premium Ramadan Set A',
    groupPrice: 25,
    membersJoined: 67,
    maxMembers: 100,
  };

  const [quantity, setQuantity] = useState(1);
  const [pickupLocation, setPickupLocation] = useState('Pasar Malam Taman Melawati');

  const subtotal = (deal.groupPrice ?? 0) * quantity;
  const platformFee = subtotal * 0.02;
  const total = subtotal + platformFee;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Group Buy Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Group Buy Status</Text>
            <Text style={styles.progressCount}>
              {deal.membersJoined}/{deal.maxMembers} joined
            </Text>
          </View>
          <ProgressBar
            current={deal.membersJoined}
            total={deal.maxMembers}
            height={8}
            showText={false}
          />
          <Text style={styles.progressHint}>
            🎉 {deal.maxMembers - deal.membersJoined} more needed to confirm this deal!
          </Text>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.card}>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Item</Text>
              <Text style={styles.orderValue}>{deal.title}</Text>
            </View>

            <View style={styles.divider} />

            {/* Quantity Selector */}
            <View style={styles.quantityRow}>
              <Text style={styles.orderLabel}>Quantity</Text>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Text style={styles.quantityBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Text style={styles.quantityBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Subtotal</Text>
              <Text style={styles.orderValue}>RM {subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Platform Fee (2%)</Text>
              <Text style={styles.orderValue}>RM {platformFee.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Pickup Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Location</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.locationOption}>
              <View style={styles.locationLeft}>
                <Text style={styles.locationIcon}>📍</Text>
                <View>
                  <Text style={styles.locationName}>{pickupLocation}</Text>
                  <Text style={styles.locationAddress}>
                    Jln Hulu Kelang, Taman Melawati, 53100 Kuala Lumpur
                  </Text>
                </View>
              </View>
              <Text style={styles.changeBtn}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.paymentOption}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentIcon}>💳</Text>
                <Text style={styles.paymentName}>Credit / Debit Card</Text>
              </View>
              <View style={styles.radioSelected} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.paymentOption}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentIcon}>🏦</Text>
                <View>
                  <Text style={styles.paymentName}>Online Banking</Text>
                  <Text style={styles.paymentSub}>FPX, Maybank, CIMB, etc.</Text>
                </View>
              </View>
              <View style={styles.radio} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.paymentOption}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentIcon}>📱</Text>
                <View>
                  <Text style={styles.paymentName}>E-Wallet</Text>
                  <Text style={styles.paymentSub}>Touch 'n Go, GrabPay</Text>
                </View>
              </View>
              <View style={styles.radio} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Total */}
      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>RM {total.toFixed(2)}</Text>
        </View>
        <Button
          title="Commit Order"
          onPress={() => navigation.navigate('OrderConfirmed', { dealId: deal.id, quantity })}
          variant="primary"
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
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
    color: colors['on-surface'],
  },
  title: {
    ...typography['title-md'],
    color: colors['on-background'],
  },
  progressCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors['secondary-container'],
    borderRadius: borderRadius.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressTitle: {
    ...typography['body-md'],
    color: colors['on-secondary-container'],
    fontWeight: '600',
  },
  progressCount: {
    ...typography['body-md'],
    color: colors['on-secondary-container'],
    fontWeight: '700',
  },
  progressHint: {
    ...typography['label-sm'],
    color: colors['on-secondary-container'],
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography['title-md'],
    color: colors['on-background'],
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  orderLabel: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
  },
  orderValue: {
    ...typography['body-md'],
    color: colors['on-surface'],
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors['outline-variant'],
    marginVertical: spacing.md,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors['surface-container'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors['primary-container'],
  },
  quantityValue: {
    ...typography['title-md'],
    color: colors['on-surface'],
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  locationName: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    fontWeight: '600',
  },
  locationAddress: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    marginTop: 2,
  },
  changeBtn: {
    ...typography['body-md'],
    color: colors['primary-container'],
    fontWeight: '600',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  paymentName: {
    ...typography['body-lg'],
    color: colors['on-surface'],
    fontWeight: '600',
  },
  paymentSub: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors['outline-variant'],
  },
  radioSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors['primary-container'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors['surface-container-lowest'],
    ...shadows.modal,
  },
  totalLabel: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
  },
  totalValue: {
    ...typography['headline-lg'],
    color: colors['on-surface'],
    fontWeight: '800',
  },
  ctaButton: {
    minWidth: 180,
  },
});
