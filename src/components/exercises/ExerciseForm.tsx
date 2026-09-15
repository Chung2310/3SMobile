import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '@/services/api/client';
import { asRecords, readText } from '@/services/journey';
import { exercisePayload, exerciseVideos, splitList, stringList } from '@/services/exercises';
import { LEVELS, TRACKING, recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { colors } from '@/theme';
import { Button, Field, Notice, Picker, Sheet, ws } from '@/components/workouts/Controls';

export function ExerciseForm({ initial, groups, onSaved, onClose }: { initial?: JsonRecord; groups: string[]; onSaved: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState<JsonRecord>(() => ({ ...initial, name: readText(initial, ['name']), muscleGroups: stringList(initial?.muscleGroups).length ? stringList(initial?.muscleGroups) : splitList(readText(initial, ['muscleGroup'])), level: readText(initial, ['level'], 'BEGINNER'), defaultTrackingType: readText(initial, ['defaultTrackingType']), videos: exerciseVideos(initial || {}).map((video) => ({ ...video })), videoUrl: '' }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [groupPicker, setGroupPicker] = useState(false);
  const lock = useRef(false);
  const update = (patch: JsonRecord) => { setDirty(true); setDraft((current) => ({ ...current, ...patch })); };
  const videos = asRecords(draft.videos);
  async function save() {
    if (lock.current) return;
    setError('');
    try {
      const payload = exercisePayload(draft);
      lock.current = true; setBusy(true);
      if (initial) await api.patch(`/api/exercises/${recordId(initial)}`, payload);
      else await api.post('/api/exercises', payload);
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được bài tập.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Sheet title={initial ? 'Sửa bài tập' : 'Tạo bài tập'} locked={busy} onClose={() => dirty ? setDiscard(true) : onClose()} footer={<Button label="Lưu bài tập" icon="check" busy={busy} onPress={() => void save()} />}>
    <Field label="Tên bài tập *" placeholder="Ví dụ: Barbell Squat" value={String(draft.name ?? '')} onChange={(name) => update({ name })} error={error && !readText(draft, ['name']) ? 'Vui lòng nhập tên bài tập.' : undefined} />
    <Button secondary icon="layers" label={`Nhóm cơ: ${stringList(draft.muscleGroups).join(', ') || 'Chọn nhóm cơ *'}`} onPress={() => setGroupPicker(true)} />
    {error && !stringList(draft.muscleGroups).length && <Notice error text="Vui lòng chọn nhóm cơ." />}
    <Picker label="Cấp độ" value={String(draft.level ?? '')} options={LEVELS} onChange={(level) => update({ level })} />
    <Picker label="Cách ghi nhận *" value={String(draft.defaultTrackingType ?? '')} options={TRACKING} onChange={(defaultTrackingType) => update({ defaultTrackingType })} />
    <Field label="Thiết bị (cách nhau bằng dấu phẩy)" value={typeof draft.equipmentText === 'string' ? draft.equipmentText : stringList(draft.equipment).join(', ')} onChange={(equipmentText) => update({ equipmentText, equipment: splitList(equipmentText) })} />
    <Field label="Mô tả" multiline value={String(draft.description ?? '')} onChange={(description) => update({ description })} />
    <Field label="Hướng dẫn kỹ thuật" multiline value={String(draft.technique ?? '')} onChange={(technique) => update({ technique })} />
    {([['commonMistakes', 'Lỗi thường gặp'], ['contraindications', 'Chống chỉ định'], ['variants', 'Biến thể']] as const).map(([key, label]) => <Field key={key} label={`${label} (mỗi dòng một mục)`} multiline value={typeof draft[`${key}Text`] === 'string' ? String(draft[`${key}Text`]) : stringList(draft[key]).join('\n')} onChange={(value) => update({ [`${key}Text`]: value, [key]: value.split('\n').map((line) => line.trim()).filter(Boolean) })} />)}
    <Text style={ws.title}>Video hướng dẫn</Text>
    {videos.map((video, index) => <View key={index} style={ws.sub}>
      <Field label={`Tên video ${index + 1}`} value={String(video.title ?? '')} onChange={(title) => update({ videos: videos.map((v, i) => i === index ? { ...v, title } : v) })} />
      <Field label="Liên kết video (HTTP/HTTPS)" value={String(video.url ?? '')} onChange={(url) => update({ videos: videos.map((v, i) => i === index ? { ...v, url, source: 'LINK' } : v) })} />
      <Button secondary destructive label="Bỏ video" icon="trash-2" onPress={() => update({ videos: videos.filter((_, i) => i !== index), videoUrl: '' })} />
    </View>)}
    <Button secondary icon="plus" label="Thêm liên kết video" disabled={videos.length >= 20} onPress={() => update({ videos: [...videos, { title: '', url: '', source: 'LINK' }] })} />
    {!!error && <Notice error text={error} />}
    {groupPicker && <MusclePicker options={[...new Set([...groups, ...stringList(draft.muscleGroups)])]} value={stringList(draft.muscleGroups)} onApply={(muscleGroups) => { update({ muscleGroups }); setGroupPicker(false); }} onClose={() => setGroupPicker(false)} />}
    {discard && <Sheet title="Bỏ thay đổi?" onClose={() => setDiscard(false)}><Notice tone="warning" text="Các thay đổi chưa lưu sẽ bị bỏ." /><Button label="Tiếp tục sửa" onPress={() => setDiscard(false)} /><Button secondary destructive label="Bỏ thay đổi" onPress={onClose} /></Sheet>}
  </Sheet>;
}
function MusclePicker({ options, value, onApply, onClose }: { options: string[]; value: string[]; onApply: (value: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState('');
  return <Sheet title="Chọn nhóm cơ" onClose={onClose} footer={<><Button label="Áp dụng" onPress={() => onApply(selected)} /><Button secondary label="Đặt lại" onPress={() => setSelected([])} /></>}>
    {options.length > 8 && <Field label="Tìm nhóm cơ" value={query} onChange={setQuery} />}
    {!options.length && <Notice text="Chưa tải được nhóm cơ. Đóng form và thử tải lại thư viện." />}
    {options.filter((name) => name.toLowerCase().includes(query.toLowerCase())).map((name) => <Pressable key={name} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(name) }} onPress={() => setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])} style={[ws.row, { flexWrap: 'nowrap', minHeight: 48, padding: 12 }]}><Text numberOfLines={2} ellipsizeMode="tail" style={[ws.text, { flex: 1 }]}>{name}</Text><Feather name={selected.includes(name) ? 'check-square' : 'square'} size={20} color={selected.includes(name) ? colors.primary : colors.textMuted} /></Pressable>)}
  </Sheet>;
}
