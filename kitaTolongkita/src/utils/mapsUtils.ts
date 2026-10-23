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
  category?: 'Transit' | 'Community' | 'Market' | 'Mall';
  distanceKm?: number;
  distanceText?: string;
}

export const POPULAR_MALAYSIAN_HUBS: LocationDetails[] = [
  // ── Kuala Lumpur & Bangsar ──
  {
    name: 'Bangsar Community Hall',
    address: 'Jalan Telawi 3, Bangsar Baru, 59100 Kuala Lumpur',
    latitude: 3.1319,
    longitude: 101.6702,
    district: 'Bangsar',
    state: 'Kuala Lumpur',
    category: 'Community',
  },
  {
    name: 'Bangsar Village I & II',
    address: '1, Jalan Telawi 1, Bangsar Baru, 59100 Kuala Lumpur',
    latitude: 3.1299,
    longitude: 101.6698,
    district: 'Bangsar',
    state: 'Kuala Lumpur',
    category: 'Mall',
  },
  {
    name: 'Bangsar LRT Station (Kelana Jaya Line)',
    address: 'Jalan Bangsar, 59000 Kuala Lumpur',
    latitude: 3.1275,
    longitude: 101.6789,
    district: 'Bangsar',
    state: 'Kuala Lumpur',
    category: 'Transit',
  },
  {
    name: 'Mid Valley Megamall (North Court Drop-Off)',
    address: 'Lingkaran Syed Putra, Mid Valley City, 59200 Kuala Lumpur',
    latitude: 3.1177,
    longitude: 101.6775,
    district: 'Mid Valley',
    state: 'Kuala Lumpur',
    category: 'Mall',
  },
  {
    name: 'KL Sentral Transportation Hub',
    address: 'Jalan Stesen Sentral 5, Brickfields, 50470 Kuala Lumpur',
    latitude: 3.1342,
    longitude: 101.6865,
    district: 'Brickfields',
    state: 'Kuala Lumpur',
    category: 'Transit',
  },
  {
    name: 'TTDI Central Collection Hub',
    address: 'Jalan Tun Mohd Fuad, Taman Tun Dr Ismail, 60000 Kuala Lumpur',
    latitude: 3.1415,
    longitude: 101.6291,
    district: 'Taman Tun Dr Ismail',
    state: 'Kuala Lumpur',
    category: 'Community',
  },
  {
    name: 'TTDI MRT Station (Kajang Line)',
    address: 'Jalan Damansara, Taman Tun Dr Ismail, 60000 Kuala Lumpur',
    latitude: 3.1363,
    longitude: 101.6309,
    district: 'Taman Tun Dr Ismail',
    state: 'Kuala Lumpur',
    category: 'Transit',
  },
  {
    name: 'Pavilion Bukit Bintang (Main Entrance)',
    address: '168, Jalan Bukit Bintang, 55100 Kuala Lumpur',
    latitude: 3.1488,
    longitude: 101.7133,
    district: 'Bukit Bintang',
    state: 'Kuala Lumpur',
    category: 'Mall',
  },
  {
    name: 'Bukit Bintang MRT Station',
    address: 'Jalan Bukit Bintang, 55100 Kuala Lumpur',
    latitude: 3.1466,
    longitude: 101.7118,
    district: 'Bukit Bintang',
    state: 'Kuala Lumpur',
    category: 'Transit',
  },
  {
    name: 'Pasar Seni Central Market Drop-Off',
    address: 'Jalan Hang Kasturi, City Centre, 50050 Kuala Lumpur',
    latitude: 3.1454,
    longitude: 101.6958,
    district: 'City Centre',
    state: 'Kuala Lumpur',
    category: 'Market',
  },
  {
    name: 'Damansara Heights Community Hall',
    address: 'Jalan Medan Setia 2, Bukit Damansara, 50490 Kuala Lumpur',
    latitude: 3.1494,
    longitude: 101.6528,
    district: 'Damansara Heights',
    state: 'Kuala Lumpur',
    category: 'Community',
  },
  {
    name: 'Cheras Leisure Mall Collection Hub',
    address: 'Jalan Manis 6, Taman Segar, 56100 Cheras, Kuala Lumpur',
    latitude: 3.0906,
    longitude: 101.7423,
    district: 'Cheras',
    state: 'Kuala Lumpur',
    category: 'Mall',
  },
  {
    name: 'Pasar Malam Taman Melawati',
    address: 'Jalan Melawati 1, Taman Melawati, 53100 Kuala Lumpur',
    latitude: 3.2104,
    longitude: 101.7495,
    district: 'Taman Melawati',
    state: 'Kuala Lumpur',
    category: 'Market',
  },

  // ── Selangor & Petaling Jaya ──
  {
    name: 'SS2 Community Multi-Purpose Hall',
    address: 'Jalan SS 2/60, SS 2, 47300 Petaling Jaya, Selangor',
    latitude: 3.1197,
    longitude: 101.6214,
    district: 'Petaling Jaya',
    state: 'Selangor',
    category: 'Community',
  },
  {
    name: 'SS2 Durian Street & Food Court',
    address: 'Jalan SS 2/63, SS 2, 47300 Petaling Jaya, Selangor',
    latitude: 3.1182,
    longitude: 101.6226,
    district: 'Petaling Jaya',
    state: 'Selangor',
    category: 'Market',
  },
  {
    name: 'Taman Bahagia LRT Station',
    address: 'Jalan SS 2/3, SS 2, 47300 Petaling Jaya, Selangor',
    latitude: 3.1118,
    longitude: 101.6115,
    district: 'Petaling Jaya',
    state: 'Selangor',
    category: 'Transit',
  },
  {
    name: '1 Utama Shopping Centre (Old Wing)',
    address: '1, Lebuh Bandar Utama, Bandar Utama, 47800 Petaling Jaya, Selangor',
    latitude: 3.1502,
    longitude: 101.6152,
    district: 'Bandar Utama',
    state: 'Selangor',
    category: 'Mall',
  },
  {
    name: 'Bandar Utama MRT Station',
    address: 'Lebuh Bandar Utama, 47800 Petaling Jaya, Selangor',
    latitude: 3.1469,
    longitude: 101.6171,
    district: 'Bandar Utama',
    state: 'Selangor',
    category: 'Transit',
  },
  {
    name: 'Paradigm Mall PJ (Level G Entrance)',
    address: '1, Jalan SS 7/26a, Kelana Jaya, 47301 Petaling Jaya, Selangor',
    latitude: 3.1051,
    longitude: 101.5959,
    district: 'Kelana Jaya',
    state: 'Selangor',
    category: 'Mall',
  },
  {
    name: 'Damansara Uptown The Starling Mall',
    address: '6, Jalan SS 21/37, Damansara Utama, 47400 Petaling Jaya, Selangor',
    latitude: 3.1348,
    longitude: 101.6229,
    district: 'Damansara Utama',
    state: 'Selangor',
    category: 'Mall',
  },
  {
    name: 'Subang SS15 Courtyard Hub',
    address: 'Jalan SS 15/4g, SS 15, 47500 Subang Jaya, Selangor',
    latitude: 3.0763,
    longitude: 101.5898,
    district: 'Subang Jaya',
    state: 'Selangor',
    category: 'Mall',
  },
  {
    name: 'SS15 LRT Station (Kelana Jaya Line)',
    address: 'Persiaran Kewajipan, SS 15, 47500 Subang Jaya, Selangor',
    latitude: 3.0759,
    longitude: 101.5861,
    district: 'Subang Jaya',
    state: 'Selangor',
    category: 'Transit',
  },
  {
    name: 'Sunway Pyramid (Blue Atrium Drop-Off)',
    address: '3, Jalan PJS 11/15, Bandar Sunway, 47500 Subang Jaya, Selangor',
    latitude: 3.0733,
    longitude: 101.6074,
    district: 'Bandar Sunway',
    state: 'Selangor',
    category: 'Mall',
  },
  {
    name: 'Puchong IOI Mall (Main Lobby)',
    address: 'Batu 9, Jalan Puchong, Bandar Puchong Jaya, 47170 Puchong, Selangor',
    latitude: 3.0456,
    longitude: 101.6199,
    district: 'Puchong',
    state: 'Selangor',
    category: 'Mall',
  },
  {
    name: 'Cyberjaya D\'Pulze Community Hub',
    address: 'Persiaran Multimedia, Cyber 12, 63000 Cyberjaya, Selangor',
    latitude: 2.9213,
    longitude: 101.6559,
    district: 'Cyberjaya',
    state: 'Selangor',
    category: 'Mall',
  },
  {
    name: 'Putrajaya Sentral Station',
    address: 'Presint 7, 62250 Putrajaya',
    latitude: 2.9318,
    longitude: 101.6706,
    district: 'Putrajaya',
    state: 'Putrajaya',
    category: 'Transit',
  },
  {
    name: 'IOI City Mall Putrajaya (Symphony Walk)',
    address: 'IOI Resort City, 62502 Putrajaya, Sepang, Selangor',
    latitude: 2.9702,
    longitude: 101.7142,
    district: 'Sepang',
    state: 'Selangor',
    category: 'Mall',
  },
  {
    name: 'Setia City Mall Community Hub',
    address: 'Persiaran Setia Dagang, Setia Alam, 40170 Shah Alam, Selangor',
    latitude: 3.1105,
    longitude: 101.4632,
    district: 'Shah Alam',
    state: 'Selangor',
    category: 'Mall',
  },

  // ── Penang ──
  {
    name: 'Penang Pulau Tikus Market',
    address: 'Jalan Burma, Pulau Tikus, 10350 George Town, Pulau Pinang',
    latitude: 5.4305,
    longitude: 100.3126,
    district: 'George Town',
    state: 'Pulau Pinang',
    category: 'Market',
  },
  {
    name: 'Gurney Plaza Collection Point',
    address: '170, Gurney Drive, 10250 George Town, Pulau Pinang',
    latitude: 5.4379,
    longitude: 100.3098,
    district: 'George Town',
    state: 'Pulau Pinang',
    category: 'Mall',
  },
  {
    name: 'Queensbay Mall Coastal Drop-Off',
    address: '100, Persiaran Bayan Indah, 11900 Bayan Lepas, Pulau Pinang',
    latitude: 5.3328,
    longitude: 100.3068,
    district: 'Bayan Lepas',
    state: 'Pulau Pinang',
    category: 'Mall',
  },

  // ── Johor ──
  {
    name: 'Johor Bahru Mount Austin Hub',
    address: 'Jalan Austin Heights 8/1, Taman Mount Austin, 81100 Johor Bahru',
    latitude: 1.5586,
    longitude: 103.7785,
    district: 'Johor Bahru',
    state: 'Johor',
    category: 'Community',
  },
  {
    name: 'Mid Valley Southkey Mall Drop-Off',
    address: '1, Persiaran Southkey 1, Kota Southkey, 80150 Johor Bahru, Johor',
    latitude: 1.4989,
    longitude: 103.7774,
    district: 'Johor Bahru',
    state: 'Johor',
    category: 'Mall',
  },

  // ── Perak & Melaka ──
  {
    name: 'Ipoh Parade Community Spot',
    address: '105, Jalan Sultan Abdul Jalil, 30450 Ipoh, Perak',
    latitude: 4.5976,
    longitude: 101.0903,
    district: 'Ipoh',
    state: 'Perak',
    category: 'Mall',
  },
  {
    name: 'Melaka Jonker Walk Community Point',
    address: 'Jalan Hang Jebat, 75200 Melaka',
    latitude: 2.1956,
    longitude: 102.2479,
    district: 'Melaka Tengah',
    state: 'Melaka',
    category: 'Market',
  },
];

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
 * Formats distance with human-readable units (meters or kilometers)
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm == null || isNaN(distanceKm)) return '';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
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

  const estimatedMinutes = Math.max(3, Math.round((distanceKm / 28) * 60) + 2);
  const etaText =
    estimatedMinutes > 60
      ? `~${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m drive`
      : `~${estimatedMinutes} mins drive`;

  return { distanceText, etaText };
}

/**
 * Returns nearby landmarks sorted by distance from the user's current GPS location
 */
export function getNearbyLandmarks(
  userLat: number,
  userLon: number,
  limit = 8
): LocationDetails[] {
  return POPULAR_MALAYSIAN_HUBS.map((hub) => {
    const dist = calculateDistanceKm(userLat, userLon, hub.latitude, hub.longitude);
    return {
      ...hub,
      distanceKm: dist,
      distanceText: formatDistance(dist),
    };
  })
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, limit);
}

/**
 * Searches landmarks matching the given query text.
 * When user coordinates are provided, results are sorted by proximity.
 */
export function searchLandmarks(
  query: string,
  userLat?: number | null,
  userLon?: number | null,
  limit = 10
): LocationDetails[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    if (userLat != null && userLon != null) {
      return getNearbyLandmarks(userLat, userLon, limit);
    }
    return POPULAR_MALAYSIAN_HUBS.slice(0, limit);
  }

  const matches = POPULAR_MALAYSIAN_HUBS.filter((hub) => {
    return (
      hub.name.toLowerCase().includes(q) ||
      hub.address.toLowerCase().includes(q) ||
      (hub.district && hub.district.toLowerCase().includes(q)) ||
      (hub.state && hub.state.toLowerCase().includes(q)) ||
      (hub.category && hub.category.toLowerCase().includes(q))
    );
  }).map((hub) => {
    let distanceKm: number | undefined;
    let distanceText: string | undefined;
    if (userLat != null && userLon != null) {
      distanceKm = calculateDistanceKm(userLat, userLon, hub.latitude, hub.longitude);
      distanceText = formatDistance(distanceKm);
    }
    return {
      ...hub,
      distanceKm,
      distanceText,
    };
  });

  if (userLat != null && userLon != null) {
    matches.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }

  return matches.slice(0, limit);
}

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

  const googleUrl = getGoogleMapsUrl(latitude, longitude, label);
  return Linking.openURL(googleUrl);
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

  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${latitude},${longitude},ol-marker`;
}
