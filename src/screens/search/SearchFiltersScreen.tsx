import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const PRICE_RANGES = ['Under RM20', 'RM20 - RM50', 'RM50 - RM100', 'RM100+'];
const SORT_OPTIONS = ['Ending Soon', 'Most Popular', 'Lowest Price', 'Newest'];

export const SearchFiltersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedSort, setSelectedSort] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const categories = ['Food', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Drinks'];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleApply = () => navigation.goBack();
  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedPrice('');
    setSelectedSort('');
    setMaxPrice('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetBtn}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.chipGrid}>
            {PRICE_RANGES.map((range) => {
              const selected = selectedPrice === range;
              return (
                <TouchableOpacity
                  key={range}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSelectedPrice(selected ? '' : range)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{range}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.customPrice}>
            <Input
              label="Max Price (MYR)"
              placeholder="e.g. 100"
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="number-pad"
              prefix="RM"
              containerStyle={styles.priceInput}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sort By</Text>
          <View style={styles.sortList}>
            {SORT_OPTIONS.map((option) => {
              const selected = selectedSort === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.sortItem}
                  onPress={() => setSelectedSort(selected ? '' : option)}
                >
                  <Text style={[styles.sortText, selected && styles.sortTextSelected]}>{option}</Text>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Input
            placeholder="e.g. Kuala Lumpur"
            prefix="📍"
            containerStyle={styles.locationInput}
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button title="Apply Filters" onPress={handleApply} fullWidth variant="primary" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors['outline-variant'],
  },
  closeBtn: { fontSize: 20, color: colors['on-surface-variant'], padding: spacing.xs },
  headerTitle: { ...typography['title-md'], color: colors['on-background'] },
  resetBtn: { ...typography['body-md'], color: colors['primary-container'], fontWeight: '600' },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography['title-md'], color: colors['on-background'], marginBottom: spacing.md },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: colors['surface-container'], borderWidth: 1, borderColor: colors['outline-variant'],
  },
  chipSelected: { backgroundColor: colors['primary-container'], borderColor: colors['primary-container'] },
  chipText: { ...typography['label-sm'], color: colors['on-surface'] },
  chipTextSelected: { color: colors.white, fontWeight: '700' },
  customPrice: { marginTop: spacing.md },
  priceInput: { marginBottom: 0 },
  divider: { height: 1, backgroundColor: colors['outline-variant'], marginBottom: spacing.lg },
  sortList: { gap: spacing.xs },
  sortItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors['surface-container-lowest'], borderRadius: borderRadius.md,
  },
  sortText: { ...typography['body-lg'], color: colors['on-surface'] },
  sortTextSelected: { fontWeight: '600', color: colors['primary-container'] },
  checkmark: { ...typography['body-lg'], color: colors['primary-container'], fontWeight: '700' },
  locationInput: { marginBottom: 0 },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.md, paddingTop: spacing.md,
    backgroundColor: colors['surface-container-lowest'], ...shadows.modal,
  },
});
