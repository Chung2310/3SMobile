import { useRef, useState } from 'react';
import { View } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { api } from '@/services/api/client';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { Button, Label, Notice, Sheet, ui } from './AdminUI';

export function SeedKnowledge({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<number>();
  const lock = useRef(false);
  const submit = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await api.post<{ count: number }>('/api/knowledge/seed-standard', {});
      setCount(result.count); setOpen(false); onDone();
    } catch (cause) { setError(messageOf(cause)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={ui.gap}><Button secondary label="Nạp tri thức chuẩn 3S" onPress={() => { setError(''); setOpen(true); }} />{count !== undefined && <View style={ui.row}><CheckCircle color={colors.success} size={24} /><View style={ui.flex}><Label>Đã nạp {count} tài liệu mới.</Label></View></View>}{open && <Sheet title="Nạp tri thức chuẩn 3S" onClose={() => { if (!lock.current) setOpen(false); }}><Label>Các tài liệu chuẩn chưa có sẽ được thêm và xuất bản ngay. Tài liệu trùng tiêu đề được giữ nguyên.</Label>{error && <Notice message={error} />}<Button label="Nạp và xuất bản" busy={busy} onPress={() => void submit()} /><Button secondary disabled={busy} label="Hủy" onPress={() => setOpen(false)} /></Sheet>}</View>;
}
