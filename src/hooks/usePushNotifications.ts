import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type * as NotificationsType from 'expo-notifications';
import { api } from '@/services/api/client';

// Remote push notifications bị gỡ khỏi Expo Go trên Android từ SDK 53.
// Chỉ require expo-notifications khi KHÔNG PHẢI Expo Go trên Android để tránh crash app.
const isExpoGo = typeof isRunningInExpoGo === 'function' ? isRunningInExpoGo() : Constants.appOwnership === 'expo';
const isExpoGoOnAndroid = Platform.OS === 'android' && Boolean(isExpoGo);

function getNotifications(): typeof NotificationsType | null {
  if (isExpoGoOnAndroid) {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (error) {
    console.warn('[Push] Không thể nạp module expo-notifications:', error);
    return null;
  }
}

const Notifications = getNotifications();

// Cấu hình hiển thị notification khi app đang mở (nếu hỗ trợ)
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    console.warn('[Push] Lỗi khi setNotificationHandler:', err);
  }
}

async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGoOnAndroid || !Notifications) {
    console.log('[Push] Android Push notifications không hỗ trợ trên Expo Go (SDK 53+). Dùng Development Build để nhận push.');
    return null;
  }

  // Trên iOS giả lập không hỗ trợ push notification từ xa
  if (Platform.OS === 'ios' && !Device.isDevice) {
    console.log('[Push] Giả lập iOS không hỗ trợ push notification');
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
    if (!projectId) {
      console.warn('[Push] Lưu ý: Chưa cấu hình "extra.eas.projectId" trong app.json.');
    }
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
    if (!Notifications) return;

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
    try {
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
    } catch (listenerError) {
      console.warn('[Push] Lỗi khi thiết lập notification listener:', listenerError);
    }

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

/**
 * Bắn một thông báo cục bộ (Local Notification) ngay trên thiết bị.
 * Hoạt động trên bản build APK / Standalone / iOS mà không cần phụ thuộc Firebase remote push.
 */
export async function triggerLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  if (!Notifications) {
    return false;
  }
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mặc định',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0EA5E9',
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data,
      },
      trigger: null,
    });
    return true;
  } catch (error) {
    console.warn('[Push] Lỗi khi kích hoạt local notification:', error);
    return false;
  }
}
