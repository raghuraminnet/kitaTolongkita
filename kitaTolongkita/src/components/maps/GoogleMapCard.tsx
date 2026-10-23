import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Modal,
  Image,
} from 'react-native';
import {
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  Car,
  Clock,
  Layers,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getGoogleMapsUrl,
  getWazeUrl,
  getAppleMapsUrl,
  openNavigation,
  formatDistanceAndEta,
  getStaticMapUrl,
} from '../../utils/mapsUtils';

interface GoogleMapCardProps {
  locationName: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  apiKey?: string;
}

export function GoogleMapCard({
  locationName,
  address,
  latitude,
  longitude,
  distanceKm,
  apiKey,
}: GoogleMapCardProps) {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const hasCoords = latitude != null && longitude != null && latitude !== 0 && longitude !== 0;
  const lat = latitude ?? 3.139;
  const lon = longitude ?? 101.6869;

  const { distanceText, etaText } = formatDistanceAndEta(distanceKm);

  const handleOpenGoogleMaps = () => {
    if (!hasCoords) {
      // Fallback search by address text
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || locationName)}`;
      Linking.openURL(url);
      return;
    }
    const url = getGoogleMapsUrl(lat, lon, locationName);
    Linking.openURL(url);
  };

  const handleOpenWaze = () => {
    if (!hasCoords) {
      Alert.alert('Coordinates Required', 'Exact GPS coordinates are required for Waze navigation.');
      return;
    }
    const url = getWazeUrl(lat, lon);
    Linking.openURL(url);
  };

  const handleOpenAppleMaps = () => {
    if (!hasCoords) {
      Linking.openURL(`http://maps.apple.com/?q=${encodeURIComponent(address || locationName)}`);
      return;
    }
    const url = getAppleMapsUrl(lat, lon, locationName);
    Linking.openURL(url);
  };

  const staticMapUrl = getStaticMapUrl(lat, lon, 15, 600, 300, apiKey);

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)',
        },
      ]}
    >
      {/* Map Snapshot Visual Canvas */}
      <TouchableOpacity
        style={styles.mapCanvas}
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
      >
        <Image
          source={{ uri: staticMapUrl }}
          style={styles.mapImage}
          resizeMode="cover"
        />

        {/* Ambient Map Tint Overlay */}
        <View
          style={[
            styles.mapTint,
            {
              backgroundColor: isDark
                ? 'rgba(15, 23, 42, 0.35)'
                : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        />

        {/* Floating Pickup Pin Marker */}
        <View style={styles.floatingPinContainer}>
          <View style={styles.pinPulseEffect} />
          <View
            style={[
              styles.pinBadge,
              { backgroundColor: colors['primary-container'] || '#0284C7' },
            ]}
          >
            <MapPin size={18} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <View
            style={[
              styles.pinLabelChip,
              { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.92)' : '#FFFFFF' },
            ]}
          >
            <Text
              style={[
                styles.pinLabelText,
                { color: isDark ? '#FFFFFF' : '#0F172A' },
              ]}
              numberOfLines={1}
            >
              {locationName || 'Pickup Point'}
            </Text>
          </View>
        </View>

        {/* Top Floating Badge */}
        <View style={styles.topBadgeRow}>
          <View
            style={[
              styles.googleMapsBadge,
              { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)' },
            ]}
          >
            <View style={styles.liveBeaconDot} />
            <Text style={[styles.badgeText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
              Google Maps Location
            </Text>
          </View>

          <View
            style={[
              styles.tapToViewChip,
              { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.75)' },
            ]}
          >
            <Compass size={12} color="#FFFFFF" />
            <Text style={styles.tapToViewText}>Tap to explore</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Location Details Body */}
      <View style={styles.detailsContent}>
        <View style={styles.locationHeaderRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={[
                styles.locationTitle,
                { color: colors['on-surface'] || (isDark ? '#F8FAFC' : '#0F172A') },
              ]}
            >
              {locationName || 'Pickup Location'}
            </Text>
            <Text
              style={[
                styles.locationAddressText,
                { color: colors['on-surface-variant'] || (isDark ? '#94A3B8' : '#64748B') },
              ]}
              numberOfLines={2}
            >
              {address}
            </Text>
          </View>

          {/* Quick Direction Round Icon */}
          <TouchableOpacity
            style={[
              styles.quickDirectionBtn,
              { backgroundColor: colors['primary-container'] || '#0284C7' },
            ]}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.8}
          >
            <Navigation size={18} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Proximity / Drive Time Meta Chips */}
        {(distanceText || etaText) ? (
          <View style={styles.metaChipsRow}>
            {Boolean(distanceText) && (
              <View
                style={[
                  styles.metaChip,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9' },
                ]}
              >
                <Car size={13} color={colors['primary-container'] || '#0284C7'} />
                <Text
                  style={[
                    styles.metaChipText,
                    { color: isDark ? '#E2E8F0' : '#334155' },
                  ]}
                >
                  {distanceText} away
                </Text>
              </View>
            )}

            {Boolean(etaText) && (
              <View
                style={[
                  styles.metaChip,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9' },
                ]}
              >
                <Clock size={13} color="#10B981" />
                <Text style={[styles.metaChipText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                  {etaText}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Navigation Action Buttons Ribbon */}
        <View style={styles.actionsRibbon}>
          <TouchableOpacity
            style={[
              styles.primaryNavBtn,
              { backgroundColor: colors['primary-container'] || '#0284C7' },
            ]}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.85}
          >
            <Navigation size={15} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.primaryNavBtnText}>Google Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryNavBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
            onPress={handleOpenWaze}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.secondaryNavBtnText,
                { color: isDark ? '#F1F5F9' : '#0F172A' },
              ]}
            >
              Waze
            </Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[
                styles.secondaryNavBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
              onPress={handleOpenAppleMaps}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.secondaryNavBtnText,
                  { color: isDark ? '#F1F5F9' : '#0F172A' },
                ]}
              >
                Apple Maps
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Expanded Interactive Map Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                ]}
              >
                {locationName || 'Pickup Location'}
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                {address}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.modalCloseBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
              ]}
              onPress={() => setModalVisible(false)}
            >
              <X size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </TouchableOpacity>
          </View>

          {/* Full Map Canvas */}
          <View style={styles.fullMapWrapper}>
            <Image
              source={{ uri: getStaticMapUrl(lat, lon, 16, 800, 800, apiKey) }}
              style={styles.fullMapImage}
              resizeMode="cover"
            />
            {/* Center Pin */}
            <View style={styles.centerPinOverlay}>
              <View style={styles.largePinBadge}>
                <MapPin size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>

            {/* Coordinates Pill */}
            <View style={styles.coordinatesPill}>
              <Text style={styles.coordinatesText}>
                {lat.toFixed(5)}° N, {lon.toFixed(5)}° E
              </Text>
            </View>
          </View>

          {/* Modal Footer with Actions */}
          <View
            style={[
              styles.modalFooter,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modalActionPrimary,
                { backgroundColor: colors['primary-container'] || '#0284C7' },
              ]}
              onPress={() => {
                setModalVisible(false);
                handleOpenGoogleMaps();
              }}
            >
              <Navigation size={18} color="#FFFFFF" />
              <Text style={styles.modalActionPrimaryText}>Start Navigation in Google Maps</Text>
            </TouchableOpacity>

            <View style={styles.modalSecondaryRow}>
              <TouchableOpacity
                style={[
                  styles.modalActionSecondary,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                onPress={() => {
                  setModalVisible(false);
                  handleOpenWaze();
                }}
              >
                <Text
                  style={[
                    styles.modalActionSecondaryText,
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                >
                  Open in Waze
                </Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[
                    styles.modalActionSecondary,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    handleOpenAppleMaps();
                  }}
                >
                  <Text
                    style={[
                      styles.modalActionSecondaryText,
                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                    ]}
                  >
                    Apple Maps
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 6,
  },
  mapCanvas: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingPinContainer: {
    position: 'absolute',
    top: '32%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -30 }],
    alignItems: 'center',
  },
  pinPulseEffect: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(2, 132, 199, 0.28)',
    top: -4,
  },
  pinBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  pinLabelChip: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  pinLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  googleMapsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  liveBeaconDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tapToViewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tapToViewText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  detailsContent: {
    padding: 14,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  locationAddressText: {
    fontSize: 12,
    lineHeight: 17,
  },
  quickDirectionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  metaChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  primaryNavBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryNavBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryNavBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMapWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  fullMapImage: {
    width: '100%',
    height: '100%',
  },
  centerPinOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -44 }],
  },
  largePinBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  coordinatesPill: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coordinatesText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  modalActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  modalActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionSecondary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
