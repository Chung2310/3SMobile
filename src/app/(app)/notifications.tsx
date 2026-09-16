import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Card, EmptyState, ErrorState, LoadingState, Pill } from '@/components/UI';
import { api } from '@/services/api/client';
import { formatDate, readText } from '@/services/journey';
import { colors, spacing, typography } from '@/theme';
import type { AppNotification } from '@/types/domain';

type NotificationResponse = AppNotification[] | { items?: AppNotification[]; notifications?: AppNotification[]; data?: AppNotification[] };

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
    if (isRefresh) setRefreshing(true); else setLoading(true);
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
    setItems((current) => current.map((notification) => notificationId(notification) === id ? { ...notification, readAt: new Date().toISOString() } : notification));
    try {
      await api.patch(`/api/notifications/${encodeURIComponent(id)}/read`);
    } catch {
      setItems((current) => current.map((notification) => notificationId(notification) === id ? { ...notification, readAt: null } : notification));
    }
  }

  function openResource(item: AppNotification) {
    void markAsRead(item);
    const resourceType = readText(item, ['resourceType']).toLowerCase();
    if (resourceType.includes('calendar')) router.push('/(app)/(tabs)/schedule');
    else if (resourceType.includes('report') || resourceType.includes('progress')) router.push('/(app)/(tabs)/progress');
  }

  return (
    <Screen
      title="Thông báo"
      subtitle="Cập nhật mới nhất từ phòng gym."
      refreshing={refreshing}
      onRefresh={() => load(true)}
      onBack={() => router.navigate('/(app)/(tabs)')}
    >
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : items.length ? items.map((item, index) => {
        const unread = !item.readAt;
        return (
          <Pressable key={notificationId(item) || `notification-${index}`} onPress={() => openResource(item)}>
            <Card>
              <View style={styles.header}>
                <Text style={[styles.title, unread && styles.unreadTitle]}>{readText(item, ['title'], 'Thông báo mới')}</Text>
                {unread ? <Pill label="Mới" tone="success" /> : null}
              </View>
              <Text style={styles.message}>{readText(item, ['message'], 'Bạn có một cập nhật mới từ 3S Gym.')}</Text>
              <Text style={styles.date}>{formatDate(readText(item, ['createdAt', 'updatedAt']))}</Text>
            </Card>
          </Pressable>
        );
      }) : <EmptyState title="Chưa có thông báo" message="Các cập nhật về lịch, báo cáo và kế hoạch sẽ hiển thị tại đây." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.heading, color: colors.text, flex: 1 },
  unreadTitle: { color: colors.primary },
  message: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  date: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
});
