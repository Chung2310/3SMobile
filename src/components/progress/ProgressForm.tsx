import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SessionAttachments } from './SessionAttachments';
import { ProgressNotice } from './ProgressNotice';
import { DatePickerModal } from '@/components/DatePickerModal';
import { TimePicker } from '@/components/workouts/TimePicker';
import { sessionDraftPath, sessionDraftBody, matchesDraftPlan, type SessionDraft } from '@/services/sessionDrafts';
import { clearSessionDraftCache, writeSessionDraftCache } from '@/services/sessionDraftCache';
import { messageOf } from '@/utils/error';
import { api, ApiError } from '@/services/api/client';
import { asRecord, asRecords, readText } from '@/services/journey';
import { exerciseMetrics, recordId } from '@/services/workouts';
import { dayKey, localTime, initialResult, sessionPayload, measurementPayload, reportPayload, MEASUREMENTS, RESULT_FIELDS, calculateNextSessionIndex } from '@/services/progress';
import type { JsonRecord } from '@/types/domain';
import { Button, Field, Notice, Picker, Sheet, ws } from '../workouts/Controls';

function formatDisplayDate(dateStr: string): { main: string; sub: string } {
  if (!dateStr) return { main: 'Chưa chọn ngày', sub: 'Chạm để chọn' };
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!isNaN(d.getTime())) {
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayName = days[d.getDay()];
      const now = new Date();
      const isToday =
        now.getFullYear() === d.getFullYear() &&
        now.getMonth() === d.getMonth() &&
        now.getDate() === d.getDate();
      return {
        main: `${parts[2]}/${parts[1]}/${parts[0]}`,
        sub: isToday ? `Hôm nay · ${dayName}` : dayName,
      };
    }
    return { main: `${parts[2]}/${parts[1]}/${parts[0]}`, sub: '' };
  }
  return { main: dateStr, sub: '' };
}

function DatePickerField({
  label,
  value,
  onSelect,
  title = 'Chọn ngày tập',
}: {
  label: string;
  value: string;
  onSelect: (iso: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const { main, sub } = formatDisplayDate(value);

  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={ws.muted}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.dateTriggerBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        <View style={styles.dateTriggerLeft}>
          <View style={styles.dateIconBox}>
            <Feather name="calendar" size={18} color="#0284C7" />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.dateDisplayText}>{main}</Text>
            {!!sub && <Text style={styles.dateSubText}>{sub}</Text>}
          </View>
        </View>

        <View style={styles.dateChangeBadge}>
          <Text style={styles.dateChangeBadgeText}>Chọn ngày</Text>
          <Feather name="chevron-down" size={15} color="#0284C7" />
        </View>
      </Pressable>

      <DatePickerModal
        visible={open}
        value={value}
        title={title}
        onSelect={(iso) => {
          onSelect(iso);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

export function ProgressForm({
  kind,
  customerId,
  ownerId,
  restoredFromCache = false,
  plan = {},
  record = {},
  pastSessions = [], sessionDraft,
  onClose,
  onSaved,
}: {
  kind: 'session' | 'measurement' | 'report';
  customerId: string;
  ownerId?: string;
  restoredFromCache?: boolean;
  plan?: JsonRecord;
  record?: JsonRecord;
  pastSessions?: JsonRecord[]; sessionDraft?: SessionDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sessionPlan, setSessionPlan] = useState<JsonRecord>(() => sessionDraft?.plan || plan);
  const sessions = asRecords(sessionPlan.sessions);
  const nextSessionIndex = calculateNextSessionIndex(plan, pastSessions);
  const [draft, setDraft] = useState<JsonRecord>(() =>
    kind === 'session'
      ? sessionDraft?.form || {
          date: dayKey(new Date()),
          time: localTime(),
          sessionIndex: String(nextSessionIndex),
          attendance: 'PRESENT',
          results: asRecords(sessions[nextSessionIndex]?.exercises).map(initialResult),
        }
      : kind === 'report'
      ? {
          from: dayKey(readText(record, ['periodStart']) || new Date()),
          to: dayKey(readText(record, ['periodEnd']) || new Date()),
          summary: readText(record, ['summary']),
        }
      : {
          ...record,
          ...asRecord(record.measurements),
          date: dayKey(readText(record, ['measuredAt']) || new Date()),
        }
  );
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [popupError, setPopupError] = useState('');
  const [confirm, setConfirm] = useState<JsonRecord | null>(null);
  const [retry, setRetry] = useState<JsonRecord | null>(sessionDraft?.pendingPayload || null);
  const [key] = useState(() => sessionDraft?.idempotencyKey || `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const submitting = useRef(false);
  const [revision, setRevision] = useState(sessionDraft?.revision || 0);
  const [savedState, setSavedState] = useState(() => JSON.stringify({ form: draft, plan: sessionPlan }));
  const draftMessage = restoredFromCache ? 'Đã khôi phục tiến độ tự lưu trên thiết bị.' : sessionDraft ? 'Đã mở bản nháp. Bạn có thể nhập tiếp rồi lưu chính thức.' : '';
  const [switchPlan, setSwitchPlan] = useState(false);
  const planChanged = kind === 'session' && !matchesDraftPlan(sessionPlan, plan);
  const dirty = JSON.stringify({ form: draft, plan: sessionPlan }) !== savedState;
  useEffect(() => {
    if (kind !== 'session' || !ownerId || !dirty) return;
    void writeSessionDraftCache(ownerId, customerId, {
      form: draft, plan: sessionPlan, idempotencyKey: key, revision, updatedAt: new Date().toISOString(),
    }).catch(cause => setError(`Không thể tự lưu tiến độ trên thiết bị: ${messageOf(cause)}`));
  }, [kind, ownerId, customerId, draft, sessionPlan, key, revision, dirty]);
  async function persistDraft(pending: JsonRecord | null = null) {
    const saved = await api.patch<SessionDraft>(sessionDraftPath(customerId), sessionDraftBody(draft, sessionPlan, key, revision, pending));
    if (ownerId) await clearSessionDraftCache(ownerId, customerId);
    setRevision(saved.revision); setSavedState(JSON.stringify({ form: draft, plan: sessionPlan }));
    return saved;
  }
  async function closeForm() {
    if (busy || uploading) return;
    if (kind === 'session' && ownerId && dirty) {
      try {
        await writeSessionDraftCache(ownerId, customerId, {
          form: draft, plan: sessionPlan, idempotencyKey: key, revision, updatedAt: new Date().toISOString(),
        });
      } catch (cause) {
        setError(`Không thể tự lưu tiến độ trên thiết bị: ${messageOf(cause)}`);
        return;
      }
    }
    onClose();
  }
  const set = (field: string, value: unknown) => setDraft((old) => ({ ...old, [field]: value }));
  const field = (name: string, label: string, numeric = false, multiline = false) => <Field key={name} label={label} value={String(draft[name] ?? '')} onChange={(value) => set(name, value)} numeric={numeric} multiline={multiline} />;
  async function submit(payload: JsonRecord) {
    let finalRequestStarted = false;
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      if (kind === 'session') {
        // Persist the retry key and exact payload before sending a request that consumes a session.
        // A reopened draft can safely retry even if the final response was lost.
        const stored = retry ? null : await persistDraft(payload);
        if (ownerId) await clearSessionDraftCache(ownerId, customerId);
        finalRequestStarted = true;
        await api.post('/api/workout-sessions', payload);
        // GET also retires drafts whose idempotency key already exists in workout history.
        try { await api.delete(sessionDraftPath(customerId, stored?.revision || revision)); } catch { /* Final save already succeeded. */ }
      }
      else {
        const path = kind === 'measurement' ? '/api/body-measurements' : '/api/progress-reports';
        if (recordId(record)) await api.patch(`${path}/${recordId(record)}`, payload);
        else await api.post(path, { ...payload, customerId });
      }
      onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không lưu được dữ liệu.';
      setError(message); setPopupError(message);
      if (kind === 'session' && finalRequestStarted && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500)) setRetry(payload);
      else { setConfirm(null); setRetry(null); }
    } finally { submitting.current = false; setBusy(false); }
  }
  function save() {
    try {
      setError('');
      if (kind === 'session' && planChanged) throw new Error('Giáo án đã thay đổi. Hãy áp dụng giáo án hiện tại trước khi lưu chính thức.');
      if (kind === 'session') setConfirm(sessionPayload(customerId, sessionPlan, draft, key));
      else void submit(kind === 'measurement' ? measurementPayload(draft) : reportPayload(draft));
    } catch (e) { setError((e as Error).message); setPopupError((e as Error).message); }
  }
  const results = asRecords(draft.results);
  function changeResult(index: number, value: JsonRecord) { set('results', results.map((result, i) => i === index ? value : result)); }
  const attendedPast = asRecords(pastSessions).filter(
    (s) => readText(s, ['attendance']).toUpperCase() !== 'ABSENT'
  );
  const completedSessionsCount = attendedPast.length;
  const currentTotalSessionNumber = completedSessionsCount + 1;
  const title = kind === 'session' ? `Ghi nhận buổi tập (Buổi thứ ${currentTotalSessionNumber})` : kind === 'measurement' ? 'Số đo cơ thể' : 'Báo cáo tiến độ';
  return <Sheet title={title} onClose={() => void closeForm()} locked={busy || uploading} footer={<>{error ? <Notice error text={error} /> : null}{confirm || retry ? <><Button label={retry ? 'Thử lưu lại cùng buổi tập' : 'Xác nhận lưu buổi tập'} busy={busy || uploading} onPress={() => void submit((retry || confirm)!)} />{!retry && <Button secondary label="Quay lại chỉnh sửa" disabled={busy} onPress={() => setConfirm(null)} />}</> : <><Button label={kind === 'session' ? 'Lưu chính thức' : 'Lưu'} busy={busy || uploading} disabled={planChanged} onPress={save} /></>}</>}>
    {kind === 'session' && <Notice tone="info" text="Tiến độ đang nhập được tự lưu trên thiết bị và sẽ hiện lại khi mở màn này. Chọn Lưu chính thức khi hoàn tất." />}
    {draftMessage && <Notice tone="success" text={draftMessage} />}
    {planChanged && !retry && <><Notice tone="warning" text="Giáo án đã thay đổi kể từ bản nháp. Kết quả cũ vẫn được giữ. Áp dụng giáo án hiện tại sẽ đặt lại kết quả bài tập; ghi chú, ảnh và số đo vẫn được giữ." /><Button secondary label="Áp dụng giáo án hiện tại" disabled={busy || !recordId(plan)} onPress={() => setSwitchPlan(true)} /></>}
    {confirm || retry ? (retry ? <Notice tone="warning" text="Chưa xác định máy chủ đã lưu hay chưa. Thử lại sẽ dùng cùng mã buổi tập để tránh ghi trùng. Không tạo buổi mới trước khi kiểm tra lịch sử." /> : null) : <View pointerEvents={busy || uploading ? 'none' : 'auto'} style={{ gap: 8 }}>
      {kind === 'session' && <>
        <Picker label="Buổi trong giáo án" value={String(draft.sessionIndex)} options={Object.fromEntries(sessions.map((s, i) => [String(i), `${i + 1}. ${readText(s, ['name'], 'Buổi tập')}`]))} onChange={(value) => setDraft((old) => ({ ...old, sessionIndex: value, results: asRecords(sessions[Number(value)]?.exercises).map(initialResult) }))} />
        <DatePickerField label="Ngày tập" value={String(draft.date || dayKey(new Date()))} onSelect={(iso) => set('date', iso)} title="Chọn ngày tập" />
        <TimePicker label="Giờ tập" value={String(draft.time || localTime())} onChange={(time) => set('time', time)} />
        {asRecords(sessions[Number(draft.sessionIndex)]?.exercises).map((exercise, index) => {
          const type = readText(exercise, ['trackingType']); const result = results[index] || {}; const sets = asRecords(result.sets); const isSets = type === 'STRENGTH' || type === 'BODYWEIGHT';
          const inputs = (source: JsonRecord, update: (value: JsonRecord) => void) => (RESULT_FIELDS[type] || []).map(([name, label]) => <Field key={name} label={label} numeric value={String(source[name] ?? '')} onChange={(value) => update({ ...source, [name]: value })} />);
          return <View key={index} style={ws.card}><Text numberOfLines={3} ellipsizeMode="tail" style={ws.cardTitle}>{index + 1}. {readText(exercise, ['name', 'exerciseName'], 'Bài tập')}</Text><Text numberOfLines={6} ellipsizeMode="tail" style={ws.muted}>Target: {exerciseMetrics(exercise).map(([name, value]) => `${name}: ${value}`).join(" · ") || "No target"}</Text><Text style={ws.badge}>Actual Result</Text>{isSets ? <>{sets.map((item, setIndex) => <View key={setIndex} style={ws.sub}><Text style={ws.badge}>Set {setIndex + 1}</Text>{inputs(item, (value) => changeResult(index, { sets: sets.map((s, i) => i === setIndex ? value : s) }))}<Button secondary icon={item.completed ? 'check-square' : 'square'} label={item.completed ? 'Completed' : 'Incomplete'} onPress={() => changeResult(index, { sets: sets.map((s, i) => i === setIndex ? { ...s, completed: !s.completed } : s) })} />{sets.length > 1 && <Button secondary destructive label="Delete Set" onPress={() => changeResult(index, { sets: sets.filter((_, i) => i !== setIndex) })} />}</View>)}<Button secondary label="Add Set" disabled={sets.length >= 100} onPress={() => changeResult(index, { sets: [...sets, { completed: false }] })} /></> : <>{inputs(result, (value) => changeResult(index, value))}{type === 'MOBILITY' && <Picker label="Side" value={String(result.side || '')} options={{ '': 'Select Side', LEFT: 'Left', RIGHT: 'Right', BOTH: 'Both' }} onChange={(side) => changeResult(index, { ...result, side })} />}</>}{!RESULT_FIELDS[type] && <Notice error text="Bài tập chưa có loại ghi nhận. Cập nhật giáo án trước khi lưu." />}</View>;
        })}
        {field('feeling', 'Feeling', false, true)}{field('notes', 'Notes', false, true)}
        <SessionAttachments value={draft} onChange={setDraft} onBusy={setUploading} />
      </>}
      {kind === 'measurement' && <><DatePickerField label="Ngày đo" value={String(draft.date || dayKey(new Date()))} onSelect={(iso) => set('date', iso)} title="Chọn ngày đo" />{MEASUREMENTS.map(([name, label, unit]) => field(name, `${label} (${unit})`, true))}</>}
      {kind === 'report' && <><DatePickerField label="Từ ngày" value={String(draft.from || dayKey(new Date()))} onSelect={(iso) => set('from', iso)} title="Chọn từ ngày" /><DatePickerField label="Đến ngày" value={String(draft.to || dayKey(new Date()))} onSelect={(iso) => set('to', iso)} title="Chọn đến ngày" />{field('summary', 'Nội dung báo cáo', false, true)}</>}
    </View>}
    {switchPlan && <Sheet title="Đổi giáo án cho bản nháp?" onClose={() => setSwitchPlan(false)}><Notice tone="warning" text="Kết quả từng bài và hiệp trong bản nháp sẽ được đặt lại theo giáo án hiện tại." /><Button label="Áp dụng và đặt lại kết quả" onPress={() => { setSessionPlan(plan); setDraft(old => ({...old,sessionIndex:String(nextSessionIndex),results:asRecords(asRecords(plan.sessions)[nextSessionIndex]?.exercises).map(initialResult)})); setSwitchPlan(false); }} /><Button secondary label="Giữ bản nháp hiện tại" onPress={() => setSwitchPlan(false)} /></Sheet>}
    <ProgressNotice message={popupError} error onClose={() => setPopupError('')} />
  </Sheet>;
}

const styles = StyleSheet.create({
  dateTriggerBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dateDisplayText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#0F172A',
  },
  dateSubText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
  },
  dateChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dateChangeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#0284C7',
  },
});
