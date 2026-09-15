import { useState } from 'react';
import { Text, View, Pressable, ScrollView } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { colors } from '@/theme';
import { dayKey, metricSeries } from '@/services/progress';
import { readText, formatDate } from '@/services/journey';
import type { JsonRecord } from '@/types/domain';
import { Button, Notice, ws } from '../workouts/Controls';

export function MetricChart({ records, metric, unit }: { records: JsonRecord[]; metric: string; unit: string }) {
  const points = metricSeries(records, metric);
  if (!points.length) return <Notice text="Chưa có số đo cho chỉ số này." />;
  const values = points.map((p) => p.value); const min = Math.min(...values); const max = Math.max(...values);
  const first = Date.parse(points[0].date); const last = Date.parse(points[points.length - 1].date);
  const plot = points.map((p) => ({ x: 20 + (Date.parse(p.date) - first) / (last - first || 1) * 280, y: 140 - (p.value - min) / (max - min || 1) * 110 }));
  return <View style={ws.sub}><Text style={ws.badge}>Mới nhất</Text><Text numberOfLines={1} ellipsizeMode="tail" style={ws.display}>{values[values.length - 1]} {unit}</Text><Text numberOfLines={2} ellipsizeMode="tail" style={ws.muted}>Thấp nhất {min} · Cao nhất {max} {unit}</Text><View accessible accessibilityLabel={`Biểu đồ gồm ${points.length} số đo, từ ${values[0]} đến ${values[values.length - 1]} ${unit}`}><Svg width="100%" height={170} viewBox="0 0 320 170"><Line x1={20} y1={150} x2={300} y2={150} stroke={colors.border} /><Polyline points={plot.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.primary} strokeWidth={3} />{plot.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.primary} />)}</Svg></View><Text numberOfLines={2} ellipsizeMode="tail" style={ws.muted}>{formatDate(points[0].date)} — {formatDate(points[points.length - 1].date)}</Text>{points.length === 1 && <Text style={ws.muted}>Cần thêm một lần đo để thấy xu hướng.</Text>}</View>;
}
export function SessionCalendar({ sessions, selected, onSelect }: { sessions: JsonRecord[]; selected: string; onSelect: (value: string) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const offset = (month.getDay() + 6) % 7; const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = new Set(sessions.map((s) => dayKey(readText(s, ['performedAt']))));
  return <View style={ws.card}><View style={[ws.row, { justifyContent: 'space-between' }]}><Button secondary label="Trước" icon="chevron-left" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} /><Text style={ws.cardTitle}>{month.getMonth() + 1}/{month.getFullYear()}</Text><Button secondary label="Sau" icon="chevron-right" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ minWidth: 308, flex: 1, gap: 12 }}><View style={{ flexDirection: 'row' }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => <Text key={d} style={[ws.muted, { flex: 1, textAlign: 'center' }]}>{d}</Text>)}</View><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: offset + total }, (_, i) => {
    const number = i - offset + 1; const key = dayKey(new Date(month.getFullYear(), month.getMonth(), number));
    return number < 1 ? <View key={i} style={{ width: '14.2857%', height: 48 }} /> : <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${key}${days.has(key) ? ', có ghi nhận buổi tập' : ''}`} accessibilityState={{ selected: selected === key }} onPress={() => onSelect(selected === key ? '' : key)} style={({ pressed }) => ({ width: '14.2857%', minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: selected === key ? colors.primary : pressed ? colors.surfaceMuted : colors.surface })}><Text style={[ws.text, { color: selected === key ? '#fff' : colors.text }]}>{number}</Text>{days.has(key) && <View style={{ height: 4, width: 4, borderRadius: 2, backgroundColor: selected === key ? '#fff' : colors.primary }} />}</Pressable>;
  })}</View></View></ScrollView><Text style={ws.muted}>Dấu chấm: có ghi nhận buổi tập trong khoảng đang xem.</Text>{selected && <Button secondary label="Xem tất cả ngày" onPress={() => onSelect('')} />}</View>;
}
