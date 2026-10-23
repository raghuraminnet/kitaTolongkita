import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Building,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  POPULAR_MALAYSIAN_HUBS,
  LocationDetails,
  getStaticMapUrl,
} from '../../utils/mapsUtils';

interface LocationPickerProps {
  value: string;
  onSelectLocation: (loc: LocationDetails) => void;
  initialCoords?: { latitude: number; longitude: number } | null;
}

export function LocationPicker({
  value,
  onSelectLocation,
  initialCoords,
}: LocationPickerProps) {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedHub, setSelectedHub] = useState<LocationDetails | null>(() => {
    if (initialCoords?.latitude && initialCoords?.longitude) {
      return {
        name: value || 'Selected Location',
        address: value || 'Selected Location',
        latitude: initialCoords.latitude,
        longitude: initialCoords.longitude,
      };
    }
    return null;
  });

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location services in your phone settings to capture your current pickup point.'
        );
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = loc.coords;

      // Reverse geocode
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      let addressString = 'Malaysia';
      let district = '';
      let state = '';
      let placeName = 'My Community Spot';

      if (results && results.length > 0) {
        const r = results[0];
        district = r.city || r.district || r.subregion || '';
        state = r.region || '';
        const street = r.street || r.name || '';
        const postalCode = r.postalCode || '';

        const parts = [street, district, postalCode, state].filter(Boolean);
        addressString = parts.join(', ');
        placeName = street || district || 'My Community Spot';
      }

      const hub: LocationDetails = {
        name: placeName,
        address: addressString,
        latitude,
        longitude,
        district,
        state,
      };

      setSelectedHub(hub);
      setSearchQuery(addressString);
      onSelectLocation(hub);
    } catch (err: any) {
      Alert.alert('Location Error', err.message || 'Could not retrieve device location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectPreset = (hub: LocationDetails) => {
    setSelectedHub(hub);
    setSearchQuery(hub.address);
    onSelectLocation(hub);
  };

  const handleCustomTextChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSelectedHub(null);
    }
  };

  const handleApplyCustomText = () => {
    if (!searchQuery.trim()) return;
    const hub: LocationDetails = {
      name: searchQuery.trim().split(',')[0],
      address: searchQuery.trim(),
      latitude: selectedHub?.latitude || 3.139,
      longitude: selectedHub?.longitude || 101.6869,
    };
    setSelectedHub(hub);
    onSelectLocation(hub);
  };

  return (
    <View style={styles.container}>
      {/* Search Input with GPS Trigger */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
          },
        ]}
      >
        <MapPin size={18} color={colors['primary-container'] || '#0284C7'} />
        <TextInput
          style={[
            styles.textInput,
            { color: colors['on-surface'] || (isDark ? '#FFFFFF' : '#0F172A') },
          ]}
          placeholder="Enter pickup address or community hall..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={searchQuery}
          onChangeText={handleCustomTextChange}
          onBlur={handleApplyCustomText}
        />
        {Boolean(searchQuery) && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setSearchQuery('');
              setSelectedHub(null);
            }}
          >
            <X size={15} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        )}
      </View>

      {/* GPS Current Location Button */}
      <TouchableOpacity
        style={[
          styles.gpsBtn,
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
            styles.gpsBtnText,
            { color: colors['primary-container'] || '#0284C7' },
          ]}
        >
          {isLocating ? 'Pinpointing GPS location...' : 'Use Current Live GPS Location'}
        </Text>
      </TouchableOpacity>

      {/* Popular Community Pickup Hubs in Malaysia */}
      <View style={styles.presetsSection}>
        <Text
          style={[
            styles.sectionLabel,
            { color: isDark ? '#94A3B8' : '#64748B' },
          ]}
        >
          Popular Malaysian Community Hubs:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {POPULAR_MALAYSIAN_HUBS.map((hub) => {
            const isSelected = selectedHub?.name === hub.name;
            return (
              <TouchableOpacity
                key={hub.name}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected
                      ? (colors['primary-container'] || '#0284C7')
                      : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                    borderColor: isSelected
                      ? (colors['primary-container'] || '#0284C7')
                      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                  },
                ]}
                onPress={() => handleSelectPreset(hub)}
                activeOpacity={0.7}
              >
                {isSelected ? (
                  <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
                ) : (
                  <Building size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                )}
                <Text
                  style={[
                    styles.presetChipText,
                    { color: isSelected ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#334155') },
                  ]}
                >
                  {hub.district || hub.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Verified Location Selected Preview Banner */}
      {selectedHub && (
        <View
          style={[
            styles.selectedBanner,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
              borderColor: '#10B981',
            },
          ]}
        >
          <View style={styles.selectedIconWrap}>
            <Check size={16} color="#10B981" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectedTitle, { color: isDark ? '#34D399' : '#065F46' }]}>
              {selectedHub.name}
            </Text>
            <Text
              style={[styles.selectedAddress, { color: isDark ? '#A7F3D0' : '#047857' }]}
              numberOfLines={2}
            >
              {selectedHub.address}
            </Text>
            <Text style={[styles.selectedCoords, { color: isDark ? '#6EE7B7' : '#059669' }]}>
              📍 GPS: {selectedHub.latitude.toFixed(4)}, {selectedHub.longitude.toFixed(4)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetsSection: {
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  presetsScroll: {
    gap: 6,
    paddingRight: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  selectedIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedAddress: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  selectedCoords: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
