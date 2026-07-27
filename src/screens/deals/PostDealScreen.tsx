import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

interface PostDealScreenProps {
  navigation?: any;
}

const CATEGORIES = ['Food', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Drinks'];

export const PostDealScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [targetMembers, setTargetMembers] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [step, setStep] = useState(1);

  const handleSubmit = () => {
    navigation?.replace('PostReview');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Deal</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.steps}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepRow}>
            <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
            </View>
            {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <View style={styles.imageUpload}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Add Photos</Text>
              <Text style={styles.uploadHint}>Up to 5 photos. First photo is the cover.</Text>
            </View>

            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const icons: Record<string, string> = {
                  Food: '🍔', Electronics: '📱', Fashion: '👗', Home: '🏠', Beauty: '💄', Sports: '⚽', Drinks: '🥤',
                };
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryItem, selectedCategory === cat && styles.categoryItemSelected]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={styles.categoryEmoji}>{icons[cat] || '📦'}</Text>
                    <Text style={[styles.categoryName, selectedCategory === cat && styles.categoryNameSelected]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Deal Title"
              placeholder="e.g. Premium Kuih Muih Set for Ramadan"
              value={title}
              onChangeText={setTitle}
              containerStyle={styles.input}
            />

            <Button title="Next: Pricing" onPress={() => setStep(2)} fullWidth variant="primary" />
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.priceRow}>
              <Input
                label="Group Buy Price (MYR)"
                placeholder="25.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                prefix="RM"
                containerStyle={styles.priceInput}
              />
              <Input
                label="Original Price (MYR)"
                placeholder="38.00"
                value={originalPrice}
                onChangeText={setOriginalPrice}
                keyboardType="decimal-pad"
                prefix="RM"
                containerStyle={styles.priceInput}
              />
            </View>

            <Input
              label="Minimum Members to Unlock"
              placeholder="50"
              value={targetMembers}
              onChangeText={setTargetMembers}
              keyboardType="number-pad"
              containerStyle={styles.input}
            />

            {price && originalPrice && (
              <View style={styles.discountPreview}>
                <Text style={styles.discountLabel}>Discount</Text>
                <Text style={styles.discountValue}>
                  {Math.round((1 - parseFloat(price) / parseFloat(originalPrice)) * 100)}% OFF
                </Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <Button title="Back" onPress={() => setStep(1)} variant="secondary" style={styles.halfBtn} />
              <Button title="Next: Details" onPress={() => setStep(3)} variant="primary" style={styles.halfBtn} />
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Input
              label="Description"
              placeholder="Describe your deal — what's included, quantity, pickup details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              containerStyle={styles.input}
            />

            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <TouchableOpacity style={styles.locationCard}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>Add Pickup Location</Text>
                <Text style={styles.locationHint}>Tap to set your collection point</Text>
              </View>
              <Text style={styles.changeBtn}>Add</Text>
            </TouchableOpacity>

            <Input
              label="Deal End Date"
              placeholder="Select date"
              value=""
              onChangeText={() => {}}
              suffix="📅"
              containerStyle={styles.input}
            />

            <View style={styles.btnRow}>
              <Button title="Back" onPress={() => setStep(2)} variant="secondary" style={styles.halfBtn} />
              <Button title="Submit Deal" onPress={handleSubmit} variant="primary" style={styles.halfBtn} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  backBtn: { fontSize: 28, fontWeight: '300' },
  headerTitle: { ...typography['title-md'], color: colors['on-background'] },
  steps: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  stepRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    borderColor: colors['outline-variant'], alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: colors['primary-container'], borderColor: colors['primary-container'] },
  stepNum: { ...typography['label-sm'], color: colors['on-surface-variant'] },
  stepNumActive: { color: colors.white, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors['outline-variant'] },
  stepLineActive: { backgroundColor: colors['primary-container'] },
  scrollContent: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  imageUpload: {
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors['outline-variant'],
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg,
  },
  uploadIcon: { fontSize: 40, marginBottom: spacing.sm },
  uploadText: { ...typography['body-lg'], color: colors['on-surface'], fontWeight: '600', marginBottom: 4 },
  uploadHint: { ...typography['body-md'], color: colors['on-surface-variant'] },
  sectionTitle: { ...typography['title-md'], color: colors['on-background'], marginBottom: spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  categoryItem: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: colors['surface-container'], flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  categoryItemSelected: { backgroundColor: colors['primary-container'] },
  categoryEmoji: { fontSize: 14 },
  categoryName: { ...typography['label-sm'], color: colors['on-surface'] },
  categoryNameSelected: { color: colors.white },
  input: { marginBottom: spacing.md },
  priceRow: { flexDirection: 'row', gap: spacing.md },
  priceInput: { flex: 1 },
  discountPreview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors['secondary-container'], padding: spacing.md, borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  discountLabel: { ...typography['body-md'], color: colors['on-secondary-container'] },
  discountValue: { ...typography['title-md'], color: colors['on-secondary-container'], fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  halfBtn: { flex: 1 },
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors['surface-container-lowest'], padding: spacing.md, borderRadius: borderRadius.lg,
    ...shadows.card, marginBottom: spacing.md,
  },
  locationIcon: { fontSize: 24, marginRight: spacing.md },
  locationInfo: { flex: 1 },
  locationName: { ...typography['body-lg'], color: colors['on-surface'], fontWeight: '600' },
  locationHint: { ...typography['body-md'], color: colors['on-surface-variant'] },
  changeBtn: { ...typography['body-md'], color: colors['primary-container'], fontWeight: '600' },
});
