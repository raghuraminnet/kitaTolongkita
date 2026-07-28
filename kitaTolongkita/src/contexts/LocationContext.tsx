import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as Location from 'expo-location';
import { setGlobalLocation } from '../api/client';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
}

interface LocationContextValue extends LocationState {
  updateLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    isLoading: true,
    error: null,
    permissionStatus: 'undetermined',
  });
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setState(s => ({ ...s, permissionStatus: status as any, isLoading: false }));
    return status;
  };

  const updateLocation = async () => {
    try {
      const status = state.permissionStatus === 'granted'
        ? 'granted'
        : await requestPermission();

      if (status !== 'granted') {
        setState(s => ({ ...s, error: 'Location permission denied', isLoading: false }));
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setState(s => ({
        ...s,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        error: null,
        isLoading: false,
      }));
      setGlobalLocation(loc.coords.latitude, loc.coords.longitude);
    } catch (err: any) {
      setState(s => ({ ...s, error: err.message, isLoading: false }));
    }
  };

  useEffect(() => {
    (async () => {
      const status = await Location.getForegroundPermissionsAsync();
      setState(s => ({ ...s, permissionStatus: status.status as any }));
      if (status.status === 'granted') {
        await updateLocation();
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    })();

    // Watch position when permission granted
    if (state.permissionStatus === 'granted') {
      locationSubscription.current = Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 50 },
        (loc) => {
          setState(s => ({
            ...s,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          }));
          setGlobalLocation(loc.coords.latitude, loc.coords.longitude);
        }
      );
    }

    return () => {
      locationSubscription.current?.remove?.();
    };
  }, []);

  return (
    <LocationContext.Provider value={{ ...state, updateLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
