import { router } from 'expo-router';
import { SeedKnowledge } from './SeedKnowledge';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { canDeleteAccount, canEditAccount } from '@/services/adminAccess';
import { display, listPath, recordId, resources, type AdminRecord, type Field } from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { AdminForm } from './AdminForm';
import { Button, Label, Notice, Select, Sheet, ui } from './AdminUI';

export function AdminResource({ resourceKey }: { resourceKey: string }) {
  const resource = resources[resourceKey];
  const { session } = useAuth();
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number>();
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<AdminRecord | null>();
  const [selected, setSelected] = useState<AdminRecord>();
  const [transfer, setTransfer] = useState<AdminRecord>();
  const [deleting, setDeleting] = useState<AdminRecord>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const actionLock = useRef(false);
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError('');
    try {
      const path = listPath(resource, page, applied, status);
      const result = resource.unpaged ? { data: await api.get<AdminRecord[]>(path), meta: undefined } : await api.getPage<AdminRecord>(path);
      if (version.current !== request) return;
      setItems(result.data || []); setTotal(result.meta?.total ?? (resource.unpaged ? result.data.length : undefined)); setPages(Math.max(1, result.meta?.totalPages || 1));
      if (result.meta && page > Math.max(1, result.meta.totalPages)) setPage(Math.max(1, result.meta.totalPages));
    } catch (e) { if (version.current === request) setError(messageOf(e)); }
    finally { if (version.current === request) setLoading(false); }
  }, [resource, page, applied, status]);
  useEffect(() => { const requests = version; const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); requests.current++; }; }, [load]);
  const afterSave = () => { setSuccess('Đã lưu thay đổi.'); void load(); };
  const run = async (action: () => Promise<unknown>) => {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setActionError('');
    try { await action(); setDeleting(undefined); setSelected(undefined); afterSave(); }
    catch (e) { setActionError(messageOf(e)); }
    finally { actionLock.current = false; setBusy(false); }
  };
  const editable = (item: AdminRecord) => !resource.readonly && (!resource.account || canEditAccount(session!.user, item));
  const removable = (item: AdminRecord) => !resource.readonly && (!resource.account || canDeleteAccount(session!.user, item));
  const fields: Field[] = (resource.fields || []).map(field => resource.account && resourceKey !== 'pts' && field.key === 'phone' ? { ...field, required: false } : field);
  const statusLabel = (value: unknown) => resource.filters?.find(s => s.value === value)?.label || display(value);
  return <View style={ui.gap}>{resourceKey === 'knowledge' && <SeedKnowledge onDone={() => void load()} />}{(resourceKey === 'customers' || resourceKey === 'transfers') && <Button secondary label="Chuyển giao hàng loạt" onPress={() => router.push({ pathname:'/(app)/admin/[section]', params:{section:'batchTransfers'} })} />}
    <View style={ui.card}><Text style={ui.heading}>{resource.title}</Text>{total !== undefined && <Label muted>{total} bản ghi</Label>}{resource.search && <><TextInput style={ui.input} accessibilityLabel="Tìm kiếm" placeholder="Tìm theo tên, số điện thoại…" value={keyword} onChangeText={setKeyword} returnKeyType="search" onSubmitEditing={() => { setApplied(keyword); setPage(1); }} /><Button secondary label="Tìm kiếm" onPress={() => { setApplied(keyword); setPage(1); }} /></>}{resource.filters && <Select label="Trạng thái" value={status} options={[{value:'',label:'Tất cả'}, ...resource.filters]} onChange={v => { setStatus(v); setPage(1); }} />}{!resource.readonly && <Button label="Thêm mới" onPress={() => setForm(null)} />}<Button secondary label="Làm mới" disabled={loading} onPress={() => void load()} /></View>
    {success && <View style={ui.row}><CheckCircle size={20} color={colors.success} /><Label>{success}</Label></View>}
    {loading ? <View style={ui.card}><ActivityIndicator color={colors.primary} /><Label>Đang tải dữ liệu…</Label></View> : error ? <Notice message={error} retry={() => void load()} /> : items.length === 0 ? <Notice empty message="Chưa có bản ghi phù hợp. Hãy đổi bộ lọc hoặc thêm dữ liệu mới." retry={() => void load()} /> : items.map(item => <View key={recordId(item)} style={ui.card}><Text numberOfLines={2} ellipsizeMode="tail" style={ui.heading}>{display(item.fullName || item.name || item.title || item.orderCode || item.customerId || item.userId || item)}</Text>{resource.summary.map(([key, label]) => item[key] !== undefined && <Label key={key} muted>{label}: {key === 'status' ? statusLabel(item[key]) : key.endsWith('At') ? new Date(String(item[key])).toLocaleString('vi-VN') : display(item[key])}</Label>)}<Button secondary label="Xem chi tiết" onPress={() => { setActionError(''); setSelected(item); }} /></View>)}
    {!loading && !error && !resource.unpaged && <View style={ui.row}><Button secondary label="Trước" disabled={page <= 1} onPress={() => setPage(p => p - 1)} /><View style={ui.flex}><Label>Trang {page}/{pages}</Label></View><Button secondary label="Sau" disabled={page >= pages} onPress={() => setPage(p => p + 1)} /></View>}
    {form !== undefined && <AdminForm title={form ? 'Chỉnh sửa' : `Thêm ${resource.title.toLowerCase()}`} fields={fields} initial={form || {}} onClose={() => setForm(undefined)} onSave={async payload => { if (form) { if (!editable(form)) throw new Error('Bạn không có quyền chỉnh sửa tài khoản này.'); await api.patch(`${resource.path}/${recordId(form)}`, payload); } else await api.post(resource.path, { ...payload, ...resource.query }); afterSave(); }} />}
    {selected && <Sheet title={display(selected)} onClose={() => { if (!busy) setSelected(undefined); }}>{resource.summary.map(([key,label]) => <Label key={key}>{label}: {key === 'status' ? statusLabel(selected[key]) : display(selected[key])}</Label>)}{typeof selected.content === 'string' && <Text style={ui.text}>{selected.content}</Text>}{actionError && <Notice message={actionError} />}{editable(selected) && <Button label="Chỉnh sửa" disabled={busy} onPress={() => { setForm(selected); setSelected(undefined); }} />}{resourceKey === 'customers' && <Button secondary label="Chuyển PT phụ trách" onPress={() => { setTransfer(selected); setSelected(undefined); }} />}{resourceKey === 'knowledge' && <Button secondary busy={busy} label={selected.status === 'PUBLISHED' ? 'Thu hồi về bản nháp' : 'Xuất bản'} onPress={() => void run(() => api.patch(`${resource.path}/${recordId(selected)}/${selected.status === 'PUBLISHED' ? 'unpublish' : 'publish'}`, {}))} />}{removable(selected) && <Button danger disabled={busy} label="Xóa bản ghi" onPress={() => { setDeleting(selected); setSelected(undefined); setActionError(''); }} />}</Sheet>}
    {deleting && <Sheet title="Xác nhận xóa" onClose={() => { if (!busy) setDeleting(undefined); }}><Label>Bạn muốn xóa {display(deleting)}?</Label><Label muted>{resourceKey === 'customers' ? 'Hồ sơ và toàn bộ dữ liệu liên quan của khách hàng sẽ bị xóa. Không thể hoàn tác.' : 'Thao tác này không thể hoàn tác.'}</Label>{actionError && <Notice message={actionError} />}<Button danger busy={busy} label="Xóa vĩnh viễn" onPress={() => void run(() => { if (!removable(deleting)) throw new Error('Bạn không có quyền xóa tài khoản này.'); return api.delete(`${resource.path}/${recordId(deleting)}`); })} /><Button secondary disabled={busy} label="Hủy" onPress={() => setDeleting(undefined)} /></Sheet>}
    {transfer && <AdminForm title="Chuyển PT phụ trách" description={`Khách hàng: ${display(transfer)}. Thay đổi có hiệu lực ngay sau khi lưu.`} fields={[{key:'toPtId',label:'PT nhận',source:'/api/users?role=PT&status=ACTIVE',required:true},{key:'reason',label:'Lý do chuyển giao',required:true,multiline:true}]} onClose={() => setTransfer(undefined)} onSave={async payload => { const oldPt = typeof transfer.assignedPtId === 'object' && transfer.assignedPtId ? recordId(transfer.assignedPtId as AdminRecord) : transfer.assignedPtId; if (payload.toPtId === oldPt) throw new Error('Vui lòng chọn PT khác PT hiện tại.'); await api.post('/api/transfers/admin-force', { ...payload, customerId: recordId(transfer) }); afterSave(); }} />}
  </View>;
}
