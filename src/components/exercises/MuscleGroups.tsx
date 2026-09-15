import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '@/services/api/client';
import { readNumber, readText } from '@/services/journey';
import { recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { Button, Field, Notice, Sheet, ws } from '@/components/workouts/Controls';

export function MuscleGroups({ groups, onChanged, onClose }: { groups: JsonRecord[]; onChanged: () => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<JsonRecord>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  async function save() {
    if (lock.current) return;
    if (!deleting && (!name.trim() || name.trim().length > 100)) { setError('Tên nhóm cơ cần từ 1 đến 100 ký tự.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      if (deleting) await api.delete(`/api/exercises/muscle-groups/${recordId(deleting)}`);
      else await api.post('/api/exercises/muscle-groups', { name: name.trim() });
      setMessage(deleting ? 'Đã xóa nhóm cơ.' : 'Đã thêm nhóm cơ.'); setDeleting(undefined); setName(''); await onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không cập nhật được nhóm cơ.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Sheet title="Quản lý nhóm cơ" locked={busy} onClose={onClose}>
    {!!message && <Notice tone="success" text={message} />}{!!error && <Notice error text={error} />}
    {deleting ? <><Notice tone="warning" text={`Xóa nhóm cơ “${readText(deleting, ['name'])}”?`} /><Button destructive label="Xác nhận xóa" busy={busy} onPress={() => void save()} /><Button secondary label="Hủy" disabled={busy} onPress={() => setDeleting(undefined)} /></> : <>
      <Field label="Tên nhóm cơ mới" value={name} onChange={setName} /><Button label="Thêm nhóm cơ" icon="plus" busy={busy} onPress={() => void save()} />
      {groups.length > 8 && <Field label="Tìm nhóm cơ" value={search} onChange={setSearch} />}
      {groups.filter((group) => readText(group, ['name']).toLowerCase().includes(search.toLowerCase())).map((group) => <View key={recordId(group)} style={ws.sub}><Text numberOfLines={2} ellipsizeMode="tail" style={ws.cardTitle}>{readText(group, ['name'])}</Text><Text style={ws.muted}>{readNumber(group, ['exerciseCount']) ?? 0} bài tập{group.isDefault ? ' · Mặc định' : ''}</Text>{!group.isDefault && readNumber(group, ['exerciseCount']) === 0 && <Button secondary destructive label="Xóa nhóm cơ" disabled={busy} onPress={() => { setError(''); setDeleting(group); }} />}</View>)}
    </>}
  </Sheet>;
}
