import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import {
  MapPin,
  Search,
  Crosshair,
  Check,
  Building2,
  Train,
  ShoppingBag,
  Store,
  ChevronRight,
  X,
  Compass,
  CornerDownRight,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LocationDetails,
  searchLandmarks,
  getNearbyLandmarks,
  POPULAR_MALAYSIAN_HUBS,
} from '../../utils/mapsUtils';

interface LocationPickerProps {
  value: string;
  onSelectLocation: (loc: LocationDetails & { pickupNote?: string }) => void;
  initialCoords?: { latitude: number; longitude: number } | null;
}

const CATEGORIES = ['All', 'Transit', 'Community', 'Mall', 'Market'] as const;

export function LocationPicker({
  value,
  onSelectLocation,
  initialCoords,
}: LocationPickerProps) {
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState(value || '');
  const [isLocating, setIsLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialCoords || null
  );

  const [selectedLocation, setSelectedLocation] = useState<LocationDetails | null>(() => {
    if (value) {
      return {
        name: value.split(',')[0],
        address: value,
        latitude: initialCoords?.latitude || 3.1319,
        longitude: initialCoords?.longitude || 101.6702,
      };
    }
    return null;
  });

  const [nearbyLandmarks, setNearbyLandmarks] = useState<LocationDetails[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [pickupNote, setPickupNote] = useState<string>('');
  const [showNearbySection, setShowNearbySection] = useState(false);

  // Compute live search suggestions based on input & user location
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      let baseList = userCoords
        ? getNearbyLandmarks(userCoords.latitude, userCoords.longitude, 12)
        : POPULAR_MALAYSIAN_HUBS.slice(0, 10);

      if (selectedCategory !== 'All') {
        baseList = baseList.filter((item) => item.category === selectedCategory);
      }
      return baseList;
    }

    let results = searchLandmarks(
      searchQuery,
      userCoords?.latitude,
      userCoords?.longitude,
      12
    );

    if (selectedCategory !== 'All') {
      results = results.filter((item) => item.category === selectedCategory);
    }
    return results;
  }, [searchQuery, userCoords, selectedCategory]);

  // Handle "Use Current Location" GPS trigger
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please enable location services in your device settings to find nearby pickup points.'
        );
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = loc.coords;
      setUserCoords({ latitude, longitude });

      // Calculate the closest known landmarks around the host
      const closestLandmarks = getNearbyLandmarks(latitude, longitude, 5);
      setNearbyLandmarks(closestLandmarks);
      setShowNearbySection(true);

      // Reverse geocode to get the user's current street address
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      let addressString = 'Malaysia';
      let district = '';
      let state = '';
      let placeName = 'My Current Location';

      if (results && results.length > 0) {
        const r = results[0];
        district = r.city || r.district || r.subregion || '';
        state = r.region || '';
        const street = r.street || r.name || '';
        const postalCode = r.postalCode || '';

        const parts = [street, district, postalCode, state].filter(Boolean);
        addressString = parts.length > 0 ? parts.join(', ') : 'Current Location, Malaysia';
        placeName = street || district || 'Current Location';
      }

      // Default select the reverse-geocoded address
      const currentLocDetail: LocationDetails = {
        name: placeName,
        address: addressString,
        latitude,
        longitude,
        district,
        state,
      };

      setSelectedLocation(currentLocDetail);
      setSearchQuery(placeName);
      onSelectLocation({ ...currentLocDetail, pickupNote });
    } catch (err: any) {
      Alert.alert('GPS Location Error', err.message || 'Could not retrieve your location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectLocation = (loc: LocationDetails) => {
    setSelectedLocation(loc);
    setSearchQuery(loc.name);
    setShowNearbySection(false);
    onSelectLocation({ ...loc, pickupNote });
  };

  const handleCustomApply = () => {
    if (!searchQuery.trim()) return;
    const customLoc: LocationDetails = {
      name: searchQuery.trim().split(',')[0],
      address: searchQuery.trim(),
      latitude: userCoords?.latitude || 3.1319,
      longitude: userCoords?.longitude || 101.6702,
    };
    setSelectedLocation(customLoc);
    onSelectLocation({ ...customLoc, pickupNote });
  };

  const handleNoteChange = (text: string) => {
    setPickupNote(text);
    if (selectedLocation) {
      onSelectLocation({ ...selectedLocation, pickupNote: text });
    }
  };

  const renderCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Transit':
        return <Train size={14} color="#0284C7" />;
      case 'Mall':
        return <ShoppingBag size={14} color="#8B5CF6" />;
      case 'Market':
        return <Store size={14} color="#F59E0B" />;
      default:
        return <Building2 size={14} color="#10B981" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Search Bar with GPS Button ── */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <Search size={18} color={isDark ? '#94A3B8' : '#64748B'} />
        <TextInput
          style={[
            styles.searchInput,
            { color: colors['on-surface'] || (isDark ? '#FFFFFF' : '#0F172A') },
          ]}
          placeholder="Search landmark, MRT, mall or community hall..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (selectedLocation && text !== selectedLocation.name) {
              setSelectedLocation(null);
            }
          }}
          onBlur={handleCustomApply}
        />
        {Boolean(searchQuery) && (
          <TouchableOpacity
            style={styles.clearIcon}
            onPress={() => {
              setSearchQuery('');
              setSelectedLocation(null);
            }}
          >
            <X size={16} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 2. "Use Current Location" Quick Action ── */}
      <TouchableOpacity
        style={[
          styles.currentLocationBtn,
          {
            backgroundColor: isDark ? 'rgba(2, 132, 199, 0.12)' : '#E0F2FE',
            borderColor: colors['primary-container'] || '#0284C7',
          },
        ]}
        onPress={handleUseCurrentLocation}
        disabled={isLocating}
        activeOpacity={0.8}
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={colors['primary-container'] || '#0284C7'} />
        ) : (
          <Crosshair size={16} color={colors['primary-container'] || '#0284C7'} />
        )}
        <Text
          style={[
            styles.currentLocationBtnText,
            { color: colors['primary-container'] || '#0284C7' },
          ]}
        >
          {isLocating ? 'Detecting current GPS & landmarks...' : 'Use Current Location & Find Nearby Landmarks'}
        </Text>
      </TouchableOpacity>

      {/* ── 3. Nearby Landmarks Suggestions (Appears when Current Location is clicked) ── */}
      {showNearbySection && nearbyLandmarks.length > 0 && (
        <View
          style={[
            styles.nearbyLandmarksCard,
            {
              backgroundColor: isDark ? 'rgba(2, 132, 199, 0.08)' : '#F0F9FF',
              borderColor: isDark ? 'rgba(2, 132, 199, 0.25)' : '#BAE6FD',
            },
          ]}
        >
          <View style={styles.nearbyHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Compass size={15} color={colors['primary-container'] || '#0284C7'} />
              <Text
                style={[
                  styles.nearbyHeaderTitle,
                  { color: isDark ? '#38BDF8' : '#0369A1' },
                ]}
              >
                Nearby Landmarks Around You
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowNearbySection(false)}>
              <X size={14} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.nearbySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Tap any landmark below to use as your official collection spot:
          </Text>

          <View style={styles.nearbyList}>
            {nearbyLandmarks.map((lm) => {
              const isSelected = selectedLocation?.name === lm.name;
              return (
                <TouchableOpacity
                  key={lm.name}
                  style={[
                    styles.nearbyItem,
                    {
                      backgroundColor: isSelected
                        ? (colors['primary-container'] || '#0284C7')
                        : (isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF'),
                      borderColor: isSelected
                        ? (colors['primary-container'] || '#0284C7')
                        : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.06)'),
                    },
                  ]}
                  onPress={() => handleSelectLocation(lm)}
                  activeOpacity={0.75}
                >
                  <View style={styles.nearbyItemLeft}>
                    {renderCategoryIcon(lm.category)}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.nearbyItemName,
                          { color: isSelected ? '#FFFFFF' : (isDark ? '#F1F5F9' : '#0F172A') },
                        ]}
                        numberOfLines={1}
                      >
                        {lm.name}
                      </Text>
                      <Text
                        style={[
                          styles.nearbyItemAddress,
                          { color: isSelected ? '#E0F2FE' : (isDark ? '#94A3B8' : '#64748B') },
                        ]}
                        numberOfLines={1}
                      >
                        {lm.district ? `${lm.district}, ${lm.state}` : lm.address}
                      </Text>
                    </View>
                  </View>

                  {Boolean(lm.distanceText) && (
                    <View
                      style={[
                        styles.nearbyDistPill,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(255,255,255,0.2)'
                            : (isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.nearbyDistText,
                          { color: isSelected ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#475569') },
                        ]}
                      >
                        {lm.distanceText}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── 4. Selected Location Confirmation Card ── */}
      {selectedLocation && (
        <View
          style={[
            styles.selectedCard,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
              borderColor: '#10B981',
            },
          ]}
        >
          <View style={styles.selectedIconCircle}>
            <Check size={16} color="#10B981" strokeWidth={2.8} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text
                style={[
                  styles.selectedTitle,
                  { color: isDark ? '#34D399' : '#065F46' },
                ]}
              >
                {selectedLocation.name}
              </Text>
              {selectedLocation.category && (
                <View style={styles.selectedCatChip}>
                  <Text style={styles.selectedCatText}>{selectedLocation.category}</Text>
                </View>
              )}
            </View>

            <Text
              style={[
                styles.selectedAddress,
                { color: isDark ? '#A7F3D0' : '#047857' },
              ]}
              numberOfLines={2}
            >
              {selectedLocation.address}
            </Text>

            {Boolean(selectedLocation.distanceText) && (
              <Text
                style={[
                  styles.selectedDistanceText,
                  { color: isDark ? '#6EE7B7' : '#059669' },
                ]}
              >
                📍 {selectedLocation.distanceText}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => setSelectedLocation(null)}
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 5. Specific Pickup Landmark Instructions (Scenario: Meeting Point Detail) ── */}
      {selectedLocation && (
        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <FileText size={14} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginTop: 2 }} />
          <TextInput
            style={[
              styles.noteInput,
              { color: colors['on-surface'] || (isDark ? '#FFFFFF' : '#0F172A') },
            ]}
            placeholder="Pickup instructions (e.g. Ground Floor near Starbucks / Guardhouse)"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={pickupNote}
            onChangeText={handleNoteChange}
          />
        </View>
      )}

      {/* ── 6. Category Filter Chips ── */}
      {!selectedLocation && (
        <View style={styles.categoryFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {CATEGORIES.map((cat) => {
              const isCatActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catFilterChip,
                    {
                      backgroundColor: isCatActive
                        ? (colors['primary-container'] || '#0284C7')
                        : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                      borderColor: isCatActive
                        ? (colors['primary-container'] || '#0284C7')
                        : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.catFilterText,
                      { color: isCatActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569') },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── 7. Live Matching Suggestions Dropdown ── */}
      {!selectedLocation && (
        <View style={styles.suggestionsContainer}>
          <Text
            style={[
              styles.suggestionsHeader,
              { color: isDark ? '#94A3B8' : '#64748B' },
            ]}
          >
            {searchQuery.trim()
              ? `Matching Locations (${suggestions.length})`
              : userCoords
              ? 'Nearby Community Hubs'
              : 'Popular Malaysian Community Hubs'}
          </Text>

          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.suggestionRow,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              onPress={() => handleSelectLocation(item)}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionIconWrapper}>
                {renderCategoryIcon(item.category)}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={[
                      styles.suggestionName,
                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.category && (
                    <Text style={styles.categoryPill}>{item.category}</Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.suggestionAddress,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                  numberOfLines={1}
                >
                  {item.address}
                </Text>
              </View>

              {Boolean(item.distanceText) ? (
                <Text
                  style={[
                    styles.suggestionDist,
                    { color: colors['primary-container'] || '#0284C7' },
                  ]}
                >
                  {item.distanceText}
                </Text>
              ) : (
                <ChevronRight size={16} color={isDark ? '#64748B' : '#94A3B8'} />
              )}
            </TouchableOpacity>
          ))}

          {/* Option to use custom typed address if no exact match */}
          {Boolean(searchQuery.trim()) && (
            <TouchableOpacity
              style={[
                styles.customRow,
                {
                  backgroundColor: isDark ? 'rgba(2, 132, 199, 0.08)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#BAE6FD',
                },
              ]}
              onPress={handleCustomApply}
            >
              <CornerDownRight size={15} color={colors['primary-container'] || '#0284C7'} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.customRowText,
                    { color: colors['primary-container'] || '#0284C7' },
                  ]}
                >
                  Use "{searchQuery}" as custom location
                </Text>
                <Text style={[styles.customRowSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Custom host pickup address
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  clearIcon: {
    padding: 4,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentLocationBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nearbyLandmarksCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  nearbyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nearbyHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  nearbySubtitle: {
    fontSize: 11,
  },
  nearbyList: {
    gap: 6,
    marginTop: 4,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  nearbyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  nearbyItemName: {
    fontSize: 12,
    fontWeight: '700',
  },
  nearbyItemAddress: {
    fontSize: 11,
    marginTop: 1,
  },
  nearbyDistPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  nearbyDistText: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  selectedIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedCatChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  selectedCatText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  selectedAddress: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  selectedDistanceText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  changeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  noteInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  categoryFilters: {
    marginTop: 2,
  },
  catFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  catFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionsContainer: {
    gap: 6,
    marginTop: 2,
  },
  suggestionsHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  suggestionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryPill: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  suggestionAddress: {
    fontSize: 11,
    marginTop: 1,
  },
  suggestionDist: {
    fontSize: 11,
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  customRowText: {
    fontSize: 13,
    fontWeight: '700',
  },
  customRowSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
