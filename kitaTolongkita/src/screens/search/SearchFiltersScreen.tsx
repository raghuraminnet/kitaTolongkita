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
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const CATEGORIES = ['Food', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Drinks', 'Other'];
const SORT_OPTIONS = [
  { key: 'distance', label: 'Distance' },
  { key: 'price_asc', label: 'Price (Low-High)' },
  { key: 'newest', label: 'Newest' },
];

interface FilterState {
  radiusKm: number;
  categories: string[];
  minPrice: string;
  maxPrice: string;
  sortBy: string;
}

const DEFAULT_FILTERS: FilterState = {
  radiusKm: 10,
  categories: [],
  minPrice: '',
  maxPrice: '',
  sortBy: 'distance',
};

export const SearchFiltersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const setRadius = (delta: number) => {
    setFilters((f) => ({
      ...f,
      radiusKm: Math.min(50, Math.max(1, f.radiusKm + delta)),
    }));
  };

  const toggleCategory = (cat: string) => {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const handleApply = () => {
    // Pass filter state back via navigation params
    navigation.navigate('Search', {
      filterParams: {
        radiusKm: filters.radiusKm,
        categories: filters.categories,
        minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
        sortBy: filters.sortBy,
      },
    });
  };

  const handleReset = () => setFilters(DEFAULT_FILTERS);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('search.filters')}</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetBtn}>{t('search.clearFilters')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Radius Slider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('search.radius')}</Text>
          <View style={styles.radiusCard}>
            <TouchableOpacity style={styles.radiusBtn} onPress={() => setRadius(-1)}>
              <Text style={styles.radiusBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.radiusValue}>
              <Text style={styles.radiusNumber}>{filters.radiusKm}</Text>
              <Text style={styles.radiusUnit}>{t('search.km')}</Text>
            </View>
            <TouchableOpacity style={styles.radiusBtn} onPress={() => setRadius(1)}>
              <Text style={styles.radiusBtnText}>+</Text>
            </TouchableOpacity>
            <View style={styles.radiusBar}>
              {[1, 5, 10, 20, 30, 50].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.radiusMark,
                    filters.radiusKm >= val && styles.radiusMarkActive,
                  ]}
                  onPress={() => setFilters((f) => ({ ...f, radiusKm: val }))}
                />
              ))}
            </View>
          </View>
          <Text style={styles.radiusHint}>Search within {filters.radiusKm} km of your location</Text>
        </View>

        <View style={styles.divider} />

        {/* Category Multi-Select */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('search.category')}</Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map((cat) => {
              const selected = filters.categories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleCategory(cat)}
                >
                  {selected && <Text style={styles.chipCheck}>✓</Text>}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('search.priceRange')}</Text>
          <View style={styles.priceRow}>
            <Input
              label="Min (MYR)"
              placeholder="0"
              value={filters.minPrice}
              onChangeText={(v) => setFilters((f) => ({ ...f, minPrice: v }))}
              keyboardType="decimal-pad"
              prefix="RM"
              containerStyle={styles.priceInput}
            />
            <Text style={styles.priceSep}>—</Text>
            <Input
              label="Max (MYR)"
              placeholder="500"
              value={filters.maxPrice}
              onChangeText={(v) => setFilters((f) => ({ ...f, maxPrice: v }))}
              keyboardType="decimal-pad"
              prefix="RM"
              containerStyle={styles.priceInput}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Sort Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('search.sortBy')}</Text>
          <View style={styles.sortList}>
            {SORT_OPTIONS.map((opt) => {
              const selected = filters.sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.sortItem}
                  onPress={() => setFilters((f) => ({ ...f, sortBy: opt.key }))}
                >
                  <Text style={[styles.sortText, selected && styles.sortTextSelected]}>
                    {opt.key === 'distance' ? t('search.sortDistance')
                      : opt.key === 'price_asc' ? t('search.sortPrice')
                      : t('search.sortNewest')}
                  </Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title={t('search.applyFilters')}
          onPress={handleApply}
          fullWidth
          variant="primary"
        />
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
  divider: { height: 1, backgroundColor: colors['outline-variant'], marginBottom: spacing.lg },
  // Radius
  radiusCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors['surface-container-lowest'], borderRadius: borderRadius.lg,
    padding: spacing.md, gap: spacing.md,
  },
  radiusBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors['primary-container'], alignItems: 'center', justifyContent: 'center',
  },
  radiusBtnText: { fontSize: 20, color: colors.white, fontWeight: '700' },
  radiusValue: { alignItems: 'center', minWidth: 60 },
  radiusNumber: { ...typography['headline-md'], color: colors['on-surface'], fontWeight: '800' },
  radiusUnit: { ...typography['label-sm'], color: colors['on-surface-variant'] },
  radiusBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  radiusMark: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors['outline-variant'],
  },
  radiusMarkActive: { backgroundColor: colors['primary-container'] },
  radiusHint: { ...typography['body-sm'], color: colors['on-surface-variant'], marginTop: spacing.sm },
  // Categories
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: colors['surface-container'], borderWidth: 1, borderColor: colors['outline-variant'],
    gap: spacing.xs,
  },
  chipSelected: { backgroundColor: colors['primary-container'], borderColor: colors['primary-container'] },
  chipCheck: { color: colors.white, fontSize: 12, fontWeight: '700' },
  chipText: { ...typography['label-sm'], color: colors['on-surface'] },
  chipTextSelected: { color: colors.white, fontWeight: '700' },
  // Price
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInput: { flex: 1 },
  priceSep: { ...typography['title-md'], color: colors['on-surface-variant'], marginTop: spacing.lg },
  // Sort
  sortList: { gap: spacing.xs },
  sortItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors['surface-container-lowest'], borderRadius: borderRadius.md,
  },
  sortText: { ...typography['body-lg'], color: colors['on-surface'] },
  sortTextSelected: { fontWeight: '600', color: colors['primary-container'] },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: colors['outline-variant'], alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: colors['primary-container'] },
  radioInner: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: colors['primary-container'],
  },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.md, paddingTop: spacing.md,
    backgroundColor: colors['surface-container-lowest'], ...shadows.modal,
  },
});
