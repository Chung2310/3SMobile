import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { api } from '@/services/api/client';
import { display, formPayload, recordId, type AdminRecord, type Field } from '@/services/adminResources';
import { messageOf } from '@/utils/error';
import { colors } from '@/theme';
import { Button, Label, Notice, Select, Sheet, ui } from './AdminUI';

function RemoteSelect({ field, value, onChange }: { field: Field; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;

    const timer = setTimeout(() => {
      setLoading(true);
      const separator = field.source!.includes('?') ? '&' : '?';
      void api.getPage<AdminRecord>(`${field.source}${separator}page=${page}&limit=20&keyword=${encodeURIComponent(query)}`).then(result => {
        if (!active) return;
        setItems(result.data); setPages(result.meta?.totalPages || 1); setError('');
      }).catch(e => { if (active) setError(messageOf(e)); }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [open, field.source, page, query, reload]);
  return <View style={ui.gap}><Label>{field.label}</Label><Button secondary label={value ? name || value : 'Chọn…'} onPress={() => setOpen(true)} />{open && <Sheet title={field.label} onClose={() => setOpen(false)}><TextInput accessibilityLabel="Tìm kiếm" placeholder="Tìm theo tên…" style={ui.input} value={query} onChangeText={text => { setQuery(text); setPage(1); }} />{error ? <Notice message={error} retry={() => setReload(n => n + 1)} /> : loading ? <Label>Đang tải dữ liệu…</Label> : items.length === 0 ? <Notice empty message="Không có kết quả phù hợp. Hãy thử từ khóa khác." retry={() => setReload(n => n + 1)} /> : items.map(item => <Button key={recordId(item)} secondary label={display(item)} onPress={() => { onChange(recordId(item)); setName(display(item)); setOpen(false); }} />)}<View style={ui.row}><Button secondary label="Trước" disabled={page <= 1 || loading} onPress={() => setPage(p => p - 1)} /><Label>{page}/{pages}</Label><Button secondary label="Sau" disabled={page >= pages || loading} onPress={() => setPage(p => p + 1)} /></View></Sheet>}</View>;
}
export function AdminForm({ title, fields, initial = {}, onSave, onClose, description, extra, extraDirty = false, saveDisabled = false }: { title: string; fields: Field[]; initial?: AdminRecord; onSave: (payload: Record<string, unknown>) => Promise<void>; onClose: () => void; description?: string; extra?: ReactNode; extraDirty?: boolean; saveDisabled?: boolean }) {
  const editing = Boolean(recordId(initial));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(f => [f.key, f.password ? '' : initial[f.key] !== undefined && initial[f.key] !== null ? String(initial[f.key]) : f.default || ''])));
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');
  const [discard, setDiscard] = useState(false);
  const [dirty, setDirty] = useState(false);
  const change = (key: string, value: string) => { setDirty(true); setValues(v => ({ ...v, [key]: value })); };
  const close = () => { if (!locked.current) { if (dirty || extraDirty) setDiscard(true); else onClose(); } };
  const save = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await onSave(formPayload(fields, values, editing)); onClose(); }
    catch (e) { setError(messageOf(e)); }
    finally { locked.current = false; setBusy(false); }
  };
  return <Sheet title={title} onClose={close}>{description && <Label muted>{description}</Label>}{extra}{fields.filter(f => !(editing && f.createOnly)).map(field => field.source ? <RemoteSelect key={field.key} field={field} value={values[field.key]} onChange={v => change(field.key, v)} /> : field.options ? <Select key={field.key} label={field.label} value={values[field.key]} options={field.options} onChange={v => change(field.key, v)} /> : <View key={field.key} style={ui.gap}><Label>{field.label}{field.required ? ' *' : ''}</Label><TextInput accessibilityLabel={field.label} editable={!busy} style={[ui.input, field.multiline && { minHeight: 120, textAlignVertical: 'top' }, focused === field.key && { borderColor: colors.primary }]} value={values[field.key]} onChangeText={v => change(field.key, v)} onFocus={() => setFocused(field.key)} onBlur={() => setFocused('')} multiline={field.multiline} secureTextEntry={field.password} keyboardType={field.numeric ? 'numbers-and-punctuation' : field.key === 'email' ? 'email-address' : field.key === 'phone' ? 'phone-pad' : 'default'} autoCorrect={field.password ? false : undefined} autoCapitalize={field.password || field.key === 'username' || field.key === 'email' ? 'none' : 'sentences'} /></View>)}{error && <Notice message={error} />}<Button label="Lưu thay đổi" disabled={saveDisabled} busy={busy} onPress={() => void save()} />{discard && <Sheet title="Bỏ thay đổi?" onClose={() => setDiscard(false)}><Label>Nội dung chưa lưu sẽ bị mất.</Label><Button secondary label="Tiếp tục chỉnh sửa" onPress={() => setDiscard(false)} /><Button danger label="Bỏ thay đổi" onPress={onClose} /></Sheet>}</Sheet>;
}

