import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/UI';
import { api } from '@/services/api/client';
import { formatDate, readText } from '@/services/journey';
import { triggerLocalNotification } from '@/hooks/usePushNotifications';
import type { AppNotification } from '@/types/domain';

type NotificationResponse =
  | AppNotification[]
  | { items?: AppNotification[]; notifications?: AppNotification[]; data?: AppNotification[] };

function normalizeNotifications(payload: NotificationResponse | null): AppNotification[] {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  return payload.items || payload.notifications || payload.data || [];
}

function notificationId(item: AppNotification): string {
  return readText(item, ['_id', 'id']);
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingTest, setCreatingTest] = useState(false);

  const handleCreateTestNotification = async () => {
    if (creatingTest) return;
    setCreatingTest(true);
    try {
      const res = await api.post<any>('/api/notifications/test', {});
      const newNotification = res?.data || res;
      const pushSent = res?.meta?.pushSent || 0;
      if (newNotification && (newNotification._id || newNotification.id)) {
        setItems((prev) => [newNotification, ...prev]);
        const title = readText(newNotification, ['title'], 'Thông báo thử nghiệm');
        const message = readText(newNotification, ['message'], 'Bạn vừa nhận một thông báo mới.');
        const localSent = await triggerLocalNotification(title, message, {
          screen: 'notifications',
          resourceType: readText(newNotification, ['resourceType']),
          resourceId: notificationId(newNotification),
        });

        const alertNote = (pushSent > 0 || localSent)
          ? '\n\n✅ Đã bắn 1 thông báo ra thanh trạng thái / màn hình khóa điện thoại.'
          : '\n\nℹ️ Đã lưu vào app & danh sách thông báo. (Trên Expo Go Android, tính năng đẩy ra thanh thông báo bị Expo SDK 53 chặn; trên bản APK cài vào máy sẽ đẩy ra ngoài bình thường).';

        Alert.alert('🔔 ' + title, message + alertNote, [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Xem chi tiết', onPress: () => openResource(newNotification) },
        ]);
      } else {
        void load(true);
      }
    } catch (cause) {
      Alert.alert('Lỗi', cause instanceof Error ? cause.message : 'Không tạo được thông báo thử nghiệm.');
    } finally {
      setCreatingTest(false);
    }
  };

  const load = useCallback(async (isRefresh = false) => {
    setError(null);
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const payload = await api.get<NotificationResponse>('/api/notifications?page=1&limit=50');
      setItems(normalizeNotifications(payload));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được thông báo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function markAsRead(item: AppNotification) {
    const id = notificationId(item);
    if (!id || item.readAt) return;
    setItems((current) =>
      current.map((notification) =>
        notificationId(notification) === id
          ? { ...notification, readAt: new Date().toISOString() }
          : notification
      )
    );
    try {
      await api.patch(`/api/notifications/${encodeURIComponent(id)}/read`);
    } catch {
      setItems((current) =>
        current.map((notification) =>
          notificationId(notification) === id ? { ...notification, readAt: null } : notification
        )
      );
    }
  }

  function openResource(item: AppNotification) {
    void markAsRead(item);
    const resourceType = readText(item, ['resourceType']).toLowerCase();
    if (resourceType.includes('calendar')) router.push('/(app)/(tabs)/schedule');
    else if (resourceType.includes('report') || resourceType.includes('progress'))
      router.push('/(app)/(tabs)/progress');
    else if (resourceType.includes('care') || resourceType.includes('package'))
      router.push('/(app)/customers');
  }

  return (
    <Screen
      title="Thông báo"
      subtitle="Cập nhật mới nhất từ phòng gym."
      refreshing={refreshing}
      onRefresh={() => load(true)}
      onBack={() => router.navigate('/(app)/(tabs)')}
      rightAction={
        <Pressable
          onPress={handleCreateTestNotification}
          disabled={creatingTest}
          style={({ pressed }) => [
            styles.testHeaderBtn,
            pressed && styles.testHeaderBtnPressed,
            creatingTest && styles.testHeaderBtnDisabled,
          ]}
          hitSlop={8}
          accessibilityLabel="Thử tạo thông báo"
        >
          <Feather name="bell" size={13} color="#0284C7" />
          <Text style={styles.testHeaderBtnText}>
            {creatingTest ? 'Đang gửi...' : 'Test bắn chuông'}
          </Text>
        </Pressable>
      }
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length ? (
        <View style={styles.listContainer}>
          {/* Quick Test Action Banner */}
          <Pressable
            onPress={handleCreateTestNotification}
            disabled={creatingTest}
            style={({ pressed }) => [styles.testBanner, pressed && styles.testBannerPressed]}
          >
            <View style={styles.testBannerIconWrap}>
              <Feather name="send" size={14} color="#0284C7" />
            </View>
            <View style={styles.testBannerContent}>
              <Text style={styles.testBannerTitle}>
                {creatingTest ? 'Đang tạo thông báo...' : 'Bắn thông báo ngẫu nhiên để test 🔔'}
              </Text>
              <Text style={styles.testBannerSub}>
                Tạo 1 thông báo ngẫu nhiên gửi ra màn hình và lưu vào danh sách
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </Pressable>
          {items.map((item, index) => {
            const unread = !item.readAt;
            const resourceType = readText(item, ['resourceType']).toLowerCase();
            const iconName = resourceType.includes('calendar')
              ? 'calendar'
              : resourceType.includes('report')
              ? 'activity'
              : resourceType.includes('care') || resourceType.includes('package')
              ? 'alert-circle'
              : 'bell';

            return (
              <Pressable
                key={notificationId(item) || `notification-${index}`}
                onPress={() => openResource(item)}
                style={({ pressed }) => [
                  styles.card,
                  unread && styles.unreadCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, unread && styles.iconWrapUnread]}>
                    <Feather
                      name={iconName}
                      size={18}
                      color={unread ? '#0284C7' : '#64748B'}
                    />
                  </View>
                  <View style={styles.titleWrap}>
                    <Text
                      style={[styles.title, unread && styles.unreadTitle]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {readText(item, ['title'], 'Thông báo mới')}
                    </Text>
                  </View>
                  {unread && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>MỚI</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.message} numberOfLines={3} ellipsizeMode="tail">
                  {readText(item, ['message'], 'Bạn có một cập nhật mới từ 3S Gym.')}
                </Text>

                <View style={styles.dateRow}>
                  <Feather name="clock" size={12} color="#94A3B8" />
                  <Text style={styles.date}>
                    {formatDate(readText(item, ['createdAt', 'updatedAt']))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Feather name="bell-off" size={28} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
          <Text style={styles.emptyDesc}>
            Các cập nhật về lịch, báo cáo và kế hoạch sẽ hiển thị tại đây.
          </Text>
          <Pressable
            onPress={handleCreateTestNotification}
            disabled={creatingTest}
            style={({ pressed }) => [
              styles.emptyTestBtn,
              pressed && styles.emptyTestBtnPressed,
              creatingTest && { opacity: 0.6 },
            ]}
          >
            <Feather name="plus-circle" size={15} color="#FFFFFF" />
            <Text style={styles.emptyTestBtnText}>
              {creatingTest ? 'Đang tạo...' : 'Tạo 1 thông báo ngẫu nhiên'}
            </Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  testHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  testHeaderBtnPressed: {
    backgroundColor: '#E0F2FE',
    transform: [{ scale: 0.96 }],
  },
  testHeaderBtnDisabled: {
    opacity: 0.6,
  },
  testHeaderBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  testBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 10,
    marginBottom: 4,
  },
  testBannerPressed: {
    backgroundColor: '#E0F2FE',
    transform: [{ scale: 0.99 }],
  },
  testBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  testBannerContent: {
    flex: 1,
  },
  testBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  testBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  emptyTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  emptyTestBtnPressed: {
    backgroundColor: '#0369A1',
    transform: [{ scale: 0.96 }],
  },
  emptyTestBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: '#E0F2FE',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  unreadTitle: {
    color: '#0284C7',
  },
  newBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  message: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  date: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginVertical: 16,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});

