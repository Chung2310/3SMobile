import { StyleSheet, Text } from 'react-native';

import { Card, EmptyState, ErrorState, LoadingState, Pill, SectionHeader, Row } from '@/components/UI';
import { Screen } from '@/components/Screen';
import { useJourney } from '@/context/JourneyContext';
import { asRecords, formatDate, getPlanRecords, readBoolean, readDate, readNumber, readText } from '@/services/journey';
import { colors, spacing, typography } from '@/theme';

export default function WorkoutsScreen() {
  const { journey, loading, refreshing, error, refresh } = useJourney();
  if (loading && !journey) return <Screen title="Tập luyện"><LoadingState /></Screen>;
  if (error && !journey) return <Screen title="Tập luyện"><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;

  const sessions = asRecords(journey?.sessions);
  const plans = getPlanRecords(journey || {}, 'active');

  return (
    <Screen title="Tập luyện" subtitle="Theo dõi các buổi tập và kế hoạch PT giao." refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader title="Kế hoạch đang hoạt động" />
      {plans.length ? plans.map((plan, index) => (
        <Card key={readText(plan, ['id', 'uuid'], `plan-${index}`)}>
          <Text style={styles.title}>{readText(plan, ['name', 'title', 'planName'], `Kế hoạch ${index + 1}`)}</Text>
          <Text style={styles.description}>{readText(plan, ['description', 'goal', 'notes'], 'Kế hoạch được PT cá nhân hóa cho bạn.')}</Text>
          <Row label="Trạng thái" value={readText(plan, ['status'], 'Đang thực hiện')} icon="✓" />
        </Card>
      )) : <Card><EmptyState title="Chưa có kế hoạch" message="Kế hoạch tập sẽ xuất hiện khi PT publish cho bạn." /></Card>}

      <SectionHeader title="Lịch sử buổi tập" />
      {sessions.length ? sessions.map((session, index) => {
        const completed = readBoolean(session, ['completed', 'isCompleted']) || readText(session, ['status']).toLowerCase() === 'completed';
        const duration = readNumber(session, ['duration', 'durationMinutes']);
        return (
          <Card key={readText(session, ['id', 'uuid'], `session-${index}`)}>
            <Text style={styles.title}>{readText(session, ['title', 'name', 'workoutName'], 'Buổi tập')}</Text>
            <Text style={styles.date}>{formatDate(readDate(session), true)}</Text>
            <Row label="PT phụ trách" value={readText(session, ['trainerName', 'ptName', 'coachName'], 'Chưa cập nhật')} icon="✦" />
            <Row label="Thời lượng" value={duration === null ? 'Chưa cập nhật' : `${duration} phút`} icon="◷" />
            <Pill label={completed ? 'Đã hoàn thành' : readText(session, ['status'], 'Đã ghi nhận')} tone={completed ? 'success' : 'neutral'} />
          </Card>
        );
      }) : <Card><EmptyState title="Chưa có buổi tập" message="Các buổi tập được ghi nhận sẽ hiển thị tại đây." /></Card>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.primary },
  description: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xs },
  date: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
