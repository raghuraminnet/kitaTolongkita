import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi } from './client';

const PUSH_TOKEN_STORAGE_KEY = 'kitatolongkita_push_token';

// Configure notification presentation for foreground alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

/**
 * Configure Android notification channel (required for Android 8.0+)
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3366',
      sound: 'default',
    });
  }
}

/**
 * Requests permissions, retrieves Expo push token, and registers it with backend.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  await setupAndroidNotificationChannel();

  if (Platform.OS === 'web') {
    console.log('[Push] Web platform detected; push tokens operate on native iOS/Android');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Push] Running on simulator/emulator; push notifications require a physical device');
    return null;
  }

  try {
    // 1. Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Notification permission not granted');
      return null;
    }

    // 2. Obtain Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    const token = tokenData?.data;

    if (!token) {
      console.log('[Push] Failed to acquire Expo push token');
      return null;
    }

    console.log('[Push] Acquired push token:', token);

    // 3. Compare with previously stored token to prevent redundant API calls
    const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (storedToken !== token) {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await usersApi.registerPushToken(token, platform);
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      console.log('[Push] Successfully registered push token with backend');
    }

    return token;
  } catch (error) {
    console.warn('[Push] Error during push notification registration:', error);
    return null;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  secondsFromNow: number,
  data?: Record<string, unknown>
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: { seconds: secondsFromNow, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
  });
  return id;
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function onNotificationReceived(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function onNotificationResponse(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

// In-app notification display listener
let inAppCallback: ((title: string, body: string, data?: Record<string, unknown>) => void) | null = null;

export function showInAppNotification(title: string, body: string, data?: Record<string, unknown>) {
  if (inAppCallback) {
    inAppCallback(title, body, data);
  }
}

export function onInAppNotification(
  callback: (title: string, body: string, data?: Record<string, unknown>) => void
) {
  inAppCallback = callback;
}
