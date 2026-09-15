import { StyleSheet, Text } from 'react-native';

import { Card, EmptyState, ErrorState, LoadingState, Row, SectionHeader } from '@/components/UI';
import { Screen } from '@/components/Screen';
import { useJourney } from '@/context/JourneyContext';
import { asRecords, formatDate, readDate, readNumber, readText } from '@/services/journey';
import { colors, spacing, typography } from '@/theme';

export default function NutritionScreen() {
  const { journey, loading, refreshing, error, refresh } = useJourney();
  if (loading && !journey) return <Screen title="Dinh dưỡng"><LoadingState /></Screen>;
  if (error && !journey) return <Screen title="Dinh dưỡng"><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;

  const nutritionPlans = asRecords(journey?.nutritionPlans);
  const nutritionLogs = asRecords(journey?.nutritionLogs);

  return (
    <Screen title="Dinh dưỡng" subtitle="Ăn đúng để phục hồi và tiến bộ tốt hơn." refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader title="Kế hoạch dinh dưỡng" />
      {nutritionPlans.length ? nutritionPlans.map((plan, index) => (
        <Card key={readText(plan, ['id', 'uuid'], `nutrition-${index}`)}>
          <Text style={styles.title}>{readText(plan, ['name', 'title', 'planName'], `Kế hoạch ${index + 1}`)}</Text>
          <Text style={styles.description}>{readText(plan, ['description', 'goal', 'notes'], 'PT chưa thêm mô tả cho kế hoạch này.')}</Text>
          <Row label="Calories mục tiêu" value={readNumber(plan, ['targetCalories', 'calories', 'dailyCalories']) === null ? 'Chưa cập nhật' : `${readNumber(plan, ['targetCalories', 'calories', 'dailyCalories'])} kcal`} icon="◈" />
          <Row label="Cập nhật" value={formatDate(readDate(plan))} icon="↻" />
        </Card>
      )) : <Card><EmptyState title="Chưa có kế hoạch ăn uống" message="PT sẽ publish kế hoạch dinh dưỡng phù hợp với mục tiêu của bạn." /></Card>}

      <SectionHeader title="Nhật ký gần đây" />
      {nutritionLogs.length ? nutritionLogs.slice(0, 10).map((log, index) => (
        <Card key={readText(log, ['id', 'uuid'], `log-${index}`)}>
          <Text style={styles.title}>{readText(log, ['mealName', 'name', 'title', 'mealType'], 'Bữa ăn')}</Text>
          <Text style={styles.date}>{formatDate(readDate(log), true)}</Text>
          <Text style={styles.description}>{readText(log, ['description', 'notes', 'foods'], 'Đã ghi nhận nhật ký dinh dưỡng.')}</Text>
          <Row label="Calories" value={readNumber(log, ['calories', 'totalCalories']) === null ? 'Chưa cập nhật' : `${readNumber(log, ['calories', 'totalCalories'])} kcal`} />
        </Card>
      )) : <Card><EmptyState title="Chưa có nhật ký" message="Nhật ký dinh dưỡng của bạn sẽ hiển thị tại đây." /></Card>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.primary },
  description: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  date: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
