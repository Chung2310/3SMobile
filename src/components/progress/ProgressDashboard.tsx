import { useState } from 'react';
import { Text, View } from 'react-native';
import { asRecord, readNumber, readText, formatDate } from '@/services/journey';
import { recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { Button, Field, Notice, ws } from '../workouts/Controls';
export function ProgressDashboard({ items, onSelect }: { items: JsonRecord[]; onSelect: (id: string, log: boolean) => void }) {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const filtered = items.filter((item) => { const c = asRecord(item.customer); return (readText(c, ['fullName']) + ' ' + readText(c, ['phone'])).toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')); });
  const pages = Math.max(1, Math.ceil(filtered.length / 12)), current = Math.min(page, pages);
  const rates = items.map((item) => readNumber(asRecord(asRecord(item.analytics).attendance), ['rate'])).filter((n): n is number => n !== null);
  return <View style={{ gap: 16 }}><View style={ws.card}><Text style={ws.title}>TIẾN ĐỘ HỌC VIÊN</Text><Text style={ws.text}>{items.length} học viên · {items.reduce((sum, item) => sum + (readNumber(item, ['sessionCount']) || 0), 0)} buổi đã ghi nhận</Text><Text style={ws.muted}>Tham gia trung bình: {rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1) + '%' : 'Chưa có dữ liệu'}</Text></View><Field label="Tìm học viên" placeholder="Tên hoặc số điện thoại" value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
    {!filtered.length && <Notice text="Không có học viên phù hợp." />}
    {filtered.slice((current - 1) * 12, current * 12).map((item) => { const c = asRecord(item.customer), latest = asRecord(item.latestMeasurement); return <View key={recordId(c)} style={ws.card}><Text numberOfLines={2} ellipsizeMode="tail" style={ws.cardTitle}>{readText(c, ['fullName'])}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={ws.muted}>{readText(c, ['phone'])}</Text><Text style={ws.text}>{readNumber(item, ['sessionCount']) ?? '—'} buổi · Gần nhất: {item.lastSessionAt ? formatDate(String(item.lastSessionAt)) : 'Chưa có'}</Text>{readNumber(latest, ['weight']) !== null && <Text style={ws.text}>Cân nặng gần nhất: {String(latest.weight)} kg</Text>}<Button secondary icon="trending-up" label="Xem tiến độ" onPress={() => onSelect(recordId(c), false)} /><Button icon="plus" label="Ghi nhận buổi tập" onPress={() => onSelect(recordId(c), true)} /></View>; })}
    {pages > 1 && <View style={{ gap: 8 }}><Text style={ws.muted}>Trang {current}/{pages}</Text><Button secondary label="Trang trước" disabled={current === 1} onPress={() => setPage(current - 1)} /><Button secondary label="Trang sau" disabled={current === pages} onPress={() => setPage(current + 1)} /></View>}
  </View>;
}
