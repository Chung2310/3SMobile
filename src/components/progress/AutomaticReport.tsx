import { useRef, useState } from 'react';
import { View } from 'react-native';
import { api } from '@/services/api/client';
import { dateIso, dayKey } from '@/services/progress';
import { readText } from '@/services/journey';
import { recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { Button, Field, Notice, Sheet } from '../workouts/Controls';
import { ProgressNotice } from './ProgressNotice';
export function AutomaticReport({ customerId, onClose, onChanged }: { customerId: string; onClose: () => void; onChanged: () => void }) {
  const [from, setFrom] = useState(dayKey(new Date())); const [to, setTo] = useState(dayKey(new Date()));
  const [draft, setDraft] = useState<JsonRecord>(); const [summary, setSummary] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [notice, setNotice] = useState({ message: '', error: false });
  async function act(mode: 'generate' | 'save' | 'publish') {
    if (lock.current) return; lock.current = true; setBusy(true);
    try {
      if (mode === 'generate') {
        const periodStart = dateIso(from), periodEnd = dateIso(to, '23:59');
        if (periodEnd < periodStart) throw new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
        const value = await api.post<JsonRecord>('/api/progress-reports/generate', { customerId, periodStart, periodEnd });
        if (!recordId(value)) throw new Error('Máy chủ chưa trả mã báo cáo. Tải lại danh sách trước khi thử lại.');
        setDraft(value); setSummary(readText(value, ['summary']));
      } else if (draft) {
        if (!summary.trim()) throw new Error('Vui lòng nhập nội dung báo cáo.');
        await api.patch('/api/progress-reports/' + recordId(draft), { summary: summary.trim() });
        if (mode === 'publish') await api.patch('/api/progress-reports/' + recordId(draft) + '/publish');
        setDraft({ ...draft, status: mode === 'publish' ? 'PUBLISHED' : 'DRAFT' });
      }
      onChanged(); setNotice({ message: mode === 'generate' ? 'Đã tạo bản nháp báo cáo. Kiểm tra nội dung trước khi công bố.' : mode === 'publish' ? 'Đã công bố báo cáo cho học viên.' : 'Đã lưu bản nháp báo cáo.', error: false });
    } catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Không thực hiện được yêu cầu.', error: true }); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Sheet title="Báo cáo tự động" locked={busy} onClose={onClose}><View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 16 }}>{!draft ? <><Field label="Từ ngày (YYYY-MM-DD)" value={from} onChange={setFrom} /><Field label="Đến ngày (YYYY-MM-DD)" value={to} onChange={setTo} /><Button label="Tổng hợp báo cáo" busy={busy} onPress={() => void act('generate')} /></> : <>{Array.isArray(draft.warnings) && draft.warnings.map((w, i) => <Notice key={i} tone="warning" text={String(w)} />)}<Field label="Nội dung báo cáo" multiline value={summary} onChange={setSummary} /><Button secondary label="Lưu bản nháp" busy={busy} onPress={() => void act('save')} /><Button label="Lưu và công bố" busy={busy} onPress={() => void act('publish')} /></>}</View><ProgressNotice {...notice} onClose={() => setNotice({ message: '', error: false })} /></Sheet>;
}
