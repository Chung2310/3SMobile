import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card, EmptyState, ErrorState, LoadingState, MetricCard, Pill, SectionHeader } from '@/components/UI';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { useJourney } from '@/context/JourneyContext';
import { asRecords, formatDate, getDisplayName, getLatestRecord, getPlanRecords, readDate, readNumber, readText } from '@/services/journey';
import { colors, radius, spacing, typography } from '@/theme';

export default function HomeScreen() {
  const { session } = useAuth();
  const { journey, loading, refreshing, error, refresh } = useJourney();

  if (loading && !journey) return <Screen title="Tổng quan"><LoadingState /></Screen>;
  if (error && !journey) return <Screen title="Tổng quan"><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;

  const safeJourney = journey || {};
  const sessions = asRecords(safeJourney.sessions);
  const measurements = asRecords(safeJourney.measurements);
  const calendar = asRecords(safeJourney.calendar);
  const goals = asRecords(safeJourney.goals);
  const activePlans = getPlanRecords(safeJourney, 'active');
  const latestMeasurement = getLatestRecord(measurements);
  const nextEvent = [...calendar].sort((a, b) => readDate(a).localeCompare(readDate(b)))[0];
  const displayName = getDisplayName(safeJourney, session?.user);
  const firstName = displayName.split(' ')[0] || displayName;
  const weight = readNumber(latestMeasurement, ['weight', 'weightKg']);
  const bodyFat = readNumber(latestMeasurement, ['bodyFat', 'bodyFatPercent', 'bodyFatPercentage']);

  return (
    <Screen title={`Xin chào, ${firstName}`} subtitle="Cùng giữ nhịp tiến bộ hôm nay nhé." refreshing={refreshing} onRefresh={refresh}>
      <Card tone="primary">
        <Text style={styles.heroEyebrow}>HÀNH TRÌNH CỦA BẠN</Text>
        <Text style={styles.heroTitle}>Mỗi buổi tập là một bước gần hơn tới mục tiêu.</Text>
        <View style={styles.heroFooter}>
          <Text style={styles.heroMeta}>{sessions.length} buổi tập đã ghi nhận</Text>
          <Text style={styles.heroArrow}>→</Text>
        </View>
      </Card>

      <SectionHeader title="Tóm tắt" />
      <View style={styles.metricsRow}>
        <MetricCard label="Buổi tập" value={String(sessions.length)} accent={colors.secondary} />
        <MetricCard label="Mục tiêu" value={String(goals.length)} accent={colors.accent} />
        <MetricCard label="Kế hoạch" value={String(activePlans.length)} accent={colors.success} />
      </View>

      <SectionHeader title="Chỉ số gần nhất" action="Xem tiến độ" onAction={() => router.push('/(app)/(tabs)/progress')} />
      {latestMeasurement ? (
        <Card>
          <View style={styles.measurementHeader}>
            <View>
              <Text style={styles.cardTitle}>Cập nhật cơ thể</Text>
              <Text style={styles.cardHint}>{formatDate(readDate(latestMeasurement))}</Text>
            </View>
            <Pill label="Mới nhất" tone="success" />
          </View>
          <View style={styles.measurementRow}>
            <MetricCard label="Cân nặng" value={weight === null ? '—' : `${weight} kg`} />
            <MetricCard label="Mỡ cơ thể" value={bodyFat === null ? '—' : `${bodyFat}%`} accent={colors.accent} />
          </View>
        </Card>
      ) : (
        <Card><EmptyState title="Chưa có dữ liệu cơ thể" message="PT sẽ cập nhật chỉ số sau mỗi lần đánh giá." /></Card>
      )}

      <SectionHeader title="Lịch sắp tới" action="Xem lịch" onAction={() => router.push('/(app)/(tabs)/schedule')} />
      {nextEvent ? (
        <Pressable onPress={() => router.push('/(app)/(tabs)/schedule')}>
          <Card>
            <View style={styles.eventRow}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>{readDate(nextEvent) ? new Date(readDate(nextEvent)).getDate() : '—'}</Text>
                <Text style={styles.dateMonth}>{readDate(nextEvent) ? new Date(readDate(nextEvent)).toLocaleDateString('vi-VN', { month: 'short' }) : ''}</Text>
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.cardTitle}>{readText(nextEvent, ['title', 'name', 'eventName'], 'Lịch tập')}</Text>
                <Text style={styles.cardHint}>{formatDate(readDate(nextEvent), true)}</Text>
                <Text style={styles.cardHint}>{readText(nextEvent, ['trainerName', 'ptName', 'description'], 'Đã lên lịch')}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        </Pressable>
      ) : (
        <Card><EmptyState title="Lịch đang trống" message="Khi PT tạo lịch, thông tin sẽ hiển thị ở đây." /></Card>
      )}

      <View style={styles.quickLinks}>
        <Pressable style={styles.quickLink} onPress={() => router.push('/(app)/notifications')}>
          <Text style={styles.quickIcon}>◌</Text>
          <Text style={styles.quickLabel}>Thông báo</Text>
        </Pressable>
        <Pressable style={styles.quickLink} onPress={() => router.push('/(app)/profile')}>
          <Text style={styles.quickIcon}>◎</Text>
          <Text style={styles.quickLabel}>Hồ sơ</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroEyebrow: { ...typography.caption, color: '#B9DDF0', letterSpacing: 1.4 },
  heroTitle: { ...typography.title, color: colors.textOnPrimary, marginTop: spacing.sm },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl },
  heroMeta: { ...typography.caption, color: '#B9DDF0' },
  heroArrow: { fontSize: 26, color: colors.textOnPrimary },
  metricsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  measurementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  cardHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  measurementRow: { flexDirection: 'row', gap: spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateBadge: { width: 52, height: 58, borderRadius: radius.sm, backgroundColor: '#E5F6FC', alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 22, lineHeight: 25, fontWeight: '800', color: colors.primary },
  dateMonth: { ...typography.caption, color: colors.secondary },
  eventContent: { flex: 1 },
  chevron: { fontSize: 28, color: colors.textMuted },
  quickLinks: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickLink: { flex: 1, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quickIcon: { fontSize: 22, color: colors.secondary },
  quickLabel: { ...typography.bodyMedium, color: colors.primary },
});
