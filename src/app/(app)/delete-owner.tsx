import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button, Notice, Select, ui } from '@/components/admin/AdminUI';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { messageOf } from '@/utils/error';

interface Options { centerName: string; username: string; isOwner: boolean; canClose: boolean }
interface Trainer { _id?: string; id?: string; fullName?: string; username: string }
type Mode = 'TRANSFER' | 'CLOSE' | 'PERSONAL';

export default function DeleteOwnerScreen() {
  const { session, signOut } = useAuth();
  const [options, setOptions] = useState<Options>();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [mode, setMode] = useState<Mode>('TRANSFER');
  const [successorId, setSuccessorId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get<Options>('/api/auth/me/deletion-options');
      setOptions(data); setMode(data.isOwner ? 'TRANSFER' : 'PERSONAL');
      if (data.isOwner) {
        const all: Trainer[] = [];
        let page = 1;
        let pages = 1;
        do {
          const result = await api.getPage<Trainer>(`/api/users?role=PT&status=ACTIVE&limit=100&page=${page}`);
          all.push(...result.data); pages = result.meta?.totalPages || 1; page++;
        } while (page <= pages);
        setTrainers(all);
      }
    } catch (cause) { setError(messageOf(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (session?.user.role !== 'ADMIN') return <Redirect href="/(app)/profile" />;

  const submit = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await api.post('/api/auth/me/delete-owner', {
        mode, currentPassword: password, confirmation,
        ...(mode === 'TRANSFER' ? { successorId } : {}),
      });
      await signOut();
      router.replace('/(auth)/login');
      Alert.alert('Đã xóa tài khoản', mode === 'CLOSE'
        ? 'Trung tâm và tài khoản của các thành viên đã được xóa.'
        : 'Tài khoản của bạn đã được xóa. Dữ liệu chung của trung tâm được giữ lại cho người quản lý tiếp nhận.');
    } catch (cause) { setError(messageOf(cause)); }
    finally { lock.current = false; setBusy(false); }
  };
  const expected = mode === 'CLOSE' ? options?.centerName : options?.username;
  return <Screen title="Xóa tài khoản chủ gym" onBack={() => { if (!busy) router.back(); }}>
    <View style={ui.gap}>
      {loading ? <Text style={ui.text}>Đang tải thông tin trung tâm…</Text> : !options ? <Notice message={error} retry={() => void load()} /> : <>
        <View style={ui.card}>
          <Text style={ui.heading} numberOfLines={2} ellipsizeMode="tail">{options.centerName}</Text>
          <Text style={ui.text}>Thao tác không thể hoàn tác. Tài khoản, phiên đăng nhập và toàn bộ dữ liệu riêng của bạn sẽ bị xóa.</Text>
          <Text style={ui.text}>Ảnh và file do hệ thống lưu trữ sẽ được dọn nền sau khi xóa dữ liệu. Tài nguyên vẫn đang được trung tâm khác sử dụng sẽ được giữ lại.</Text>
          {options.isOwner && <Select label="Cách xử lý trung tâm" value={mode} onChange={value => { if (!busy) { setMode(value as Mode); setConfirmation(''); } }} options={[
            { value: 'TRANSFER', label: 'Chuyển quyền và xóa tài khoản của tôi' },
            ...(options.canClose ? [{ value: 'CLOSE', label: 'Đóng trung tâm và xóa toàn bộ dữ liệu' }] : []),
          ]} />}
          {mode === 'TRANSFER' && <>
            <Text style={ui.text}>PT được chọn sẽ trở thành chủ gym (ADMIN). Hồ sơ học viên và dữ liệu chung được giữ lại. Hãy thống nhất với người tiếp nhận trước khi xác nhận; họ cần đăng nhập lại để cập nhật giao diện quản trị.</Text>
            {trainers.length ? <Select label="PT tiếp nhận quyền chủ gym" value={successorId} options={trainers.map(pt => ({ value: pt._id || pt.id || '', label: `${pt.fullName || pt.username} (${pt.username})` }))} onChange={value => { if (!busy) setSuccessorId(value); }} /> : <Text style={ui.text}>Chưa có PT đang hoạt động. Bạn có thể tạo PT rồi quay lại, hoặc chọn đóng trung tâm nếu không tiếp tục sử dụng.</Text>}
            {!options.canClose && <Text style={ui.text}>Trung tâm có tài khoản quản trị hệ thống nên không thể đóng từ màn hình này. Bạn vẫn có thể chuyển quyền và xóa tài khoản cá nhân.</Text>}
          </>}
          {mode === 'CLOSE' && <Text style={ui.text}>Toàn bộ tài khoản PT, học viên, giáo án, dinh dưỡng, lịch sử tập luyện và dữ liệu của trung tâm sẽ bị xóa. Các thành viên sẽ mất quyền truy cập. Gym khác và thư viện dùng chung không bị ảnh hưởng.</Text>}
          {mode === 'PERSONAL' && <Text style={ui.text}>Bạn không phải chủ trung tâm hiện tại. Dữ liệu chung sẽ được chuyển cho chủ trung tâm đang hoạt động; các thành viên khác tiếp tục sử dụng.</Text>}
          <Text style={ui.text}>Nhập chính xác để xác nhận: {expected}</Text>
          <TextInput style={ui.input} accessibilityLabel="Nội dung xác nhận xóa" value={confirmation} onChangeText={setConfirmation} editable={!busy} autoCapitalize="none" autoCorrect={false} />
          <Text style={ui.text}>Mật khẩu hiện tại</Text>
          <TextInput style={ui.input} accessibilityLabel="Mật khẩu hiện tại" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          {error ? <Notice message={error} /> : null}
          <Button danger label={mode === 'CLOSE' ? 'Đóng trung tâm và xóa vĩnh viễn' : 'Xóa tài khoản của tôi'} busy={busy} disabled={!password || confirmation !== expected || (mode === 'TRANSFER' && !successorId)} onPress={() => Alert.alert('Xác nhận lần cuối', mode === 'CLOSE' ? 'Bạn đồng ý xóa toàn bộ trung tâm và tài khoản các thành viên? Không thể hoàn tác.' : 'Bạn đồng ý xóa vĩnh viễn tài khoản cá nhân?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa vĩnh viễn', style: 'destructive', onPress: () => void submit() }])} />
        </View>
      </>}
    </View>
  </Screen>;
}
