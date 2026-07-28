import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { dealsApi } from '../../api/client';
import { getAccessToken } from '../../api/client';
import { useLocation } from '../../contexts/LocationContext';
import { request as apiRequest } from '../../api/client';

const API_BASE = 'http://168.235.81.222:5000/api';
const CATEGORIES = ['Food', 'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Drinks'];

const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔',
  Electronics: '📱',
  Fashion: '👗',
  Home: '🏠',
  Beauty: '💄',
  Sports: '⚽',
  Drinks: '🥤',
};

export const PostDealScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { latitude, longitude, isLoading: locLoading } = useLocation();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [groupPrice, setGroupPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [minMembers, setMinMembers] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [nearbyDeals, setNearbyDeals] = useState<any[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enableLookup, setEnableLookup] = useState(false);
  const [capturedLat, setCapturedLat] = useState<number | null>(null);
  const [capturedLon, setCapturedLon] = useState<number | null>(null);

  // Capture location when user taps location card
  const handleLocationCapture = async () => {
    if (latitude && longitude) {
      setCapturedLat(latitude);
      setCapturedLon(longitude);
      setPickupLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      // Fetch nearby suggestions
      await fetchNearbyDeals(latitude, longitude, selectedCategory);
    } else {
      Alert.alert('Location Unavailable', 'Could not get your current location. Please enable location services.');
    }
  };

  const fetchNearbyDeals = async (lat: number, lon: number, category: string) => {
    setNearbyLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        radiusKm: '2',
        ...(category && category !== 'All' ? { category } : {}),
      });
      const res = await fetch(`${API_BASE}/deals/suggest-nearby?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNearbyDeals(data.items ?? data ?? []);
      }
    } catch {
      // Silently fail — no nearby suggestions
    } finally {
      setNearbyLoading(false);
    }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#+/, '');
    if (!tag) return;
    if (hashtags.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 hashtags allowed.');
      return;
    }
    if (hashtags.includes(tag)) {
      setHashtagInput('');
      return;
    }
    setHashtags([...hashtags, tag]);
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag));
  };

  const handleRemoveImage = (uri: string) => {
    setImages(images.filter((i) => i !== uri));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!title.trim()) { Alert.alert('Required', 'Please enter a deal title.'); return; }
    if (!selectedCategory) { Alert.alert('Required', 'Please select a category.'); return; }
    if (!groupPrice) { Alert.alert('Required', 'Please enter a group buy price.'); return; }
    if (!originalPrice) { Alert.alert('Required', 'Please enter an original price.'); return; }
    if (!minMembers) { Alert.alert('Required', 'Please enter minimum members.'); return; }
    if (!maxMembers) { Alert.alert('Required', 'Please enter maximum members.'); return; }
    if (!deadline) { Alert.alert('Required', 'Please enter a deadline date.'); return; }
    if (!pickupLocation.trim()) { Alert.alert('Required', 'Please set a pickup location.'); return; }

    setSubmitting(true);
    try {
      // Upload images first
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri,
            name: 'image.jpg',
            type: 'image/jpeg',
          } as any);
          const token = await getAccessToken();
          const res = await fetch(`${API_BASE}/uploads/image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            uploadedUrls.push(data.url ?? data.path ?? data.filename ?? '');
          }
        } catch {
          // Skip failed uploads, continue with others
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        originalPrice: parseFloat(originalPrice),
        groupPrice: parseFloat(groupPrice),
        minMembers: parseInt(minMembers, 10),
        maxMembers: parseInt(maxMembers, 10),
        deadline,
        pickupLocation: pickupLocation.trim(),
        latitude: capturedLat ?? undefined,
        longitude: capturedLon ?? undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        imageUrls: uploadedUrls,
      };

      await dealsApi.create(payload);
      navigation?.replace('PostReview');
    } catch (err: any) {
      Alert.alert('Post Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const discountPct =
    groupPrice && originalPrice
      ? Math.round((1 - parseFloat(groupPrice) / parseFloat(originalPrice)) * 100)
      : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Deal</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
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
        {/* ── STEP 1: Basic Info ── */}
        {step === 1 && (
          <>
            {/* Image Upload Carousel */}
            <View style={styles.imageUploadSection}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Add Photos (up to 4)</Text>
              <Text style={styles.uploadHint}>First photo is the cover image</Text>
              {images.length === 0 ? (
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImages}>
                  <Text style={styles.imagePickerBtnText}>Select Photos</Text>
                </TouchableOpacity>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageCarousel}>
                  {images.map((uri, idx) => (
                    <View key={uri} style={styles.imageItem}>
                      <Image source={{ uri }} style={styles.thumbnailImage} />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={() => handleRemoveImage(uri)}>
                        <Text style={styles.removeImageBtnText}>×</Text>
                      </TouchableOpacity>
                      {idx === 0 && (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverBadgeText}>Cover</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {images.length < 4 && (
                    <TouchableOpacity style={styles.addMoreImage} onPress={pickImages}>
                      <Text style={styles.addMoreImageText}>+</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
            </View>

            {/* Category */}
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryItem, selectedCategory === cat && styles.categoryItemSelected]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={styles.categoryEmoji}>{CATEGORY_ICONS[cat] || '📦'}</Text>
                  <Text style={[styles.categoryName, selectedCategory === cat && styles.categoryNameSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <Input
              label="Deal Title"
              placeholder="e.g. Premium Kuih Muih Set for Ramadan"
              value={title}
              onChangeText={setTitle}
              containerStyle={styles.input}
            />

            {/* Hashtags */}
            <Text style={styles.sectionTitle}>Hashtags</Text>
            <View style={styles.hashtagInputRow}>
              <TextInput
                style={styles.hashtagInput}
                placeholder="#ramadan #food #kuih"
                placeholderTextColor={colors['on-surface-variant']}
                value={hashtagInput}
                onChangeText={setHashtagInput}
                onSubmitEditing={addHashtag}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addHashtagBtn} onPress={addHashtag}>
                <Text style={styles.addHashtagBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {hashtags.length > 0 && (
              <View style={styles.hashtagsWrap}>
                {hashtags.map((tag) => (
                  <TouchableOpacity key={tag} style={styles.hashtagChip} onPress={() => removeHashtag(tag)}>
                    <Text style={styles.hashtagChipText}>#{tag}</Text>
                    <Text style={styles.hashtagRemove}>×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.hashtagHint}>Tap a tag to remove it. Max 10 tags.</Text>

            <Button title="Next: Pricing" onPress={() => setStep(2)} fullWidth variant="primary" />
          </>
        )}

        {/* ── STEP 2: Pricing ── */}
        {step === 2 && (
          <>
            <View style={styles.priceRow}>
              <Input
                label="Group Buy Price (MYR)"
                placeholder="25.00"
                value={groupPrice}
                onChangeText={setGroupPrice}
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

            {discountPct > 0 && (
              <View style={styles.discountPreview}>
                <Text style={styles.discountLabel}>Discount</Text>
                <Text style={styles.discountValue}>{discountPct}% OFF</Text>
              </View>
            )}

            <Input
              label="Minimum Members to Unlock"
              placeholder="50"
              value={minMembers}
              onChangeText={setMinMembers}
              keyboardType="number-pad"
              containerStyle={styles.input}
            />

            <Input
              label="Maximum Members"
              placeholder="100"
              value={maxMembers}
              onChangeText={setMaxMembers}
              keyboardType="number-pad"
              containerStyle={styles.input}
            />

            <View style={styles.btnRow}>
              <Button title="Back" onPress={() => setStep(1)} variant="secondary" style={styles.halfBtn} />
              <Button title="Next: Details" onPress={() => setStep(3)} variant="primary" style={styles.halfBtn} />
            </View>
          </>
        )}

        {/* ── STEP 3: Details + Location ── */}
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

            {/* Location */}
            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <TouchableOpacity style={styles.locationCard} onPress={handleLocationCapture} disabled={locLoading}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>
                  {capturedLat && capturedLon ? 'Location captured ✓' : 'Tap to use current location'}
                </Text>
                {capturedLat && capturedLon && (
                  <Text style={styles.locationCoords}>
                    {capturedLat.toFixed(4)}, {capturedLon.toFixed(4)}
                  </Text>
                )}
              </View>
              <Text style={styles.changeBtn}>{capturedLat ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>

            {/* Manual location override */}
            <Input
              label="Or enter address manually"
              placeholder="e.g. Pasar Malam, Kuala Lumpur"
              value={pickupLocation}
              onChangeText={setPickupLocation}
              prefix="📍"
              containerStyle={styles.input}
            />

            {/* Deadline */}
            <Input
              label="Deal End Date (YYYY-MM-DD)"
              placeholder="2025-12-31"
              value={deadline}
              onChangeText={setDeadline}
              containerStyle={styles.input}
            />

            {/* Enable Lookup Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Enable Lookup</Text>
                <Text style={styles.toggleHint}>Help buyers find your deal nearby</Text>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            </View>

            {/* Nearby Similar Deals */}
            {nearbyDeals.length > 0 && (
              <View style={styles.nearbySection}>
                <Text style={styles.sectionTitle}>Similar Deals Nearby</Text>
                {nearbyLoading ? (
                  <Text style={styles.nearbyLoading}>Loading nearby deals...</Text>
                ) : (
                  <FlatList
                    horizontal
                    data={nearbyDeals.slice(0, 5)}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.nearbyCard}
                        onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
                      >
                        {item.imageUrls?.[0] ? (
                          <Image source={{ uri: item.imageUrls[0] }} style={styles.nearbyImage} />
                        ) : (
                          <View style={styles.nearbyImagePlaceholder}>
                            <Text>🛒</Text>
                          </View>
                        )}
                        <Text style={styles.nearbyTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.nearbyPrice}>RM {item.groupPrice}</Text>
                        <Text style={styles.nearbyCategory}>{item.category}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            )}

            <View style={styles.btnRow}>
              <Button title="Back" onPress={() => setStep(2)} variant="secondary" style={styles.halfBtn} />
              <Button
                title={submitting ? 'Posting...' : 'Submit Deal'}
                onPress={handleSubmit}
                variant="primary"
                style={styles.halfBtn}
                disabled={submitting}
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── Image Picker stub ──────────────────────────────────────────────────────────
// If expo-image-picker is installed, call pickImagesAsync().
// If not yet installed, show an alert prompting install (handled by NOTES-DEPS2.md).
async function pickImages() {
  try {
    const { launchImageLibraryAsync } = await import('expo-image-picker');
    const result = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    });
    if (!result.canceled && result.assets) {
      // Merge with existing images, cap at 4
      // Parent component will handle this via a callback or ref
      // For now, dispatch a custom event
      (global as any).__postDealImages = [
        ...((global as any).__postDealImages ?? []),
        ...result.assets.map((a: any) => a.uri),
      ].slice(0, 4);
      // Force re-render by briefly navigating
    }
  } catch {
    Alert.alert(
      'Image Picker Required',
      'Please install expo-image-picker to enable photo uploads: npx expo install expo-image-picker'
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  backBtn: { fontSize: 28, fontWeight: '300' },
  headerTitle: { ...typography['title-md'], color: colors['on-background'] },
  steps: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.xl,
  },
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
  imageUploadSection: {
    backgroundColor: colors['surface-container'], borderRadius: borderRadius.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors['outline-variant'],
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg,
  },
  uploadIcon: { fontSize: 40, marginBottom: spacing.sm },
  uploadText: { ...typography['body-lg'], color: colors['on-surface'], fontWeight: '600', marginBottom: 4 },
  uploadHint: { ...typography['body-md'], color: colors['on-surface-variant'], marginBottom: spacing.md },
  imagePickerBtn: {
    backgroundColor: colors['primary-container'], paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: borderRadius.full,
  },
  imagePickerBtnText: { ...typography['label-sm'], color: colors.white, fontWeight: '700' },
  imageCarousel: { flexDirection: 'row', marginTop: spacing.sm },
  imageItem: { position: 'relative', marginRight: spacing.sm },
  thumbnailImage: { width: 80, height: 80, borderRadius: borderRadius.md, backgroundColor: colors['surface-container-high'] },
  removeImageBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center',
  },
  removeImageBtnText: { color: colors.white, fontWeight: '700', fontSize: 14, lineHeight: 16 },
  coverBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: colors['primary-container'], paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 4,
  },
  coverBadgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  addMoreImage: {
    width: 80, height: 80, borderRadius: borderRadius.md,
    backgroundColor: colors['surface-container-high'],
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed',
    borderColor: colors['outline-variant'],
  },
  addMoreImageText: { fontSize: 28, color: colors['on-surface-variant'] },
  sectionTitle: { ...typography['title-md'], color: colors['on-background'], marginBottom: spacing.sm },
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
  hashtagInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  hashtagInput: {
    flex: 1, backgroundColor: colors['surface-container'], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, height: 44, ...typography['body-md'], color: colors['on-surface'],
  },
  addHashtagBtn: {
    backgroundColor: colors['secondary-container'], paddingHorizontal: spacing.md,
    height: 44, borderRadius: borderRadius.md, justifyContent: 'center',
  },
  addHashtagBtnText: { ...typography['label-sm'], color: colors['on-secondary-container'], fontWeight: '700' },
  hashtagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  hashtagChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors['primary-container'], paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full, gap: 4,
  },
  hashtagChipText: { ...typography['label-sm'], color: colors.white },
  hashtagRemove: { color: colors.white, fontSize: 16, lineHeight: 16, fontWeight: '700' },
  hashtagHint: { ...typography['body-sm'], color: colors['on-surface-variant'], marginBottom: spacing.md },
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
  locationCoords: { ...typography['body-sm'], color: colors['on-surface-variant'] },
  changeBtn: { ...typography['body-md'], color: colors.primary, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors['surface-container'], padding: spacing.md, borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { ...typography['body-lg'], color: colors['on-surface'], fontWeight: '600' },
  toggleHint: { ...typography['body-sm'], color: colors['on-surface-variant'] },
  comingSoonBadge: {
    backgroundColor: colors['surface-variant'], paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  comingSoonText: { ...typography['label-sm'], color: colors['on-surface-variant'], fontStyle: 'italic' },
  nearbySection: { marginBottom: spacing.md },
  nearbyLoading: { ...typography['body-md'], color: colors['on-surface-variant'] },
  nearbyCard: {
    width: 140, backgroundColor: colors['surface-container-lowest'], borderRadius: borderRadius.lg,
    padding: spacing.sm, marginRight: spacing.sm, ...shadows.card,
  },
  nearbyImage: { width: '100%', height: 80, borderRadius: borderRadius.md, marginBottom: spacing.xs },
  nearbyImagePlaceholder: {
    width: '100%', height: 80, borderRadius: borderRadius.md, marginBottom: spacing.xs,
    backgroundColor: colors['surface-container-high'], alignItems: 'center', justifyContent: 'center',
  },
  nearbyTitle: { ...typography['label-sm'], color: colors['on-surface'], marginBottom: 2 },
  nearbyPrice: { ...typography['body-sm'], color: colors['primary-container'], fontWeight: '700' },
  nearbyCategory: { ...typography['label-xs'], color: colors['on-surface-variant'] },
});
