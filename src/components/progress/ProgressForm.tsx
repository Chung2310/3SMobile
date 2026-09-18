import { useRef, useState } from 'react';
import { SessionAttachments } from './SessionAttachments';
import { ProgressNotice } from './ProgressNotice';
import { Text, View } from 'react-native';
import { api, ApiError } from '@/services/api/client';
import { asRecord, asRecords, readText } from '@/services/journey';
import { exerciseMetrics, recordId } from '@/services/workouts';
import { ATTENDANCE, dayKey, localTime, initialResult, sessionPayload, measurementPayload, reportPayload, MEASUREMENTS, RESULT_FIELDS } from '@/services/progress';
import type { JsonRecord } from '@/types/domain';
import { Button, Field, Notice, Picker, Sheet, ws } from '../workouts/Controls';

export function ProgressForm({ kind, customerId, plan = {}, record = {}, onClose, onSaved }: { kind: 'session' | 'measurement' | 'report'; customerId: string; plan?: JsonRecord; record?: JsonRecord; onClose: () => void; onSaved: () => void }) {
  const sessions = asRecords(plan.sessions);
  const [draft, setDraft] = useState<JsonRecord>(() => kind === 'session' ? { date: dayKey(new Date()), time: localTime(), sessionIndex: '0', attendance: 'PRESENT', results: asRecords(sessions[0]?.exercises).map(initialResult) } : kind === 'report' ? { from: dayKey(readText(record, ['periodStart']) || new Date()), to: dayKey(readText(record, ['periodEnd']) || new Date()), summary: readText(record, ['summary']) } : { ...record, ...asRecord(record.measurements), date: dayKey(readText(record, ['measuredAt']) || new Date()) });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [popupError, setPopupError] = useState('');
  const [confirm, setConfirm] = useState<JsonRecord | null>(null);
  const [retry, setRetry] = useState<JsonRecord | null>(null);
  const [key] = useState(() => `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const submitting = useRef(false);
  const set = (field: string, value: unknown) => setDraft((old) => ({ ...old, [field]: value }));
  const field = (name: string, label: string, numeric = false, multiline = false) => <Field key={name} label={label} value={String(draft[name] ?? '')} onChange={(value) => set(name, value)} numeric={numeric} multiline={multiline} />;
  async function submit(payload: JsonRecord) {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      if (kind === 'session') await api.post('/api/workout-sessions', payload);
      else {
        const path = kind === 'measurement' ? '/api/body-measurements' : '/api/progress-reports';
        if (recordId(record)) await api.patch(`${path}/${recordId(record)}`, payload);
        else await api.post(path, { ...payload, customerId });
      }
      onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không lưu được dữ liệu.';
      setError(message); setPopupError(message);
      if (kind === 'session' && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500)) setRetry(payload);
      else { setConfirm(null); setRetry(null); }
    } finally { submitting.current = false; setBusy(false); }
  }
  function save() {
    try {
      setError('');
      if (kind === 'session') setConfirm(sessionPayload(customerId, plan, draft, key));
      else void submit(kind === 'measurement' ? measurementPayload(draft) : reportPayload(draft));
    } catch (e) { setError((e as Error).message); setPopupError((e as Error).message); }
  }
  const results = asRecords(draft.results);
  function changeResult(index: number, value: JsonRecord) { set('results', results.map((result, i) => i === index ? value : result)); }
  const title = kind === 'session' ? 'Ghi nhận buổi tập' : kind === 'measurement' ? 'Số đo cơ thể' : 'Báo cáo tiến độ';
  return <Sheet title={title} onClose={onClose} locked={busy || uploading} footer={<>{error ? <Notice error text={error} /> : null}{confirm || retry ? <><Button label={retry ? 'Thử lưu lại cùng buổi tập' : 'Xác nhận lưu buổi tập'} busy={busy || uploading} onPress={() => void submit((retry || confirm)!)} />{!retry && <Button secondary label="Quay lại chỉnh sửa" disabled={busy} onPress={() => setConfirm(null)} />}</> : <Button label="Lưu" busy={busy || uploading} onPress={save} />}</>}>
    {confirm || retry ? <Notice tone="warning" text={retry ? 'Chưa xác định máy chủ đã lưu hay chưa. Thử lại sẽ dùng cùng mã buổi tập để tránh ghi trùng. Không tạo buổi mới trước khi kiểm tra lịch sử.' : draft.attendance === 'ABSENT' ? 'Xác nhận ghi nhận khách vắng mặt trong buổi tập này.' : 'Buổi có mặt hoặc đi muộn sẽ được tính vào số buổi đã sử dụng trong gói tập của khách.'} /> : <View pointerEvents={busy || uploading ? 'none' : 'auto'} style={{ gap: 8 }}>
      {kind === 'session' && <>
        <Picker label="Buổi trong giáo án" value={String(draft.sessionIndex)} options={Object.fromEntries(sessions.map((s, i) => [String(i), `${i + 1}. ${readText(s, ['name'], 'Buổi tập')}`]))} onChange={(value) => setDraft((old) => ({ ...old, sessionIndex: value, results: asRecords(sessions[Number(value)]?.exercises).map(initialResult) }))} />
        {field('date', 'Ngày tập (YYYY-MM-DD)')}{field('time', 'Giờ tập (HH:mm)')}
        <Picker label="Điểm danh" value={String(draft.attendance)} options={ATTENDANCE} onChange={(value) => set('attendance', value)} />
        {draft.attendance === 'ABSENT' ? field('absenceReason', 'Lý do vắng', false, true) : asRecords(sessions[Number(draft.sessionIndex)]?.exercises).map((exercise, index) => {
          const type = readText(exercise, ['trackingType']); const result = results[index] || {}; const sets = asRecords(result.sets); const isSets = type === 'STRENGTH' || type === 'BODYWEIGHT';
          const inputs = (source: JsonRecord, update: (value: JsonRecord) => void) => (RESULT_FIELDS[type] || []).map(([name, label]) => <Field key={name} label={label} numeric value={String(source[name] ?? '')} onChange={(value) => update({ ...source, [name]: value })} />);
          return <View key={index} style={ws.card}><Text numberOfLines={3} ellipsizeMode="tail" style={ws.cardTitle}>{index + 1}. {readText(exercise, ['name', 'exerciseName'], 'Bài tập')}</Text><Text numberOfLines={6} ellipsizeMode="tail" style={ws.muted}>Mục tiêu: {exerciseMetrics(exercise).map(([name, value]) => `${name}: ${value}`).join(" · ") || "Chưa có thông số"}</Text><Text style={ws.badge}>Kết quả thực tế</Text>{isSets ? <>{sets.map((item, setIndex) => <View key={setIndex} style={ws.sub}><Text style={ws.badge}>Hiệp {setIndex + 1}</Text>{inputs(item, (value) => changeResult(index, { sets: sets.map((s, i) => i === setIndex ? value : s) }))}<Button secondary icon={item.completed ? 'check-square' : 'square'} label={item.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'} onPress={() => changeResult(index, { sets: sets.map((s, i) => i === setIndex ? { ...s, completed: !s.completed } : s) })} />{sets.length > 1 && <Button secondary destructive label="Xóa hiệp" onPress={() => changeResult(index, { sets: sets.filter((_, i) => i !== setIndex) })} />}</View>)}<Button secondary label="Thêm hiệp" disabled={sets.length >= 100} onPress={() => changeResult(index, { sets: [...sets, { completed: false }] })} /></> : <>{inputs(result, (value) => changeResult(index, value))}{type === 'MOBILITY' && <Picker label="Bên tập" value={String(result.side || '')} options={{ '': 'Chưa chọn', LEFT: 'Trái', RIGHT: 'Phải', BOTH: 'Hai bên' }} onChange={(side) => changeResult(index, { ...result, side })} />}</>}{!RESULT_FIELDS[type] && <Notice error text="Bài tập chưa có loại ghi nhận. Cập nhật giáo án trước khi lưu." />}</View>;
        })}
        {field('feeling', 'Cảm nhận', false, true)}{field('notes', 'Ghi chú', false, true)}
        {draft.attendance !== 'ABSENT' && <SessionAttachments value={draft} onChange={setDraft} onBusy={setUploading} />}
      </>}
      {kind === 'measurement' && <>{recordId(record) && <Notice text="Để trống một chỉ số sẽ giữ giá trị cũ. Để bỏ số đo sai, xóa bản ghi và nhập lại." />}{field('date', 'Ngày đo (YYYY-MM-DD)')}{MEASUREMENTS.map(([name, label, unit]) => field(name, `${label} (${unit})`, true))}</>}
      {kind === 'report' && <>{record.status === 'PUBLISHED' && <Notice tone="warning" text="Chỉnh sửa sẽ chuyển báo cáo về bản nháp. Cần xuất bản lại để khách xem." />}{field('from', 'Từ ngày (YYYY-MM-DD)')}{field('to', 'Đến ngày (YYYY-MM-DD)')}{field('summary', 'Nội dung báo cáo', false, true)}</>}
    </View>}
    <ProgressNotice message={popupError} error onClose={() => setPopupError('')} />
  </Sheet>;
}
