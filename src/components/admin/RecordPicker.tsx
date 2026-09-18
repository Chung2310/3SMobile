import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { CheckSquare, Square } from 'lucide-react-native';
import { api } from '@/services/api/client';
import { display, recordId, type AdminRecord } from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { Button, Label, Notice, Sheet, ui } from './AdminUI';

export function RecordPicker({ label, source, selected, onChange, multiple = true, disabled = false }: {
  label: string; source: string; selected: AdminRecord[]; onChange: (items: AdminRecord[]) => void; multiple?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdminRecord[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      const separator = source.includes('?') ? '&' : '?';
      void api.getPage<AdminRecord>(`${source}${separator}page=${page}&limit=20&keyword=${encodeURIComponent(query)}`)
        .then(result => { if (active) { setItems(result.data); setPages(Math.max(1, result.meta?.totalPages || 1)); } })
        .catch(cause => { if (active) setError(messageOf(cause)); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [open, source, query, page, reload]);
  const has = (item: AdminRecord) => draft.some(d => recordId(d) === recordId(item));
  const toggle = (item: AdminRecord) => setDraft(current => current.some(d => recordId(d) === recordId(item)) ? current.filter(d => recordId(d) !== recordId(item)) : multiple ? [...current, item] : [item]);
  const footer = <View style={ui.gap}><Button label={`Áp dụng (${draft.length})`} onPress={() => { onChange(draft); setOpen(false); }} /><Button secondary label="Bỏ chọn tất cả" onPress={() => setDraft([])} /></View>;
  return <View style={ui.gap}><Label>{label}</Label><Button secondary disabled={disabled} label={selected.length === 1 ? display(selected[0]) : selected.length ? `Đã chọn ${selected.length}` : 'Chọn…'} onPress={() => { setDraft(selected); setQuery(''); setPage(1); setLoading(true); setOpen(true); }} />{open && <Sheet title={label} onClose={() => setOpen(false)} footer={footer}>
    <TextInput accessibilityLabel="Tìm kiếm" style={ui.input} placeholder="Tìm theo tên hoặc số điện thoại…" value={query} onChangeText={text => { setLoading(true); setQuery(text); setPage(1); }} />
    {loading ? <ActivityIndicator color={colors.primary} /> : error ? <Notice message={error} retry={() => setReload(n => n + 1)} /> : <>
      {multiple && items.length > 0 && <Button secondary label={items.every(has) ? 'Bỏ chọn trang này' : 'Chọn tất cả trên trang này'} onPress={() => setDraft(current => items.every(has) ? current.filter(d => !items.some(i => recordId(i) === recordId(d))) : [...current, ...items.filter(i => !has(i))])} />}
      {items.length === 0 && <Notice empty message="Không tìm thấy kết quả. Hãy đổi từ khóa." retry={() => setReload(n => n + 1)} />}
      {items.map(item => <Pressable key={recordId(item)} accessibilityRole="checkbox" accessibilityState={{ checked: has(item) }} style={[ui.row, ui.option]} onPress={() => toggle(item)}>{has(item) ? <CheckSquare color={colors.primary} size={24} /> : <Square color={colors.textMuted} size={24} />}<View style={ui.flex}><Label>{display(item)}</Label>{item.phone ? <Label muted>{String(item.phone)}</Label> : null}{item.assignedPtId ? <Label muted>PT: {display(item.assignedPtId)}</Label> : null}</View></Pressable>)}
      <View style={ui.row}><Button secondary label="Trước" disabled={page <= 1} onPress={() => { setLoading(true); setPage(n => n - 1); }} /><Label>{page}/{pages}</Label><Button secondary label="Sau" disabled={page >= pages} onPress={() => { setLoading(true); setPage(n => n + 1); }} /></View>
    </>}
    {draft.length > 0 && <View style={ui.gap}><Label>Đang chọn ({draft.length})</Label>{draft.map(item => <Button key={recordId(item)} secondary label={`Bỏ chọn: ${display(item)}`} onPress={() => toggle(item)} />)}</View>}
  </Sheet>}</View>;
}
