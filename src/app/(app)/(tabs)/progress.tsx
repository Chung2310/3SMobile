import { StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, ErrorState, LoadingState, MetricCard, SectionHeader, Row } from '@/components/UI';
import { Screen } from '@/components/Screen';
import { useJourney } from '@/context/JourneyContext';
import { asRecords, formatDate, getLatestRecord, readDate, readNumber, readText } from '@/services/journey';
import { colors, spacing, typography } from '@/theme';

import { router } from 'expo-router';

export default function ProgressScreen() {
  const { journey, loading, refreshing, error, refresh } = useJourney();
  const handleBack = () => router.navigate('/(app)/(tabs)');

  if (loading && !journey) return <Screen title="Chỉ số InBody" onBack={handleBack}><LoadingState /></Screen>;
  if (error && !journey) return <Screen title="Chỉ số InBody" onBack={handleBack}><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;

  const measurements = asRecords(journey?.measurements);
  const inbodyRecords = asRecords(journey?.inbodyRecords);
  const reports = asRecords(journey?.reports);
  const photos = asRecords(journey?.photos);
  const latest = getLatestRecord(measurements) || getLatestRecord(inbodyRecords);
  const weight = readNumber(latest, ['weight', 'weightKg']);
  const bodyFat = readNumber(latest, ['bodyFat', 'bodyFatPercent', 'bodyFatPercentage']);
  const muscle = readNumber(latest, ['muscleMass', 'muscleMassKg', 'skeletalMuscle']);

  return (
    <Screen
      title="Chỉ số InBody"
      subtitle="Theo dõi cân nặng, tỷ lệ cơ và mỡ cơ thể"
      refreshing={refreshing}
      onRefresh={refresh}
      onBack={handleBack}
    >
      <SectionHeader title="Chỉ số gần nhất" />
      {latest ? (
        <Card>
          <Text style={styles.date}>{formatDate(readDate(latest))}</Text>
          <View style={styles.metricsRow}>
            <MetricCard label="Cân nặng" value={weight === null ? '—' : `${weight} kg`} />
            <MetricCard label="Mỡ cơ thể" value={bodyFat === null ? '—' : `${bodyFat}%`} accent={colors.accent} />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard label="Cơ xương" value={muscle === null ? '—' : `${muscle} kg`} accent={colors.success} />
            <MetricCard label="Lần đo" value={String(measurements.length + inbodyRecords.length)} accent={colors.secondary} />
          </View>
        </Card>
      ) : <Card><EmptyState title="Chưa có chỉ số" message="Dữ liệu đo cơ thể và InBody sẽ được cập nhật sau buổi đánh giá." /></Card>}

      <SectionHeader title="Báo cáo từ PT" />
      {reports.length ? reports.slice(0, 10).map((report, index) => (
        <Card key={readText(report, ['id', 'uuid'], `report-${index}`)}>
          <Text style={styles.title}>{readText(report, ['title', 'name'], 'Báo cáo tiến độ')}</Text>
          <Text style={styles.date}>{formatDate(readDate(report))}</Text>
          <Text style={styles.description}>{readText(report, ['summary', 'content', 'notes', 'description'], 'PT đã cập nhật một báo cáo mới cho bạn.')}</Text>
        </Card>
      )) : <Card><EmptyState title="Chưa có báo cáo" message="Báo cáo được PT publish sẽ hiển thị tại đây." /></Card>}

      <SectionHeader title="Ảnh tiến độ" />
      {photos.length ? photos.slice(0, 10).map((photo, index) => (
        <Card key={readText(photo, ['id', 'uuid'], `photo-${index}`)}>
          <Row label="Ngày chụp" value={formatDate(readDate(photo))} icon="▣" />
          <Row label="Góc chụp" value={readText(photo, ['view', 'pose', 'category'], 'Tiến độ')} icon="◉" />
        </Card>
      )) : <Card><EmptyState title="Chưa có ảnh tiến độ" message="Ảnh sẽ xuất hiện sau khi PT cập nhật cho hồ sơ của bạn." /></Card>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  metricsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  title: { ...typography.heading, color: colors.primary },
  description: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
