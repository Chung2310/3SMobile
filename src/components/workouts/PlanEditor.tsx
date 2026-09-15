import { useState } from 'react';
import { Text, View } from 'react-native';
import { asRecord, asRecords, readText } from '@/services/journey';
import { LEVELS, TRACKING, PRESCRIPTIONS, planPayload, prepareDraft } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { exerciseForPlan } from '@/services/exercises';
import { Button, Field, Notice, Picker, Sheet, ws } from './Controls';

export function PlanEditor({ initial, onSave, onClose }: { initial?: JsonRecord; onSave: (payload: JsonRecord) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState<JsonRecord>(() => initial ? prepareDraft(initial) : { title: '', goal: '', level: 'BEGINNER', durationDays: 28, sessions: [{ name: 'Buổi 1', exercises: [] }] });
  const [librarySession, setLibrarySession] = useState<number | 'unscheduled'>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const [dirty, setDirty] = useState(false);
  function change(patch: JsonRecord) { setDirty(true); setDraft((old) => ({ ...old, ...patch })); }
  const sessions = asRecords(draft.sessions);
  const scheduled = asRecords(draft.scheduledExercises);
  const unscheduled = asRecords(draft.unscheduledExercises);
  function updateSession(index: number, patch: JsonRecord) { change({ sessions: sessions.map((s, i) => i === index ? { ...s, ...patch } : s) }); }
  async function save() {
    if (busy) return;
    setError('');
    try { const payload = planPayload(draft); setBusy(true); await onSave(payload); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được giáo án.'); }
    finally { setBusy(false); }
  }
  if (librarySession !== undefined) return <Sheet title="Chọn từ thư viện" onClose={() => setLibrarySession(undefined)}><ExerciseLibrary onSelect={(exercise) => {
    const selected = exerciseForPlan(exercise);
    if (librarySession === 'unscheduled') change({ unscheduledExercises: [...unscheduled, { ...selected, durationMinutes: 15 }] });
    else updateSession(librarySession, { exercises: [...asRecords(sessions[librarySession]?.exercises), selected] });
    setLibrarySession(undefined);
  }} /></Sheet>;
  return <Sheet title={initial ? 'Sửa giáo án' : 'Tạo giáo án'} locked={busy} onClose={() => dirty ? setDiscard(true) : onClose()} footer={<Button label="Lưu giáo án" icon="check" busy={busy} onPress={() => void save()} />}>
    <Field label="Tên giáo án *" error={error && !readText(draft, ['title']) ? 'Vui lòng nhập tên giáo án.' : undefined} value={String(draft.title ?? '')} onChange={(title) => change({ title })} />
    <Field label="Mục tiêu *" error={error && !readText(draft, ['goal']) ? 'Vui lòng nhập mục tiêu.' : undefined} value={String(draft.goal ?? '')} onChange={(goal) => change({ goal })} />
    <Picker label="Cấp độ" value={String(draft.level ?? '')} options={LEVELS} onChange={(level) => change({ level })} />
    <Field label="Số ngày (1–365)" numeric value={String(draft.durationDays ?? '')} onChange={(durationDays) => change({ durationDays })} />
    <Field label="Dặn dò kỹ thuật" multiline value={String(draft.technicalNotes ?? '')} onChange={(technicalNotes) => change({ technicalNotes })} />
    {scheduled.length ? <>
      <Notice text="Lịch ngày và giờ từ Studio được giữ nguyên. Bạn có thể điều chỉnh thông số từng bài bên dưới." />
      {scheduled.map((exercise, index) => <View key={index} style={ws.card}>
        <Text style={ws.badge}>Tuần {readText(exercise, ['weekNumber'], '1')} · Ngày {readText(exercise, ['dayNumber'])}</Text>
        <ExerciseEditor exercise={exercise} onChange={(patch) => change({ scheduledExercises: scheduled.map((e, i) => i === index ? { ...e, ...patch } : e) })} />
      </View>)}
    </> : <>
      {sessions.map((session, index) => <View key={index} style={ws.card}>
        <Field label={`Tên buổi ${index + 1}`} value={String(session.name ?? '')} onChange={(name) => updateSession(index, { name })} />
        {asRecords(session.exercises).map((exercise, exerciseIndex) => <View key={exerciseIndex} style={ws.sub}>
          <ExerciseEditor exercise={exercise} onChange={(patch) => updateSession(index, { exercises: asRecords(session.exercises).map((e, i) => i === exerciseIndex ? { ...e, ...patch } : e) })} />
          <Button secondary destructive icon="trash-2" label="Bỏ bài tập" onPress={() => updateSession(index, { exercises: asRecords(session.exercises).filter((_, i) => i !== exerciseIndex) })} />
        </View>)}
        <Button icon="book-open" label="Chọn từ thư viện" onPress={() => setLibrarySession(index)} />
        <Button secondary icon="plus" label="Nhập bài thủ công" onPress={() => updateSession(index, { exercises: [...asRecords(session.exercises), { name: '', trackingType: 'STRENGTH', prescription: { sets: 3, reps: '10', restSeconds: 60 } }] })} />
        <Button secondary destructive label="Bỏ buổi tập" onPress={() => change({ sessions: sessions.filter((_, i) => i !== index) })} />
      </View>)}
      <Button secondary icon="plus" label="Thêm buổi tập" onPress={() => change({ sessions: [...sessions, { name: `Buổi ${sessions.length + 1}`, exercises: [] }] })} />
    </>}
    {scheduled.length > 0 && <Button secondary icon="book-open" label="Thêm bài chưa xếp lịch từ thư viện" onPress={() => setLibrarySession('unscheduled')} />}
    {unscheduled.length > 0 && <><Text style={ws.title}>Bài tập chưa xếp lịch</Text>{unscheduled.map((exercise, index) => <View key={index} style={ws.card}><ExerciseEditor exercise={exercise} onChange={(patch) => change({ unscheduledExercises: unscheduled.map((e, i) => i === index ? { ...e, ...patch } : e) })} /></View>)}</>}
    {!!error && <Notice error text={error} />}
    {discard && <Sheet title="Bỏ thay đổi?" onClose={() => setDiscard(false)}><Notice text="Các thay đổi chưa lưu sẽ bị bỏ." /><Button label="Tiếp tục sửa" onPress={() => setDiscard(false)} /><Button secondary label="Bỏ thay đổi" onPress={onClose} /></Sheet>}
  </Sheet>;
}
function ExerciseEditor({ exercise, onChange }: { exercise: JsonRecord; onChange: (patch: JsonRecord) => void }) {
  const [picking, setPicking] = useState(false);
  const kind = readText(exercise, ['trackingType']);
  const prescription = asRecord(exercise.prescription);
  return <View style={{ gap: 12 }}>
    <Button secondary icon="book-open" label="Thay bài từ thư viện" onPress={() => setPicking(true)} />
    {picking && <Sheet title="Chọn bài thay thế" onClose={() => setPicking(false)}><ExerciseLibrary onSelect={(item) => { onChange({ sets: undefined, reps: undefined, weight: undefined, rpe: undefined, rir: undefined, restSeconds: undefined, rest: undefined, ...exerciseForPlan(item) }); setPicking(false); }} /></Sheet>}
    <Field label="Tên bài tập *" value={String(exercise.name ?? '')} onChange={(name) => onChange({ name })} />
    <Picker label="Cách ghi nhận" value={kind} options={TRACKING} onChange={(trackingType) => onChange({ trackingType, prescription: {}, sets: undefined, reps: undefined, weight: undefined, rpe: undefined, rir: undefined, restSeconds: undefined, rest: undefined })} />
    {(PRESCRIPTIONS[kind] || []).map(([key, label, unit]) => <Field key={key} label={`${label}${unit ? ` (${unit})` : ''}`} value={String(prescription[key] ?? '')} numeric={key !== 'side' && !(key === 'reps' && kind !== 'MOBILITY')} onChange={(value) => onChange({ prescription: { ...prescription, [key]: value } })} />)}
    <Field label="Tempo" value={String(exercise.tempo ?? '')} onChange={(tempo) => onChange({ tempo })} />
    <Field label="Ghi chú" multiline value={String(exercise.notes ?? '')} onChange={(notes) => onChange({ notes })} />
  </View>;
}
