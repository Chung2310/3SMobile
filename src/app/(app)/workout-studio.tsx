import { LibraryIconContext } from '@/components/LibraryIcon';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PlanEditor } from '@/components/workouts/PlanEditor';
import { Button, Busy, Notice } from '@/components/workouts/Controls';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';

import { PlanSetup, validPlanSetup, type PlanSetupValues } from '@/components/workouts/PlanSetup';
export default function WorkoutStudioScreen() {
  return <LibraryIconContext.Provider value={true}><WorkoutStudioScreenContent /></LibraryIconContext.Provider>;
}

function WorkoutStudioScreenContent() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string; title?: string; goal?: string; durationDays?: string; level?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const seed: PlanSetupValues = { title: typeof params.title === 'string' ? params.title : '', goal: typeof params.goal === 'string' ? params.goal : '', durationDays: typeof params.durationDays === 'string' ? params.durationDays : '', level: typeof params.level === 'string' ? params.level : '' };
  if (session?.user.role !== 'PT') return <Screen title="Workout Studio"><Notice text="Tài khoản này không có quyền chỉnh sửa giáo án." /></Screen>;
  return <StudioLoader key={session.user.id + ':' + id} id={id} seed={validPlanSetup(seed) ? seed : undefined} />;
}
function StudioLoader({ id, seed }: { id: string; seed?: PlanSetupValues }) {
  const router = useRouter();
  const savedId = useRef(id);
  const [setup, setSetup] = useState(seed);
  const [initial, setInitial] = useState<JsonRecord>();
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const generation = useRef(0);
  const close = () => router.canGoBack() ? router.back() : router.replace('/(app)/plans');
  const load = useCallback(async () => {
    if (!id) return;
    const request = ++generation.current;
    setLoading(true); setError('');
    try { const plan = await api.get<JsonRecord>('/api/workout-templates/' + encodeURIComponent(id)); if (!recordId(plan)) throw new Error('Không tìm thấy giáo án.'); if (request === generation.current) setInitial(plan); }
    catch (cause) { if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Không tải được giáo án.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [id]);
  useEffect(() => { const request = generation; const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); request.current++; }; }, [load]);
  if (loading || error) return <Screen title="Workout Studio" onBack={close}>{loading ? <Busy /> : <><Notice error text={error} /><Button label="Thử lại" onPress={() => void load()} /></>}</Screen>;
  if (!id && !setup) return <Screen title="Tạo giáo án" onBack={close}><PlanSetup onClose={close} onNext={setSetup} /></Screen>;
  return <PlanEditor initial={initial} seed={setup ? { ...setup, durationDays: Number(setup.durationDays) } : undefined} onClose={close} onSave={async (payload) => {
    if (savedId.current) await api.patch('/api/workout-templates/' + encodeURIComponent(savedId.current), payload);
    else { const created = await api.post<JsonRecord>('/api/workout-templates', payload); savedId.current = recordId(created); if (!savedId.current) throw new Error('Máy chủ chưa trả mã giáo án. Hãy kiểm tra danh sách trước khi tạo lại.'); }
  }} />;
}
