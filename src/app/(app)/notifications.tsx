import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/UI';
import { api } from '@/services/api/client';
import { formatDate, readText } from '@/services/journey';
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
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length ? (
        <View style={styles.listContainer}>
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
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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

