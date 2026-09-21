import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '@/services/api/client';
import { asRecord, asRecords, formatDate, readText } from '@/services/journey';
import { dateIso, journeyPath, MEASUREMENTS, RESULT_FIELDS } from '@/services/progress';
import { comparisonValue, lastExerciseResult, priorRecords } from '@/services/progressComparison';
import { colors, spacing, typography } from '@/theme';
import type { JsonRecord } from '@/types/domain';
import { messageOf } from '@/utils/error';
import { Button, Notice } from '../workouts/Controls';

export function ProgressComparison({ customerId, kind, draft, plan, excludeId = '' }: {
  customerId: string; kind: 'session' | 'measurement'; draft: JsonRecord; plan: JsonRecord; excludeId?: string;
}) {
  const [history, setHistory] = useState<{ customerId: string; reload: number; data: JsonRecord }>();
  const [failure, setFailure] = useState<{ customerId: string; reload: number; message: string }>();
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    void api.get<JsonRecord>(journeyPath(customerId)).then(data => {
      if (active) setHistory({ customerId, reload, data });
    }).catch(cause => { if (active) setFailure({ customerId, reload, message: messageOf(cause) }); });
    return () => { active = false; };
  }, [customerId, reload]);
  const data = history?.customerId === customerId && history.reload === reload ? history.data : undefined;
  const error = failure?.customerId === customerId && failure.reload === reload ? failure.message : '';
  const before = useMemo(() => {
    try {
      if (kind === 'session') return dateIso(String(draft.date), String(draft.time));
      if (excludeId) return dateIso(String(draft.date));
      // New date-only measurements include earlier entries on the same calendar day.
      return new Date(Date.parse(dateIso(String(draft.date), '23:59')) + 60000).toISOString();
    }
    catch { return ''; }
  }, [draft.date, draft.time, kind, excludeId]);
  const sessions = useMemo(() => priorRecords(asRecords(data?.sessions), before, customerId), [data, before, customerId]);
  const measurements = useMemo(() => priorRecords(asRecords(data?.measurements), before, customerId, excludeId), [data, before, customerId, excludeId]);
  const previousBody = measurements[0];
  const body = kind === 'session' ? asRecord(draft.bodyMeasurement) : draft;
  const hasBody = kind === 'measurement' || MEASUREMENTS.some(([key]) => String(body[key] ?? '').trim());
  const exercises = asRecords(asRecords(plan.sessions)[Number(draft.sessionIndex)]?.exercises);
  const results = asRecords(draft.results);
  return <View style={styles.card}>
    <View style={styles.heading}><Feather name="repeat" size={20} color={colors.primary} /><Text style={styles.title}>So sánh với lần gần nhất</Text></View>
    {error ? <><Notice error text={'Không tải được dữ liệu so sánh: ' + error} /><Button secondary label="Thử lại" onPress={() => setReload(value => value + 1)} /></>
      : !data ? <View style={styles.heading}><ActivityIndicator color={colors.primary} /><Text style={styles.meta}>Đang tải dữ liệu so sánh</Text></View>
      : !before ? <Notice text="Chọn ngày giờ hợp lệ để đối chiếu với lần ghi nhận trước đó." />
      : <>
        {kind === 'session' && exercises.map((exercise, index) => {
          const previous = lastExerciseResult(sessions, exercise, plan, Number(draft.sessionIndex), index);
          const type = readText(exercise, ['trackingType']);
          const current = results[index] || {};
          const isSets = type === 'STRENGTH' || type === 'BODYWEIGHT';
          const oldSets = asRecords(previous?.result.sets);
          const newSets = asRecords(current.sets);
          const rows = isSets ? Array.from({ length: Math.max(oldSets.length, newSets.length) }, (_, i) => i) : [0];
          return <View key={index} style={styles.group}>
            <Text numberOfLines={3} ellipsizeMode="tail" style={styles.label}>{index + 1}. {readText(exercise, ['name', 'exerciseName'], 'Bài tập')}</Text>
            {!previous ? <Notice text="Chưa có kết quả trước đó phù hợp cho bài này. Kết quả bạn lưu sẽ làm mốc cho lần sau." /> : <>
              <Text numberOfLines={2} ellipsizeMode="tail" style={styles.meta}>Lần gần nhất: {formatDate(previous.date, true)}</Text>
              {isSets && <Text style={styles.meta}>{comparisonValue(newSets.filter(set => set.completed === true).length, oldSets.filter(set => set.completed === true).length, 'hiệp hoàn thành')}</Text>}
              {rows.map(i => {
                const old = isSets ? oldSets[i] || {} : previous.result;
                const now = isSets ? newSets[i] || {} : current;
                const compatibleSide = type !== 'MOBILITY' || Boolean(now.side) && now.side === old.side;
                return <View key={i} style={styles.set}>
                  {isSets && <Text style={styles.label}>Hiệp {i + 1}</Text>}
                  {type === 'MOBILITY' && <Text numberOfLines={2} ellipsizeMode="tail" style={styles.meta}>Bên tập lần trước: {({ LEFT: 'Trái', RIGHT: 'Phải', BOTH: 'Hai bên' } as Record<string, string>)[readText(old, ['side'])] || 'Chưa có'}</Text>}
                  {!compatibleSide && <Text style={styles.meta}>Chọn cùng bên tập với lần trước để tính chênh lệch.</Text>}
                  {isSets && old.completed !== true ? <Text style={styles.meta}>Lần trước: hiệp chưa hoàn thành hoặc chưa có.</Text> : (RESULT_FIELDS[type] || []).map(([key, label]) => <View key={key} style={styles.metric}>
                    <Text style={styles.meta}>{label}</Text>
                    <Text numberOfLines={3} ellipsizeMode="tail" style={styles.value}>{comparisonValue(compatibleSide && (!isSets || now.completed === true) ? now[key] : undefined, old[key])}</Text>
                  </View>)}
                  {isSets && now.completed !== true && <Text style={styles.meta}>Đánh dấu hoàn thành hiệp mới để xem chênh lệch.</Text>}
                </View>;
              })}
            </>}
          </View>;
        })}
        {hasBody && <View style={styles.group}>
          <Text style={styles.label}>Số đo cơ thể</Text>
          {!previousBody ? <Notice text="Chưa có số đo trước đó. Số đo bạn lưu sẽ làm mốc cho lần sau." /> : <>
            <Text numberOfLines={2} ellipsizeMode="tail" style={styles.meta}>Lần đo gần nhất: {formatDate(readText(previousBody, ['measuredAt']))}</Text>
            {MEASUREMENTS.map(([key, label, unit]) => <View key={key} style={styles.metric}>
              <Text style={styles.meta}>{label}</Text>
              <Text numberOfLines={3} ellipsizeMode="tail" style={styles.value}>{comparisonValue(body[key], previousBody[key] ?? asRecord(previousBody.measurements)[key], unit)}</Text>
            </View>)}
          </>}
        </View>}
        <Text style={styles.meta}>Chênh lệch chỉ thể hiện thay đổi số liệu, không tự đánh giá tốt hay xấu.</Text>
      </>}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: spacing.lg, gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading, color: colors.text, flex: 1 },
  group: { backgroundColor: colors.surfaceMuted, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  set: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  metric: { gap: spacing.xs },
  label: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.body, color: colors.primaryDark },
});
