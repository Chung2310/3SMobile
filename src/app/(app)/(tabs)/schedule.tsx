import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, ErrorState, LoadingState, Pill, SectionHeader } from '@/components/UI';
import { Screen } from '@/components/Screen';
import { useJourney } from '@/context/JourneyContext';
import { asRecords, formatDate, readDate, readText } from '@/services/journey';
import { colors, radius, spacing, typography } from '@/theme';

import { router } from 'expo-router';

export default function ScheduleScreen() {
  const { journey, loading, refreshing, error, refresh } = useJourney();
  const handleBack = () => router.navigate('/(app)/(tabs)');

  if (loading && !journey) return <Screen title="Lịch tập" onBack={handleBack}><LoadingState /></Screen>;
  if (error && !journey) return <Screen title="Lịch tập" onBack={handleBack}><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;

  const events = [...asRecords(journey?.calendar)].sort((a, b) => readDate(a).localeCompare(readDate(b)));

  return (
    <Screen
      title="Lịch tập"
      subtitle="Theo dõi lịch tập và sự kiện sắp tới"
      refreshing={refreshing}
      onRefresh={refresh}
      onBack={handleBack}
    >
      <SectionHeader title="Lịch sắp tới" />
      {events.length ? events.map((event, index) => (
        <Pressable key={readText(event, ['id', 'uuid'], `event-${index}`)}>
          <Card>
            <View style={styles.eventRow}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>{readDate(event) ? new Date(readDate(event)).getDate() : '—'}</Text>
                <Text style={styles.dateMonth}>{readDate(event) ? new Date(readDate(event)).toLocaleDateString('vi-VN', { month: 'short' }) : ''}</Text>
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.title}>{readText(event, ['title', 'name', 'eventName'], 'Buổi tập')}</Text>
                <Text style={styles.meta}>{formatDate(readDate(event), true)}</Text>
                <Text style={styles.meta}>{readText(event, ['trainerName', 'ptName', 'coachName'], 'Chưa cập nhật PT')}</Text>
                <Pill label={readText(event, ['status'], 'Đã lên lịch')} tone="neutral" />
              </View>
            </View>
          </Card>
        </Pressable>
      )) : <Card><EmptyState title="Chưa có lịch" message="Lịch tập sẽ được đồng bộ khi PT tạo lịch cho bạn." /></Card>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventRow: { flexDirection: 'row', gap: spacing.md },
  dateBadge: { width: 56, height: 64, borderRadius: radius.sm, backgroundColor: '#E5F6FC', alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: colors.primary },
  dateMonth: { ...typography.caption, color: colors.secondary },
  eventContent: { flex: 1 },
  title: { ...typography.heading, color: colors.primary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
