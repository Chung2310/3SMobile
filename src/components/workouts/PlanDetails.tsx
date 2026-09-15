import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { asRecords, readText, readNumber, formatDate } from '@/services/journey';
import { exerciseMetrics, LEVELS, workoutDays } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { colors } from '@/theme';
import { Notice, Sheet, ws } from './Controls';

const COACH = require('../../../assets/public/3s-coach.png');
const RUNNER = require('../../../assets/public/3s-run.png');
export function PlanDetails({ plan }: { plan: JsonRecord }) {
  const days = workoutDays(plan);
  const [dayKey, setDayKey] = useState<string>();
  const day = days.find((item) => item.key === dayKey);
  const level = readText(plan, ['level']);
  const archived = plan.lifecycleStatus === 'ARCHIVED' || plan.status === 'ARCHIVED';
  const status = archived ? 'ĐÃ LƯU TRỮ' : plan.status === 'DRAFT' ? 'BẢN NHÁP' : plan.status === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ' : 'GIÁO ÁN MẪU';
  const duration = readNumber(plan, ['durationDays']);
  const exercisesCount = days.reduce((sum, item) => sum + item.exercises.length, 0);
  return <View style={{ gap: 16 }}>
    <View style={[ws.card, ws.hero, { marginBottom: 0 }]}>
      <View style={[ws.row, { flexWrap: 'nowrap', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: 12 }}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primary }}><Text style={[ws.badge, { color: '#fff' }]}>{duration ? `${duration} NGÀY` : 'CÁ NHÂN HÓA'}</Text></View>
          <Text numberOfLines={4} ellipsizeMode="tail" style={ws.display}>{readText(plan, ['title'], 'Giáo án')}</Text>
        </View>
        <Image source={COACH} accessibilityIgnoresInvertColors accessible={false} style={{ width: 88, height: 120, borderRadius: 16 }} resizeMode="contain" />
      </View>
      {!!readText(plan, ['goal', 'description']) && <Text numberOfLines={5} ellipsizeMode="tail" style={ws.text}>{readText(plan, ['goal', 'description'])}</Text>}
      <View style={ws.sub}>
        <Text numberOfLines={2} ellipsizeMode="tail" style={ws.badge}>{LEVELS[level as keyof typeof LEVELS] || level || 'Cá nhân hóa'}</Text>
        <View style={[ws.row, { alignItems: 'flex-start' }]}>{[[days.length, 'Buổi tập'], [exercisesCount, 'Bài tập']].map(([value, label]) => <View key={label} style={{ flex: 1, gap: 4 }}><Text style={ws.display}>{value}</Text><Text style={ws.muted}>{label}</Text></View>)}</View>
        <View style={[ws.row, { flexWrap: 'nowrap' }]}><Feather name={archived ? 'archive' : plan.status === 'PUBLISHED' ? 'check-circle' : 'file-text'} size={16} color={plan.status === 'PUBLISHED' && !archived ? colors.success : colors.textMuted} /><Text style={[ws.badge, { color: colors.textMuted }]}>{status}</Text></View>
      </View>
      {!!readText(plan, ['assignedAt', 'startDate']) && <Text numberOfLines={2} ellipsizeMode="tail" style={ws.muted}>Bắt đầu: {formatDate(readText(plan, ['assignedAt', 'startDate']))}</Text>}
      {!!readText(plan, ['version']) && <Text numberOfLines={1} ellipsizeMode="tail" style={ws.muted}>Phiên bản {readText(plan, ['version'])}</Text>}
      {Array.isArray(plan.muscleGroups) && plan.muscleGroups.length > 0 && <Text numberOfLines={3} ellipsizeMode="tail" style={ws.muted}>Nhóm cơ: {plan.muscleGroups.join(', ')}</Text>}
      {!!readText(plan, ['technicalNotes']) && <Notice text={`Dặn dò của PT: ${readText(plan, ['technicalNotes'])}`} />}
    </View>
    <Text style={ws.title}>Các buổi tập</Text>
    {days.map((item) => {
      const minutes = item.exercises.map((exercise) => readNumber(exercise, ['durationMinutes']));
      const totalMinutes = minutes.every((value) => value !== null) ? minutes.reduce<number>((sum, value) => sum + (value || 0), 0) : null;
      return <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Xem ${item.name}, ${item.exercises.length} bài tập`} onPress={() => setDayKey(item.key)} style={({ pressed }) => [ws.card, ws.row, { flexWrap: 'nowrap', padding: 16, marginBottom: 0, opacity: pressed ? 0.8 : 1 }]}>
        <Image source={RUNNER} accessible={false} style={ws.thumbnail} resizeMode="cover" />
        <View style={{ flex: 1, gap: 8 }}><Text numberOfLines={2} ellipsizeMode="tail" style={ws.cardTitle}>{item.name}</Text><Text numberOfLines={2} ellipsizeMode="tail" style={ws.muted}>{totalMinutes ? `${totalMinutes} phút · ` : ''}{item.exercises.length} bài tập</Text></View>
        <View style={ws.roundAction}><Feather name="arrow-right" size={20} color="#fff" /></View>
      </Pressable>;
    })}
    {!days.length && <Notice text="Giáo án chưa có buổi tập được xếp lịch." />}
    {day && <Sheet title={day.name} onClose={() => setDayKey(undefined)}><Text style={ws.muted}>{day.exercises.length} bài tập · Thực hiện theo thông số PT hướng dẫn.</Text>{day.exercises.map((exercise, index) => <Exercise key={index} exercise={exercise} index={index} />)}{!day.exercises.length && <Notice text="Buổi tập chưa có bài tập." />}</Sheet>}
    {asRecords(plan.unscheduledExercises).length > 0 && <><Text style={ws.title}>Bài tập chưa xếp lịch</Text>{asRecords(plan.unscheduledExercises).map((exercise, index) => <Exercise key={index} exercise={exercise} index={index} />)}</>}
  </View>;
}
function Exercise({ exercise, index }: { exercise: JsonRecord; index: number }) {
  const minute = readNumber(exercise, ['startMinute']);
  const metrics = exerciseMetrics(exercise);
  return <View style={ws.card}>
    <View style={[ws.row, { flexWrap: 'nowrap' }]}><View style={[ws.roundAction, { backgroundColor: colors.surfaceMuted }]}><Text style={ws.badge}>{String(index + 1).padStart(2, '0')}</Text></View><Text numberOfLines={3} ellipsizeMode="tail" style={[ws.cardTitle, { flex: 1 }]}>{readText(exercise, ['name'], 'Bài tập')}</Text></View>
    {minute !== null && <Text numberOfLines={2} ellipsizeMode="tail" style={ws.muted}>{String(Math.floor(minute / 60)).padStart(2, '0')}:{String(minute % 60).padStart(2, '0')}{exercise.durationMinutes ? ` · ${exercise.durationMinutes} phút` : ''}</Text>}
    <View style={ws.sub}>{metrics.map(([label, value]) => <View key={label} style={[ws.row, { flexWrap: 'nowrap', alignItems: 'flex-start' }]}><Text style={[ws.muted, { flex: 1 }]}>{label}</Text><Text numberOfLines={3} ellipsizeMode="tail" style={[ws.text, { flex: 1, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }]}>{value}</Text></View>)}{!metrics.length && <Text style={ws.muted}>Chưa có thông số bài tập.</Text>}</View>
    {!!readText(exercise, ['notes']) && <Text numberOfLines={10} ellipsizeMode="tail" style={ws.text}>{readText(exercise, ['notes'])}</Text>}
  </View>;
}
