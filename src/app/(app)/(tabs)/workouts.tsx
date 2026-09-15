import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { asRecord, asRecords, readText } from '@/services/journey';
import { customerPlans, recordId, workoutDays } from '@/services/workouts';
import type { CustomerJourney, JsonRecord } from '@/types/domain';
import { Button, Busy, Empty, Field, Notice, Picker, Segments, Sheet, ws } from '@/components/workouts/Controls';
import { PlanDetails } from '@/components/workouts/PlanDetails';
import { PlanEditor } from '@/components/workouts/PlanEditor';

// The shared API client unwraps data; collect pages without relying on discarded meta.
async function listAll(path: string): Promise<JsonRecord[]> {
  const rows: JsonRecord[] = [];
  for (let page = 1; ; page++) {
    const data = asRecords(await api.get(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`));
    rows.push(...data);
    if (data.length < 100) return rows;
  }
}
function useResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError('');
    try { const value = await loader(); if (request === generation.current) setData(value); }
    catch (cause) { if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Không tải được giáo án.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [loader]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { generation.current++; }; }, [refresh]));
  return { data, loading, error, refresh };
}
export default function WorkoutsScreen() {
  const { session } = useAuth();
  if (!session) return null;
  if (session.user.role === 'CUSTOMER') return <CustomerWorkouts key={session.user.id} />;
  if (session.user.role === 'PT' || session.user.role === 'ADMIN') return <StaffWorkouts key={session.user.id} isPt={session.user.role === 'PT'} />;
  return <Screen title="GIÁO ÁN"><Notice text="Tài khoản này không có quyền truy cập giáo án." /></Screen>;
}
function CustomerWorkouts() {
  const router = useRouter();
  const loader = useCallback(() => api.get<CustomerJourney>('/api/me/journey'), []);
  const { data, loading, error, refresh } = useResource(loader);
  const [selected, setSelected] = useState('');
  const plans = customerPlans(data?.plans);
  const plan = plans.find((item) => recordId(item) === selected) || plans[0];
  return <Screen onBack={() => router.navigate('/(app)/(tabs)')} title="GIÁO ÁN" subtitle="Kế hoạch tập luyện được PT công bố cho bạn." refreshing={loading} onRefresh={refresh}>
    {!!error && <><Notice error text={error} /><Button secondary label="Thử lại" onPress={() => void refresh()} /></>}
    {loading && !data ? <Busy /> : plan ? <>
      <Picker label="Chọn giáo án" value={recordId(plan)} options={Object.fromEntries(plans.map((item) => [recordId(item), `${readText(item, ['title'])}${item.lifecycleStatus === 'ARCHIVED' ? ' · Lịch sử' : ''}`]))} onChange={setSelected} />
      <PlanDetails key={recordId(plan)} plan={plan} />
    </> : !error && <Empty title="Chưa có giáo án" text="Giáo án sẽ xuất hiện sau khi PT công bố cho bạn." action="Tải lại" onAction={() => void refresh()} />}
  </Screen>;
}
function StaffWorkouts({ isPt }: { isPt: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState(isPt ? 'templates' : 'customers');
  const loader = useCallback(async () => {
    const [templates, customers] = await Promise.all([isPt ? listAll('/api/workout-templates') : Promise.resolve([]), listAll('/api/customers')]);
    return { templates, customers };
  }, [isPt]);
  const { data, loading, error, refresh } = useResource(loader);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [detail, setDetail] = useState<JsonRecord>();
  const [editing, setEditing] = useState<JsonRecord | null | undefined>();
  const [customer, setCustomer] = useState<JsonRecord>();
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirm, setConfirm] = useState<{ title: string; text: string; run: () => Promise<void> }>();
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const templates = data?.templates || [];
  const query = search.trim().toLocaleLowerCase('vi');
  const items = (mode === 'templates' ? templates : data?.customers || []).filter((item) => (mode !== 'templates' || !status || item.status === status) && `${readText(item, ['title', 'fullName'])} ${readText(item, ['goal', 'phone'])}`.toLocaleLowerCase('vi').includes(query));
  async function confirmed() {
    if (!confirm || actionLock.current) return;
    actionLock.current = true; setBusy(true); setActionError('');
    try { await confirm.run(); setConfirm(undefined); setDetail(undefined); setMessage('Đã cập nhật giáo án.'); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không thực hiện được thao tác.'); }
    finally { actionLock.current = false; setBusy(false); }
  }
  return <Screen onBack={() => router.navigate('/(app)/(tabs)')} title="GIÁO ÁN" subtitle="Quản lý giáo án và kế hoạch tập của khách hàng." refreshing={loading} onRefresh={refresh}>
    <View style={{ marginBottom: 16 }}><Button secondary icon="book-open" label="Thư viện bài tập" onPress={() => router.push('/(app)/exercises')} /></View>
    <Segments value={mode} options={isPt ? { templates: 'Giáo án của tôi', customers: 'Khách hàng' } : { customers: 'Khách hàng' }} onChange={(value) => { setMode(value); setSearch(''); }} />
    {!!message && <Notice tone="success" text={message} />}
    {!!error && <><Notice error text={error} /><Button secondary label="Thử lại" onPress={() => void refresh()} /></>}
    <Field label={mode === 'templates' ? 'Tìm theo tên hoặc mục tiêu' : 'Tìm khách theo tên hoặc số điện thoại'} value={search} onChange={setSearch} />
    {mode === 'templates' && <View style={{ gap: 12, marginVertical: 16 }}><Picker label="Trạng thái" value={status} options={{ ACTIVE: 'Đang dùng', ARCHIVED: 'Lưu trữ', '': 'Tất cả' }} onChange={setStatus} /><Button icon="plus" label="Tạo giáo án" onPress={() => setEditing(null)} /></View>}
    {loading && !data ? <Busy /> : <><Text style={[ws.muted, { marginVertical: 12 }]}>{items.length} {mode === 'templates' ? 'giáo án' : 'khách hàng'}</Text>{items.map((item) => <View key={recordId(item)} style={[ws.card, mode === 'templates' && ws.hero]}>
      <View style={[ws.row, { flexWrap: 'nowrap' }]}><Image source={require('../../../../assets/public/3s-coach.png')} accessible={false} style={ws.thumbnail} resizeMode="contain" /><Text numberOfLines={3} ellipsizeMode="tail" style={[ws.cardTitle, { flex: 1, textTransform: mode === 'templates' ? 'uppercase' : 'none' }]}>{readText(item, ['title', 'fullName'])}</Text></View>
      <Text numberOfLines={3} ellipsizeMode="tail" style={ws.muted}>{readText(item, ['goal', 'phone'], mode === 'templates' ? `${workoutDays(item).length} buổi tập` : 'Chưa có số điện thoại')}</Text>
      {mode === 'templates' && <Text style={ws.badge}>{item.status === 'ARCHIVED' ? 'ĐÃ LƯU TRỮ' : 'ĐANG DÙNG'}</Text>}
      <View style={[ws.row, { flexWrap: 'nowrap', justifyContent: 'space-between' }]}><Text numberOfLines={2} ellipsizeMode="tail" style={[ws.muted, { flex: 1 }]}>{mode === 'templates' ? `${workoutDays(item).length} buổi tập${item.durationDays ? ` · ${item.durationDays} ngày` : ''}` : 'Giáo án và lịch sử'}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Xem giáo án ${readText(item, ['title', 'fullName'])}`} onPress={() => mode === 'templates' ? setDetail(item) : setCustomer(item)} style={({ pressed }) => [ws.roundAction, { opacity: pressed ? 0.8 : 1 }]}><Feather name="arrow-right" size={20} color="#fff" /></Pressable></View>
    </View>)}{!items.length && !error && <Empty title="Chưa có kết quả" text="Thử đổi từ khóa hoặc bộ lọc để tìm giáo án và khách hàng." action="Đặt lại tìm kiếm" onAction={() => { setSearch(''); setStatus(''); }} />}</>}
    {detail && editing === undefined && !confirm && <Sheet title="Chi tiết giáo án" onClose={() => setDetail(undefined)}><PlanDetails plan={detail} /><Button label="Sửa giáo án" icon="edit-2" onPress={() => setEditing(detail)} />
      <Button secondary destructive={detail.status === 'ARCHIVED'} label={detail.status === 'ARCHIVED' ? 'Xóa giáo án' : 'Lưu trữ giáo án'} onPress={() => { setActionError(''); setConfirm({ title: detail.status === 'ARCHIVED' ? 'Xóa giáo án?' : 'Lưu trữ giáo án?', text: detail.status === 'ARCHIVED' ? 'Giáo án mẫu sẽ bị xóa vĩnh viễn. Giáo án đã gán cho khách được giữ lại.' : 'Giáo án sẽ được chuyển vào danh sách lưu trữ.', run: async () => { if (detail.status === 'ARCHIVED') await api.delete(`/api/workout-templates/${recordId(detail)}`); else await api.patch(`/api/workout-templates/${recordId(detail)}/archive`); } }); }} />
    </Sheet>}
    {editing !== undefined && <PlanEditor initial={editing || undefined} onClose={() => setEditing(undefined)} onSave={async (payload) => { if (editing) await api.patch(`/api/workout-templates/${recordId(editing)}`, payload); else await api.post('/api/workout-templates', payload); setEditing(undefined); setDetail(undefined); setMessage('Đã lưu giáo án.'); await refresh(); }} />}
    {confirm && <Sheet title={confirm.title} locked={busy} onClose={() => setConfirm(undefined)}><Notice text={confirm.text} />{!!actionError && <Notice error text={actionError} />}<Button label="Xác nhận" busy={busy} onPress={() => void confirmed()} /><Button secondary label="Hủy" disabled={busy} onPress={() => setConfirm(undefined)} /></Sheet>}
    {customer && <CustomerPlanManager key={recordId(customer)} customer={customer} templates={templates.filter((item) => item.status === 'ACTIVE')} canAssign={isPt} onClose={() => setCustomer(undefined)} />}
  </Screen>;
}
function CustomerPlanManager({ customer, templates, canAssign, onClose }: { customer: JsonRecord; templates: JsonRecord[]; canAssign: boolean; onClose: () => void }) {
  const customerId = recordId(customer);
  const [state, setState] = useState<JsonRecord>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<'assign' | 'publish' | 'unpublish'>();
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current; setLoading(true); setError('');
    try { const value = await api.get<JsonRecord>(`/api/customers/${customerId}/workout-plans`); if (request === generation.current) setState(value); }
    catch (cause) { if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Không tải được giáo án.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [customerId]);
  useEffect(() => { const requests = generation; const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); requests.current++; }; }, [load]);
  const active = asRecord(state?.active);
  const plans = [...(recordId(active) ? [active] : []), ...asRecords(state?.history)];
  const plan = plans.find((item) => recordId(item) === selected) || plans[0];
  const editable = plan && recordId(plan) === recordId(active);
  async function execute() {
    if (!confirm || actionLock.current) return;
    actionLock.current = true; setBusy(true); setError('');
    try {
      if (confirm === 'assign') {
        const assigned = await api.post<JsonRecord>(`/api/customers/${customerId}/workout-plans/assign`, { templateId });
        setSelected(recordId(assigned)); setAssigning(false); setMessage('Đã gán giáo án ở trạng thái nháp. Hãy kiểm tra và công bố cho khách.');
      } else { await api.patch(`/api/workout-plans/${recordId(plan)}/${confirm}`); setMessage(confirm === 'publish' ? 'Đã công bố giáo án cho khách.' : 'Đã thu hồi công bố giáo án.'); }
      setConfirm(undefined); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không cập nhật được giáo án.'); }
    finally { actionLock.current = false; setBusy(false); }
  }
  if (editing && plan) return <PlanEditor initial={plan} onClose={() => setEditing(false)} onSave={async (payload) => { await api.patch(`/api/customers/${customerId}/workout-plans/${recordId(plan)}`, payload); setEditing(false); setMessage('Đã lưu giáo án của khách.'); await load(); }} />;
  return <Sheet title={`Giáo án · ${readText(customer, ['fullName'])}`} locked={busy} onClose={onClose}>
    {!!message && <Notice tone="success" text={message} />}{!!error && <><Notice error text={error} /><Button secondary label="Thử tải lại" disabled={busy} onPress={() => void load()} /></>}
    {confirm ? <><Notice text={confirm === 'assign' ? `Gán giáo án “${readText(templates.find((item) => recordId(item) === templateId), ['title'])}”? Giáo án hiện hành sẽ được lưu vào lịch sử; giáo án mới là bản nháp.` : confirm === 'publish' ? 'Công bố giáo án này để khách hàng xem trên tài khoản của họ?' : 'Thu hồi công bố giáo án này khỏi tài khoản khách hàng?'} /><Button label="Xác nhận" busy={busy} onPress={() => void execute()} /><Button secondary label="Hủy" disabled={busy} onPress={() => setConfirm(undefined)} /></> : assigning ? <>
      <Field label="Tìm giáo án mẫu" value={search} onChange={setSearch} />
      {templates.filter((item) => readText(item, ['title']).toLowerCase().includes(search.toLowerCase())).map((item) => <Button key={recordId(item)} secondary={templateId !== recordId(item)} icon={templateId === recordId(item) ? 'check' : 'book-open'} label={readText(item, ['title'])} onPress={() => setTemplateId(recordId(item))} />)}
      {!templates.length && <Notice text="Chưa có giáo án mẫu đang dùng. Hãy tạo giáo án trước." />}
      <Button label="Gán giáo án đã chọn" disabled={!templateId} onPress={() => setConfirm('assign')} /><Button secondary label="Quay lại" onPress={() => setAssigning(false)} />
    </> : loading ? <Busy /> : <>
      {plan ? <><Picker label="Giáo án và lịch sử" value={recordId(plan)} options={Object.fromEntries(plans.map((item) => [recordId(item), `${readText(item, ['title'])}${recordId(item) === recordId(active) ? ' · Hiện hành' : ' · Lịch sử'}`]))} onChange={setSelected} /><PlanDetails key={recordId(plan)} plan={plan} />
        {editable && <><Button label="Sửa giáo án của khách" icon="edit-2" onPress={() => setEditing(true)} /><Button secondary label={plan.status === 'PUBLISHED' ? 'Thu hồi công bố' : 'Công bố cho khách'} onPress={() => setConfirm(plan.status === 'PUBLISHED' ? 'unpublish' : 'publish')} /></>}
      </> : !error && <Notice text="Khách hàng chưa được gán giáo án." />}
      {canAssign && !error && <Button label={recordId(active) ? 'Thay giáo án' : 'Gán giáo án'} disabled={!state} onPress={() => { setTemplateId(''); setAssigning(true); }} />}
    </>}
  </Sheet>;
}
