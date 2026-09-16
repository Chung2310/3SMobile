import { useCallback, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button, Busy, Field, Notice, Picker, Sheet, ws } from '@/components/workouts/Controls';
import { ProgressForm } from '@/components/progress/ProgressForm';
import { MetricChart, SessionCalendar } from '@/components/progress/ProgressVisuals';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { API_BASE_URL } from '@/services/config';
import { asRecord, asRecords, formatDate, readNumber, readText } from '@/services/journey';
import { recordId } from '@/services/workouts';
import { ACHIEVEMENTS, ATTENDANCE, dayKey, journeyPath, MEASUREMENTS, RESULT_FIELDS, sessionTitle } from '@/services/progress';
import type { JsonRecord } from '@/types/domain';

const SECTIONS = { overview: 'Tổng quan', sessions: 'Lịch sử tập', measurements: 'Số đo cơ thể', achievements: 'Thành tích', photos: 'Ảnh tiến độ', reports: 'Báo cáo' };
const label = (value: unknown) => value === null || value === undefined ? 'Chưa có' : String(value);
function Copy({ children, title = false }: { children: React.ReactNode; title?: boolean }) { return <Text numberOfLines={title ? 3 : 12} ellipsizeMode="tail" style={title ? ws.cardTitle : ws.text}>{children}</Text>; }
function ProgressPhoto({ photo }: { photo: JsonRecord }) {
  const [failed, setFailed] = useState(false); const path = readText(photo, ['photoUrl']);
  let uri = ''; try { const url = new URL(path, API_BASE_URL); if (path && ['http:', 'https:'].includes(url.protocol)) uri = url.href; } catch { /* Invalid media URL has a visible fallback. */ }
  return <View style={ws.card}>{uri && !failed ? <Image source={{ uri }} accessibilityLabel="Ảnh tiến độ" style={{ width: '100%', height: 300, borderRadius: 16 }} resizeMode="contain" onError={() => setFailed(true)} /> : <Notice text="Không tải được ảnh tiến độ." />}<Copy>{formatDate(readText(photo, ['takenDate', 'takenAt', 'createdAt']))}</Copy><Copy>{({ FRONT: 'Mặt trước', SIDE: 'Mặt bên', BACK: 'Mặt sau', OTHER: 'Góc khác' } as Record<string, string>)[readText(photo, ['angle'])] || readText(photo, ['stage', 'notes'])}</Copy></View>;
}
export default function ProgressScreen() {
  const { session } = useAuth(); const role = session?.user.role; const staff = role === 'PT' || role === 'ADMIN';
  return <Screen title="Ghi nhận tiến độ" subtitle="Cập nhật chỉ số và theo dõi học viên" onBack={() => router.navigate('/(app)/(tabs)')}>{session && (staff || role === 'CUSTOMER') ? <ProgressWorkspace key={session.user.id} staff={staff} userId={session.user.id} /> : <Notice error text="Tài khoản không có quyền xem tiến độ." />}</Screen>;
}
function ProgressWorkspace({ staff, userId }: { staff: boolean; userId: string }) {
  const [customers, setCustomers] = useState<JsonRecord[]>([]); const [customerId, setCustomerId] = useState('');
  const [journey, setJourney] = useState<JsonRecord | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [section, setSection] = useState('overview'); const [range, setRange] = useState({ from: '', to: '' }); const [rangeDraft, setRangeDraft] = useState<typeof range | null>(null); const [rangeError, setRangeError] = useState('');
  const [selectedDay, setSelectedDay] = useState(''); const [metric, setMetric] = useState('weight');
  const [form, setForm] = useState<{ kind: 'session' | 'measurement' | 'report'; record?: JsonRecord } | null>(null);
  const [detail, setDetail] = useState<JsonRecord | null>(null);
  const [action, setAction] = useState<{ title: string; text: string; path: string; method: 'patch' | 'delete' } | null>(null); const [saving, setSaving] = useState(false); const [actionError, setActionError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current; setBusy(true); setError('');
    try {
      if (staff && !customerId) {
        const list = await api.get<JsonRecord[]>('/api/customers/progress-overview');
        if (request === generation.current) { setCustomers(asRecords(list)); setJourney(null); }
      } else {
        const data = await api.get<JsonRecord>(journeyPath(staff ? customerId : undefined, range.from, range.to));
        if (request === generation.current) setJourney(data);
      }
    } catch (e) { if (request === generation.current) { setError((e as Error).message); setJourney(null); } }
    finally { if (request === generation.current) setBusy(false); }
  }, [staff, customerId, range]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  function resetView() { generation.current++; setJourney(null); setError(''); setSuccess(''); setSelectedDay(''); setForm(null); setDetail(null); }
  function saved() { setForm(null); setSuccess('Đã lưu dữ liệu tiến độ.'); void load(); }
  async function performAction() {
    if (!action || saving) return; setSaving(true); setActionError('');
    try { await api[action.method](action.path); setAction(null); setSuccess('Đã cập nhật dữ liệu.'); await load(); }
    catch (e) { setActionError((e as Error).message); } finally { setSaving(false); }
  }
  const customer = asRecord(journey?.customer); const targetId = staff ? customerId : recordId(customer);
  const sessions = asRecords(journey?.sessions).sort((a, b) => readText(b, ['performedAt']).localeCompare(readText(a, ['performedAt'])));
  const measurements = asRecords(journey?.measurements).sort((a, b) => readText(b, ['measuredAt']).localeCompare(readText(a, ['measuredAt'])));
  const reports = asRecords(journey?.reports).filter((r) => staff || r.status === 'PUBLISHED');
  const analytics = asRecord(journey?.analytics); const attendance = asRecord(analytics.attendance); const candidatePlan = asRecord(asRecord(journey?.plans).active); const activePlan = staff || candidatePlan.status === 'PUBLISHED' ? candidatePlan : {};
  const canLog = staff && activePlan.lifecycleStatus === 'ACTIVE' && readText(activePlan, ['ptId']) === userId && asRecords(activePlan.sessions).length > 0;
  const inbodyIds = new Set(asRecords(journey?.inbodyRecords).map(recordId));
  const empty = <Notice text="Chưa có dữ liệu trong khoảng thời gian này." />;
  return <View style={{ gap: 16 }}>
    {staff && <Picker label="Khách hàng" value={customerId} options={{ '': 'Chọn khách hàng', ...Object.fromEntries(customers.map((entry) => { const c = asRecord(entry.customer); return [recordId(c), `${readText(c, ['fullName'], 'Khách hàng')} · ${readText(c, ['phone'])}`]; })) }} onChange={(id) => { resetView(); setCustomerId(id); }} />}
    <Button secondary icon="refresh-cw" label="Tải lại" busy={busy} onPress={() => void load()} />
    {error && <Notice error text={error} />}{success && <Notice tone="success" text={success} />}
    {busy ? <Busy /> : !journey ? !error && <Notice text={staff && !customers.length ? 'Chưa có khách hàng được phân công.' : 'Chọn khách hàng để xem và ghi nhận tiến độ.'} /> : <>
      <View style={[ws.card, ws.hero]}><Text style={ws.badge}>Hành trình tập luyện</Text><Copy title>{readText(customer, ['fullName'], 'Tiến độ của bạn')}</Copy><Copy>{range.from || 'Từ đầu'} — {range.to || 'Hiện tại'}</Copy><Button secondary icon="calendar" label="Khoảng thời gian" onPress={() => { setRangeError(''); setRangeDraft(range); }} /></View>
      <Picker label="Nội dung" value={section} options={SECTIONS} onChange={setSection} />
      {section === 'overview' && <><View style={ws.card}><Text style={ws.title}>TỔNG QUAN</Text>{[['Số buổi', analytics.totalSessions], ['Có mặt', attendance.present], ['Đi muộn', attendance.late], ['Vắng mặt', attendance.absent], ['Tỷ lệ tham gia (%)', attendance.rate], ['Số tuần liên tiếp', analytics.streakWeeks], ['RPE trung bình', analytics.averageRpe]].map(([name, value]) => <View key={String(name)} style={[ws.row, { justifyContent: 'space-between' }]}><Copy>{String(name)}</Copy><Copy title>{label(value)}</Copy></View>)}</View><View style={ws.card}><Text style={ws.badge}>Giáo án hiện tại</Text><Copy title>{readText(activePlan, ['title'], 'Chưa có giáo án đang áp dụng')}</Copy><Button label="Xem giáo án" secondary onPress={() => router.push('/(app)/(tabs)/workouts')} />{canLog && <Button icon="plus" label="Ghi nhận buổi tập" onPress={() => setForm({ kind: 'session' })} />}</View><MetricChart records={measurements} metric="weight" unit="kg" /></>}
      {section === 'sessions' && <>{canLog && <Button icon="plus" label="Ghi nhận buổi tập" onPress={() => setForm({ kind: 'session' })} />}{staff && !canLog && <Notice text="PT sở hữu giáo án đang áp dụng có thể ghi nhận buổi tập tại đây." />}<SessionCalendar sessions={sessions} selected={selectedDay} onSelect={setSelectedDay} />{!sessions.filter((s) => !selectedDay || dayKey(readText(s, ['performedAt'])) === selectedDay).length && empty}{sessions.filter((s) => !selectedDay || dayKey(readText(s, ['performedAt'])) === selectedDay).map((s) => <View key={recordId(s)} style={ws.card}><Copy title>{sessionTitle(s)}</Copy><Copy>{formatDate(readText(s, ['performedAt']), true)}</Copy><Text style={ws.badge}>{ATTENDANCE[readText(s, ['attendance']) as keyof typeof ATTENDANCE] || 'Chưa điểm danh'}</Text><Button secondary label="Xem kết quả" onPress={() => setDetail(s)} /></View>)}</>}
      {section === 'measurements' && <>{staff && <Button icon="plus" label="Nhập số đo" onPress={() => setForm({ kind: 'measurement' })} />}<Picker label="Chỉ số biểu đồ" value={metric} options={Object.fromEntries(MEASUREMENTS.map(([key, title]) => [key, title]))} onChange={setMetric} /><MetricChart records={measurements} metric={metric} unit={MEASUREMENTS.find(([key]) => key === metric)?.[2] || ''} />{!measurements.length && empty}{measurements.map((m) => <View key={recordId(m)} style={ws.card}><Copy title>{formatDate(readText(m, ['measuredAt']))}</Copy>{MEASUREMENTS.map(([key, title, unit]) => { const value = readNumber(m, [key]) ?? readNumber(asRecord(m.measurements), [key]); return value === null ? null : <Copy key={key}>{title}: {value} {unit}</Copy>; })}{inbodyIds.has(recordId(m)) ? <Text style={ws.badge}>Đồng bộ từ InBody</Text> : staff && <><Button secondary label="Sửa số đo" onPress={() => setForm({ kind: 'measurement', record: m })} /><Button secondary destructive label="Xóa số đo" onPress={() => { setActionError(''); setAction({ title: 'Xóa số đo', text: 'Xóa bản ghi số đo này? Không thể khôi phục sau khi xóa.', path: `/api/body-measurements/${recordId(m)}`, method: 'delete' }); }} /></>}</View>)}</>}
      {section === 'achievements' && <>{!asRecords(analytics.achievements).length && empty}{asRecords(analytics.achievements).map((a, i) => <View key={i} style={ws.card}><Text style={ws.badge}>{ACHIEVEMENTS[readText(a, ['kind'])] || 'Thành tích'}</Text><Copy title>{readText(a, ['exerciseName'])}</Copy><Copy title>{label(a.value)} {readText(a, ['unit'])}</Copy><Copy>{formatDate(readText(a, ['achievedAt']))}</Copy>{a.isNewInPeriod === true && <Text style={ws.badge}>Kỷ lục mới trong kỳ</Text>}</View>)}</>}
      {section === 'photos' && <>{!asRecords(journey.photos).length && empty}{asRecords(journey.photos).map((photo, i) => <ProgressPhoto key={recordId(photo) || i} photo={photo} />)}</>}
      {section === 'reports' && <>{staff && <Button icon="plus" label="Tạo báo cáo" onPress={() => setForm({ kind: 'report' })} />}{!reports.length && empty}{reports.map((report) => <View key={recordId(report)} style={ws.card}><Text style={ws.badge}>{report.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Bản nháp'}</Text><Copy title>{formatDate(readText(report, ['periodStart']))} — {formatDate(readText(report, ['periodEnd']))}</Copy><Copy>{readText(report, ['summary'])}</Copy><Button secondary label="Đọc đầy đủ" onPress={() => setDetail({ ...report, detailType: 'report' })} />{staff && <><Button secondary label="Sửa báo cáo" onPress={() => setForm({ kind: 'report', record: report })} /><Button label={report.status === 'PUBLISHED' ? 'Thu hồi xuất bản' : 'Xuất bản cho khách'} onPress={() => { setActionError(''); setAction({ title: report.status === 'PUBLISHED' ? 'Thu hồi báo cáo' : 'Xuất bản báo cáo', text: report.status === 'PUBLISHED' ? 'Khách sẽ không còn xem được báo cáo này.' : 'Khách sẽ xem được báo cáo này sau khi xuất bản.', method: 'patch', path: `/api/progress-reports/${recordId(report)}/${report.status === 'PUBLISHED' ? 'unpublish' : 'publish'}` }); }} />{report.status !== 'PUBLISHED' && <Button secondary destructive label="Xóa bản nháp" onPress={() => { setActionError(''); setAction({ title: 'Xóa báo cáo', text: 'Xóa vĩnh viễn bản nháp này?', method: 'delete', path: `/api/progress-reports/${recordId(report)}` }); }} />}</>}</View>)}</>}
    </>}
    {rangeDraft && <Sheet title="Khoảng thời gian" onClose={() => setRangeDraft(null)} footer={<><Button label="Áp dụng" onPress={() => { try { journeyPath(undefined, rangeDraft.from, rangeDraft.to); resetView(); setRange(rangeDraft); setRangeDraft(null); } catch (e) { setRangeError((e as Error).message); } }} /><Button secondary label="Xem toàn bộ" onPress={() => { resetView(); setRange({ from: '', to: '' }); setRangeDraft(null); }} /></>}><Notice text="Lọc lịch sử tập, số đo và thống kê theo ngày. Báo cáo hiển thị theo kỳ riêng của từng báo cáo." /><Field label="Từ ngày (YYYY-MM-DD), có thể để trống" value={rangeDraft.from} onChange={(from) => setRangeDraft({ ...rangeDraft, from })} /><Field label="Đến ngày (YYYY-MM-DD), có thể để trống" value={rangeDraft.to} onChange={(to) => setRangeDraft({ ...rangeDraft, to })} />{rangeError && <Notice error text={rangeError} />}</Sheet>}
    {form && <ProgressForm kind={form.kind} customerId={targetId} plan={activePlan} record={form.record} onClose={() => setForm(null)} onSaved={saved} />}
    {action && <Sheet title={action.title} locked={saving} onClose={() => setAction(null)} footer={<Button label="Xác nhận" busy={saving} destructive={action.method === 'delete'} onPress={() => void performAction()} />}><Notice tone="warning" text={action.text} />{actionError && <Notice error text={actionError} />}</Sheet>}
    {detail && <Sheet title={detail.detailType === 'report' ? 'Báo cáo tiến độ' : sessionTitle(detail)} onClose={() => setDetail(null)}>{detail.detailType === 'report' ? <>{readText(detail, ['summary']).split('\n').map((line, i) => <Text key={i} style={ws.text}>{line}</Text>)}</> : <><Copy>{formatDate(readText(detail, ['performedAt']), true)}</Copy><Copy>{ATTENDANCE[readText(detail, ['attendance']) as keyof typeof ATTENDANCE]}</Copy>{asRecords(detail.exerciseLogs).map((log, i) => { const result = Object.keys(asRecord(log.result)).length ? asRecord(log.result) : { sets: log.sets }; const rawType = readText(log, ['trackingType']); const type = rawType === 'LEGACY_STRENGTH' || (!rawType && Array.isArray(log.sets)) ? 'STRENGTH' : rawType; const rows = asRecords(result.sets).length ? asRecords(result.sets) : [result]; return <View key={i} style={ws.sub}><Copy title>{readText(log, ['name'], `Bài ${i + 1}`)}</Copy>{rows.map((row, j) => <View key={j} style={{ gap: 4 }}>{asRecords(result.sets).length > 0 && <Text style={ws.badge}>Hiệp {j + 1} · {row.completed ? 'Hoàn thành' : 'Chưa hoàn thành'}</Text>}{(RESULT_FIELDS[type] || []).map(([key, name]) => row[key] === undefined ? null : <Copy key={key}>{name}: {label(row[key])}</Copy>)}{row.side ? <Copy>Bên tập: {({ LEFT: 'Trái', RIGHT: 'Phải', BOTH: 'Hai bên' } as Record<string, string>)[String(row.side)]}</Copy> : null}</View>)}</View>; })}{['absenceReason', 'feeling', 'notes'].map((key) => readText(detail, [key]) ? <Copy key={key}>{readText(detail, [key])}</Copy> : null)}</>}</Sheet>}
  </View>;
}
