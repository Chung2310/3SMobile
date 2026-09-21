import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '@/services/api/client';
import { sessionDraftPath, type SessionDraft } from '@/services/sessionDrafts';
import { readSessionDraftCache, restoreSessionDraft } from '@/services/sessionDraftCache';
import { messageOf } from '@/utils/error';
import { Busy, Button, Notice, Sheet } from '../workouts/Controls';
import { ProgressForm } from './ProgressForm';
import type { JsonRecord } from '@/types/domain';

export function SessionDraftForm({ ownerId, customerId, plan, pastSessions, onClose, onSaved }: {
  ownerId: string; customerId: string; plan: JsonRecord; pastSessions: JsonRecord[]; onClose: () => void; onSaved: () => void;
}) {
  const [data, setData] = useState<{ draft: SessionDraft | null; restored: boolean }>();
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([api.get<SessionDraft | null>(sessionDraftPath(customerId)), readSessionDraftCache(ownerId, customerId)])
      .then(([server, cached]) => { if (active) { setData(restoreSessionDraft(server, cached)); setError(''); } })
      .catch(cause => { if (active) setError(messageOf(cause)); });
    return () => { active = false; };
  }, [ownerId, customerId, reload]);
  if (data === undefined) return <Sheet title="Mở tiến độ buổi tập" onClose={onClose}>{error ? <View style={{gap:12}}><Notice error text={error} /><Button label="Thử tải bản nháp lại" onPress={() => { setError(''); setReload(n => n + 1); }} /></View> : <Busy />}</Sheet>;
  return <ProgressForm key={data.draft?.idempotencyKey || 'new'} kind="session" ownerId={ownerId} customerId={customerId} plan={plan} pastSessions={pastSessions} sessionDraft={data.draft || undefined} restoredFromCache={data.restored} onClose={onClose} onSaved={onSaved} />;
}

export function SessionDraftCard({ ownerId, customerId, refreshKey, onResume }: { ownerId: string; customerId: string; refreshKey: number; onResume: () => void }) {
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([api.get<SessionDraft | null>(sessionDraftPath(customerId)), readSessionDraftCache(ownerId, customerId)])
      .then(([server, cached]) => { if (active) { setDraft(restoreSessionDraft(server, cached).draft); setError(''); } })
      .catch(cause => { if (active) setError(messageOf(cause)); });
    return () => { active = false; };
  }, [ownerId, customerId, refreshKey, reload]);
  if (error) return <View style={{gap:8}}><Notice error text={`Không tải được bản nháp: ${error}`} /><Button secondary label="Thử tải bản nháp" onPress={() => setReload(n => n + 1)} /></View>;
  if (!draft) return null;
  return <View style={{gap:8}}><Notice tone="info" text={`Có tiến độ buổi tập đang lưu${draft.form.date ? ` ngày ${String(draft.form.date)}` : ''}. Cập nhật gần nhất: ${new Date(draft.updatedAt).toLocaleString('vi-VN')}. Chưa được tính vào gói tập.`} /><Button secondary icon="edit-3" label="Tiếp tục bản nháp" onPress={onResume} /></View>;
}
