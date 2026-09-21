import { ContextIcon, LibraryIconContext } from '@/components/LibraryIcon';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button, Field, Notice, Picker, Sheet, ws } from '@/components/workouts/Controls';
import { PlanEditor } from '@/components/workouts/PlanEditor';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/services/api/client';
import { asRecords, readText } from '@/services/journey';
import { LEVELS, prepareDraft, recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';

type Slot = { dayNumber: number; startMinute: number; endMinute: number };
type Proposal = { durationWeeks: number; sessionsPerWeek: number; minutesPerSession: number; level: string; trainingMethod: string; trainingSplit: string; priorityMuscleGroups: string[]; restrictions: string[] };
type Job = { id: string; status: string; result?: JsonRecord; error?: { message?: string } };
const DAYS = { '1': 'Thứ 2', '2': 'Thứ 3', '3': 'Thứ 4', '4': 'Thứ 5', '5': 'Thứ 6', '6': 'Thứ 7', '7': 'Chủ nhật' };
const time = (minute: number) => String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0');
const TIMES = Object.fromEntries(Array.from({ length: 97 }, (_, i) => [String(i * 15), time(i * 15)]));
const messageOf = (cause: unknown) => cause instanceof Error ? cause.message : 'Không thực hiện được yêu cầu. Vui lòng thử lại.';

export default function AiWorkoutScreen() {
  return <LibraryIconContext.Provider value={true}><AiWorkoutScreenContent /></LibraryIconContext.Provider>;
}

function AiWorkoutScreenContent() {
  const { session } = useAuth();
  if (session?.user.role !== 'PT') return <Screen title="Giáo án AI"><Notice text="Tài khoản này không có quyền tạo giáo án." /></Screen>;
  return <Wizard key={session.user.id} />;
}

function Wizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [apiFailure, setApiFailure] = useState<{ title: string; message: string }>();
  const dismissNotice = () => { setMissingInfo([]); setApiFailure(undefined); };
  function showApiFailure(cause: unknown) {
    const detail = messageOf(cause);
    const timeout = (cause instanceof ApiError && cause.status === 504) || /504|gateway.?timeout/i.test(detail);
    const prescription = /prescription|thông số bài tập/i.test(detail);
    setError(detail);

    let friendlyTitle = 'Không thể tạo giáo án AI';
    let friendlyMessage = detail;

    if (timeout) {
      friendlyTitle = 'Máy chủ phản hồi quá lâu (504)';
      friendlyMessage = 'Yêu cầu đã quá thời gian chờ. Tác vụ AI có thể vẫn đang xử lý trong nền. Bạn vui lòng đóng thông báo rồi bấm "Thử lại" để kiểm tra hoặc tiếp tục yêu cầu. Thông tin bạn đã nhập vẫn được giữ nguyên.';
    } else if (prescription) {
      friendlyTitle = 'Chưa thể hoàn tất thông số bài tập';
      friendlyMessage = 'Hệ thống AI chưa thiết lập được mức tạ hoặc thông số bài tập phù hợp. Bạn hãy đóng thông báo này rồi bấm "Thử lại" để AI gợi ý lại phương án nhé.';
    }

    setApiFailure({
      title: friendlyTitle,
      message: friendlyMessage,
    });
  }
  const [customers, setCustomers] = useState<JsonRecord[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [proposal, setProposal] = useState<Proposal>();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<JsonRecord>();
  const mounted = useRef(true);
  const lock = useRef(false);
  const generationKey = useRef('');
  const jobId = useRef('');
  const savedId = useRef('');
  const savedGenerated = useRef(false);
  const close = () => router.canGoBack() ? router.back() : router.replace('/(app)/plans');

  async function loadCustomers() {
    setLoadingCustomers(true); setCustomerError('');
    try {
      const rows: JsonRecord[] = [];
      for (let page = 1; ; page++) {
        const result = await api.getPage<JsonRecord>('/api/customers?page=' + page + '&limit=100');
        rows.push(...asRecords(result.data));
        if (!mounted.current) return;
        if (!result.data.length || (result.meta ? page >= result.meta.totalPages : result.data.length < 100)) break;
      }
      setCustomers(rows);
    } catch (cause) { if (mounted.current) setCustomerError(messageOf(cause)); }
    finally { if (mounted.current) setLoadingCustomers(false); }
  }
  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => void loadCustomers(), 0);
    return () => { clearTimeout(timer); mounted.current = false; };
  }, []);

  function addSlot(day: number, start: string, end: string, previous?: Slot) {
    const next = { dayNumber: Number(day), startMinute: Number(start), endMinute: Number(end) };
    if (next.endMinute <= next.startMinute) { setError('Giờ kết thúc phải sau giờ bắt đầu.'); return; }
    if (slots.some((slot) => slot !== previous && slot.dayNumber === next.dayNumber && next.startMinute < slot.endMinute && next.endMinute > slot.startMinute)) { setError('Khung giờ rảnh bị trùng. Vui lòng chọn giờ khác.'); return; }
    setSlots([...slots.filter((slot) => slot !== previous), next].sort((a, b) => a.dayNumber - b.dayNumber || a.startMinute - b.startMinute)); setError('');
  }

  async function analyze() {
    if (lock.current) return;
    const missing: string[] = [];
    if (!customerId) missing.push('Chưa chọn học viên.');
    if (!selectedDays.length) missing.push('Chưa chọn ngày rảnh trong tuần.');
    const daysWithoutSlots = selectedDays.filter((day) => !slots.some((slot) => slot.dayNumber === day));
    if (daysWithoutSlots.length) missing.push('Chưa thêm khung giờ cho: ' + daysWithoutSlots.map((day) => DAYS[String(day) as keyof typeof DAYS]).join(', ') + '. Chọn giờ và bấm “Thêm giờ rảnh” cho từng ngày.');
    if (missing.length) { setMissingInfo(missing); return; }
    lock.current = true; setBusy(true); setError('');
    generationKey.current = ''; jobId.current = '';
    try {
      const result = await api.post<Proposal>('/api/ai/workout-proposals', { customerId, availabilitySlots: slots });
      if (!mounted.current) return;
      const longest = new Map<number, number>();
      slots.forEach((slot) => longest.set(slot.dayNumber, Math.max(longest.get(slot.dayNumber) || 0, slot.endMinute - slot.startMinute)));
      setProposal({ ...result, sessionsPerWeek: longest.size, minutesPerSession: Math.min(240, ...longest.values()) }); setStep(1);
    } catch (cause) { if (mounted.current) showApiFailure(cause); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }

  async function generate() {
    if (!proposal || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    generationKey.current ||= 'workout-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    try {
      let job = jobId.current
        ? await api.get<Job>('/api/ai/workout-generations/' + jobId.current)
        : await api.post<Job>('/api/ai/workout-generations', { customerId, proposal, availabilitySlots: slots, additionalRequest: '' }, { headers: { 'Idempotency-Key': generationKey.current } });
      jobId.current = job.id;
      for (let attempt = 0; attempt < 300; attempt++) {
        if (!mounted.current) return;
        if (job.status === 'SUCCEEDED') {
          if (!job.result || !asRecords(job.result.scheduledExercises).length) throw new Error('AI chưa trả về lịch bài tập hợp lệ.');
          setDraft(prepareDraft({ ...job.result, title: readText(job.result, ['title']) || 'Giáo án AI', durationDays: Number(job.result.durationWeeks || proposal.durationWeeks) * 7, level: job.result.level || proposal.level }));
          return;
        }
        if (job.status === 'FAILED') {
          generationKey.current = ''; jobId.current = '';
          throw new Error(job.error?.message || 'Không thể tạo giáo án AI.');
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (!mounted.current) return;
        job = await api.get<Job>('/api/ai/workout-generations/' + job.id);
      }
      throw new Error('AI vẫn đang xử lý. Bấm kiểm tra lại để tiếp tục chờ tác vụ hiện tại.');
    } catch (cause) { if (mounted.current) showApiFailure(cause); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }

  function next() {
    setError('');
    if (step === 0) { void analyze(); return; }
    if (step === 2 && proposal) {
      if (!Number.isInteger(proposal.durationWeeks) || proposal.durationWeeks < 1 || proposal.durationWeeks > 12) { setError('Số tuần phải từ 1 đến 12.'); return; }
      if (!Number.isInteger(proposal.sessionsPerWeek) || proposal.sessionsPerWeek < 1 || proposal.sessionsPerWeek > 7) { setError('Số buổi mỗi tuần phải từ 1 đến 7.'); return; }
      if (!Number.isInteger(proposal.minutesPerSession) || proposal.minutesPerSession < 15 || proposal.minutesPerSession > 240 || proposal.minutesPerSession % 15) { setError('Thời lượng từ 15 đến 240 phút, theo bước 15 phút.'); return; }
    }
    if (step < 3) setStep(step + 1); else void generate();
  }

  if (draft) return <PlanEditor seed={draft} onClose={close} onSave={async (payload) => {
    const value = { ...payload };
    if (savedGenerated.current) delete value.generatedExercises;
    if (savedId.current) await api.patch('/api/workout-templates/' + savedId.current, value);
    else {
      const result = await api.post<JsonRecord>('/api/workout-templates', value);
      savedId.current = recordId(result);
      if (!savedId.current) throw new Error('Máy chủ chưa trả mã giáo án. Hãy kiểm tra danh sách trước khi lưu lại.');
      savedGenerated.current = true;
    }
  }} />;

  return <Screen title="Tạo giáo án AI" onBack={close}>
    <Sheet title="Tạo giáo án bằng AI" locked={busy} onClose={close} footer={<View style={{ gap: 12 }}>
      <Button icon="zap" label={step === 0 ? 'Phân tích bằng AI' : step < 3 ? 'Tiếp tục' : error ? 'Thử lại / Kiểm tra tác vụ' : 'Tạo giáo án'} busy={busy} disabled={step === 0 && (loadingCustomers || !customers.length)} onPress={next} />
      {step > 0 && <Button secondary label="Quay lại" disabled={busy} onPress={() => { generationKey.current = ''; jobId.current = ''; setError(''); setStep(step - 1); }} />}
    </View>}>
      <Text style={ws.badge}>Bước {step + 1}/4 · {['Học viên & giờ rảnh', 'Duyệt phân tích', 'Cấu hình', 'Tạo bản nháp'][step]}</Text>
      {step === 0 && <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 12 }}>
        {loadingCustomers ? <Notice text="Đang tải học viên..." /> : customerError ? <><Notice error text={customerError} /><Button secondary label="Tải lại học viên" onPress={() => void loadCustomers()} /></> : !customers.length ? <Notice text="Chưa có học viên được phân công để AI phân tích." /> : <Picker label="Học viên" value={customerId} options={Object.fromEntries(customers.map((item) => [recordId(item), readText(item, ['fullName']) + (readText(item, ['phone']) ? ' · ' + readText(item, ['phone']) : '')]))} onChange={setCustomerId} />}
        <Notice text="Chọn lịch rảnh lặp lại mỗi tuần. AI dùng hồ sơ học viên để đề xuất giáo án; không tự gán giáo án cho học viên." />
        <Text style={ws.cardTitle}>Các ngày rảnh trong tuần</Text>
        <Text style={ws.muted}>Tích ngày để ghi nhận ngay giờ rảnh 08:00–09:00. Đổi giờ bên dưới sẽ cập nhật trực tiếp; có thể thêm khung giờ khác.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(DAYS).map(([key, label]) => {
            const day = Number(key), selected = selectedDays.includes(day);
            return <View key={key} style={{ minWidth: '30%', flexGrow: 1 }}><Button secondary={!selected} icon={selected ? 'check-square' : 'square'} label={label + (selected ? ' · Đã chọn' : '')} disabled={busy} onPress={() => {
              setSelectedDays(selected ? selectedDays.filter((value) => value !== day) : [...selectedDays, day].sort((a, b) => a - b));
              setSlots(selected ? slots.filter((slot) => slot.dayNumber !== day) : [...slots, { dayNumber: day, startMinute: 480, endMinute: 540 }]);
              setError('');
            }} /></View>;
          })}
        </View>
        {!selectedDays.length && <Notice text="Chưa chọn ngày rảnh. Chọn ít nhất một ngày từ Thứ 2 đến Chủ nhật." />}
        {selectedDays.map((day) => <DayAvailability key={day} day={day} slots={slots.filter((slot) => slot.dayNumber === day)} onAdd={(start, end) => addSlot(day, start, end)} onChange={(slot, start, end) => addSlot(day, start, end, slot)} onRemove={(slot) => { setSlots(slots.filter((item) => item !== slot)); setError(''); }} />)}
        {!!slots.length && <Text style={ws.muted}>{new Set(slots.map((slot) => slot.dayNumber)).size} ngày đã có giờ rảnh · {slots.length} khung giờ mỗi tuần</Text>}
      </View>}
      {proposal && step !== 0 && <>
        <Text numberOfLines={12} ellipsizeMode="tail" style={ws.text}>{proposal.trainingMethod}</Text>
        <Text numberOfLines={12} ellipsizeMode="tail" style={ws.text}>{proposal.trainingSplit}</Text>
        {step === 2 ? <>
          <Field numeric label="Số tuần (1–12)" value={String(proposal.durationWeeks)} onChange={(v) => setProposal({ ...proposal, durationWeeks: Number(v) })} />
          <Field numeric label="Số buổi mỗi tuần (1–7)" value={String(proposal.sessionsPerWeek)} onChange={(v) => setProposal({ ...proposal, sessionsPerWeek: Number(v) })} />
          <Field numeric label="Số phút mỗi buổi (15–240)" value={String(proposal.minutesPerSession)} onChange={(v) => setProposal({ ...proposal, minutesPerSession: Number(v) })} />
        </> : <Notice text={proposal.durationWeeks + ' tuần · ' + proposal.sessionsPerWeek + ' buổi/tuần · ' + proposal.minutesPerSession + ' phút/buổi · ' + (LEVELS[proposal.level as keyof typeof LEVELS] || proposal.level)} />}
        {step === 3 && <Notice text="AI sẽ tạo bản nháp và mở Studio để bạn kiểm tra, chỉnh sửa trước khi lưu." />}
      </>}
      {busy && <Notice text={step === 0 ? 'AI đang phân tích hồ sơ và giờ rảnh...' : 'AI đang tạo giáo án ở chế độ nền. Vui lòng chờ...'} />}
      {!!error && <Notice error text={error} />}
      <Modal visible={missingInfo.length > 0 || !!apiFailure} transparent animationType="fade" onRequestClose={dismissNotice}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24, paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }}>
          <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 24, padding: 24, gap: 16 }}>
            <ContextIcon name={apiFailure ? "x-circle" : "alert-triangle"} size={32} color={apiFailure ? colors.danger : colors.warning} />
            <Text accessibilityRole="header" style={ws.title}>{apiFailure?.title || "Thiếu thông tin"}</Text>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12 }}>
              <Text accessibilityRole="alert" style={ws.text}>{apiFailure?.message || "Vui lòng bổ sung thông tin trước khi phân tích bằng AI:"}</Text>
              {missingInfo.map((message) => <Text key={message} accessibilityRole="alert" style={ws.text}>{message}</Text>)}
            </ScrollView>
            <Button label="Đã hiểu" onPress={dismissNotice} />
          </View>
        </View>
      </Modal>
    </Sheet>
  </Screen>;
}

function DayAvailability({ day, slots, onAdd, onChange, onRemove }: { day: number; slots: Slot[]; onAdd: (start: string, end: string) => void; onChange: (slot: Slot, start: string, end: string) => void; onRemove: (slot: Slot) => void }) {
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState('480');
  const [end, setEnd] = useState('540');
  const label = DAYS[String(day) as keyof typeof DAYS];
  return <View style={[ws.card, { gap: 12, marginBottom: 0 }]}>
    <Text style={ws.cardTitle}>{label}</Text>
    {!slots.length && <Text style={ws.muted}>Chưa có khung giờ. Chọn giờ và bấm ghi nhận bên dưới.</Text>}
    {slots.map((slot) => <View key={slot.startMinute} style={ws.sub}>
      <Text style={ws.muted}>Đã ghi nhận · {time(slot.startMinute)}–{time(slot.endMinute)}</Text>
      <Picker label="Từ" value={String(slot.startMinute)} options={Object.fromEntries(Object.entries(TIMES).filter(([key]) => Number(key) < 1440))} onChange={(value) => onChange(slot, value, String(Math.max(slot.endMinute, Number(value) + 15)))} />
      <Picker label="Đến" value={String(slot.endMinute)} options={Object.fromEntries(Object.entries(TIMES).filter(([key]) => Number(key) > slot.startMinute))} onChange={(value) => onChange(slot, String(slot.startMinute), value)} />
      <Button secondary destructive icon="trash-2" label={'Bỏ khung giờ ' + time(slot.startMinute) + ' · ' + label} onPress={() => onRemove(slot)} />
    </View>)}
    {(adding || !slots.length) && <>
      <Picker label="Từ" value={start} options={Object.fromEntries(Object.entries(TIMES).filter(([key]) => Number(key) < 1440))} onChange={(value) => { setStart(value); if (Number(end) <= Number(value)) setEnd(String(Number(value) + 15)); }} />
      <Picker label="Đến" value={end} options={Object.fromEntries(Object.entries(TIMES).filter(([key]) => Number(key) > Number(start)))} onChange={setEnd} />
      <Button secondary icon="plus" label={'Ghi nhận khung giờ mới · ' + label} onPress={() => onAdd(start, end)} />
    </>}
    {!!slots.length && <Button secondary icon={adding ? 'x' : 'plus'} label={adding ? 'Đóng phần thêm khung giờ' : 'Thêm khung giờ khác'} onPress={() => setAdding(!adding)} />}
  </View>;
}
