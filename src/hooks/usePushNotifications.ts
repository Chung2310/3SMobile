import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import type * as NotificationsType from 'expo-notifications';
import { api } from '@/services/api/client';

type NotificationsModule = typeof NotificationsType;

// Android remote push notifications via expo-notifications were removed from Expo Go in SDK 53+.
// Guard loading to avoid crashing in Expo Go on Android.
const isExpoGo =
  isRunningInExpoGo() ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as Record<string, unknown>).appOwnership === 'expo';

const isAndroidExpoGo = Platform.OS === 'android' && isExpoGo;

let Notifications: NotificationsModule | null = null;
if (!isAndroidExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
  } catch (error) {
    console.warn('[Push] Không thể nạp expo-notifications:', error);
  }
}

// Cấu hình hiển thị notification khi app đang mở
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function registerForPushNotifications(): Promise<string | null> {
  if (isAndroidExpoGo || !Notifications) {
    console.log('[Push] Push notifications không được hỗ trợ trong Expo Go trên Android (SDK 53+). Vui lòng dùng development build.');
    return null;
  }

  // Push notification chỉ hoạt động trên thiết bị thật
  if (!Device.isDevice) {
    console.log('[Push] Thiết bị ảo không hỗ trợ push notification');
    return null;
  }

  // Kiểm tra quyền hiện tại
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Nếu chưa có quyền, xin quyền
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Người dùng từ chối quyền thông báo');
    return null;
  }

  try {
    // Lấy projectId từ Constants (Expo Go hoặc EAS Build)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });

    // Android cần notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mặc định',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0EA5E9',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('[Push] Lỗi khi lấy push token:', error);
    return null;
  }
}

/**
 * Hook đăng ký push notification.
 * Gọi ở layout gốc của app, chỉ chạy 1 lần khi mount.
 */
export function usePushNotifications() {
  const notificationListener = useRef<NotificationsType.EventSubscription | null>(null);
  const responseListener = useRef<NotificationsType.EventSubscription | null>(null);

  useEffect(() => {
    if (isAndroidExpoGo || !Notifications) {
      return;
    }

    // 1. Đăng ký push token
    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      console.log('[Push] Token:', token);

      // Gửi token lên server
      try {
        await api.post('/api/auth/push-token', { pushToken: token });
        console.log('[Push] Đã gửi token lên server');
      } catch (error) {
        console.error('[Push] Lỗi khi gửi token lên server:', error);
      }
    });

    // 2. Lắng nghe notification nhận được khi app đang mở
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      console.log('[Push] Nhận notification:', title, body);
    });

    // 3. Lắng nghe khi user tap vào notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;

      if (data?.screen === 'care') {
        router.push('/notifications');
      } else if (data?.screen) {
        router.push(`/${data.screen}` as never);
      } else {
        router.push('/notifications');
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
}
