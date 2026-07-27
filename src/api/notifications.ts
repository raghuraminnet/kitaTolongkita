import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
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

// Request permissions and get push token
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') {
    return getPushToken();
  }

  // Request permission
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  return getPushToken();
}

async function getPushToken(): Promise<string | null> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Add your Expo project ID here
    });
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

// Schedule a local notification
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

// Cancel a scheduled notification
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Add notification received listener
export function onNotificationReceived(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// Add notification response (tap) listener
export function onNotificationResponse(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Badge count
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

// In-app notification display (for when app is in foreground)
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
