import { Platform, Linking } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationDetails {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  district?: string;
  state?: string;
}

export const POPULAR_MALAYSIAN_HUBS: LocationDetails[] = [
  {
    name: 'Bangsar Community Hub',
    address: 'Jalan Telawi 3, Bangsar Baru, 59100 Kuala Lumpur',
    latitude: 3.1319,
    longitude: 101.6702,
    district: 'Bangsar',
    state: 'Kuala Lumpur',
  },
  {
    name: 'SS2 Community Point',
    address: 'Jalan SS 2/60, SS 2, 47300 Petaling Jaya, Selangor',
    latitude: 3.1197,
    longitude: 101.6214,
    district: 'Petaling Jaya',
    state: 'Selangor',
  },
  {
    name: 'TTDI Central Collection Hub',
    address: 'Jalan Tun Mohd Fuad, Taman Tun Dr Ismail, 60000 Kuala Lumpur',
    latitude: 3.1415,
    longitude: 101.6291,
    district: 'Taman Tun Dr Ismail',
    state: 'Kuala Lumpur',
  },
  {
    name: 'Subang SS15 Courtyard Hub',
    address: 'Jalan SS 15/4g, SS 15, 47500 Subang Jaya, Selangor',
    latitude: 3.0763,
    longitude: 101.5898,
    district: 'Subang Jaya',
    state: 'Selangor',
  },
  {
    name: 'Bukit Bintang City Hub',
    address: 'Jalan Bukit Bintang, Bukit Bintang, 55100 Kuala Lumpur',
    latitude: 3.1466,
    longitude: 101.7118,
    district: 'Bukit Bintang',
    state: 'Kuala Lumpur',
  },
  {
    name: 'Cyberjaya Tech Hub',
    address: 'Persiaran Multimedia, Cyber 12, 63000 Cyberjaya, Selangor',
    latitude: 2.9213,
    longitude: 101.6559,
    district: 'Cyberjaya',
    state: 'Selangor',
  },
  {
    name: 'Penang Pulau Tikus Hub',
    address: 'Jalan Burma, Pulau Tikus, 10350 George Town, Pulau Pinang',
    latitude: 5.4305,
    longitude: 100.3126,
    district: 'George Town',
    state: 'Pulau Pinang',
  },
  {
    name: 'Johor Bahru Mount Austin Hub',
    address: 'Jalan Austin Heights 8/1, Taman Mount Austin, 81100 Johor Bahru',
    latitude: 1.5586,
    longitude: 103.7785,
    district: 'Johor Bahru',
    state: 'Johor',
  },
];

/**
 * Generates an optimized Google Maps navigation / search URL
 */
export function getGoogleMapsUrl(latitude: number, longitude: number, label?: string): string {
  const destination = `${latitude},${longitude}`;
  if (label) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destination}`;
}

/**
 * Generates a Waze navigation URL
 */
export function getWazeUrl(latitude: number, longitude: number): string {
  return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
}

/**
 * Generates an Apple Maps navigation URL
 */
export function getAppleMapsUrl(latitude: number, longitude: number, label?: string): string {
  const coords = `${latitude},${longitude}`;
  const query = label ? encodeURIComponent(label) : coords;
  return `http://maps.apple.com/?daddr=${coords}&q=${query}`;
}

/**
 * Opens native map application with preference for Google Maps on Android
 */
export async function openNavigation(latitude: number, longitude: number, label?: string) {
  if (Platform.OS === 'android') {
    const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label || 'Pickup Location')})`;
    const canOpenGeo = await Linking.canOpenURL(geoUrl).catch(() => false);
    if (canOpenGeo) {
      return Linking.openURL(geoUrl);
    }
  }

  // Fallback to Google Maps URL directly
  const googleUrl = getGoogleMapsUrl(latitude, longitude, label);
  return Linking.openURL(googleUrl);
}

/**
 * Computes Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance with appropriate units and estimated drive time in Malaysia
 */
export function formatDistanceAndEta(distanceKm: number | null | undefined): {
  distanceText: string;
  etaText: string;
} {
  if (distanceKm == null || isNaN(distanceKm)) {
    return { distanceText: '', etaText: '' };
  }

  const distanceText =
    distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} m`
      : `${distanceKm.toFixed(1)} km`;

  // Estimate Malaysian urban drive time (~25 km/h avg speed + 2 min buffer)
  const estimatedMinutes = Math.max(3, Math.round((distanceKm / 28) * 60) + 2);
  const etaText =
    estimatedMinutes > 60
      ? `~${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m drive`
      : `~${estimatedMinutes} mins drive`;

  return { distanceText, etaText };
}

/**
 * Generates a static map image URL for previewing coordinates
 */
export function getStaticMapUrl(
  latitude: number,
  longitude: number,
  zoom = 15,
  width = 600,
  height = 320,
  apiKey?: string
): string {
  if (apiKey && !apiKey.includes('REPLACE')) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&scale=2&maptype=roadmap&markers=color:red%7Clabel:P%7C${latitude},${longitude}&key=${apiKey}`;
  }

  // OpenStreetMap static tile with high-contrast cartography fallback
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${latitude},${longitude},ol-marker`;
}
