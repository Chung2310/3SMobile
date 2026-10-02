import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { fetchGymInvitations, invitePtToGym, respondToGymInvitation, type GymInvitation, type GymInvitationsResponse } from '@/services/gymInvitations';
import { colors, radius, spacing, typography } from '@/theme';
import { messageOf } from '@/utils/error';

const statusLabels: Record<GymInvitation['status'], string> = {
  PENDING: 'Đang chờ xác nhận', ACCEPTED: 'Đã tham gia', DECLINED: 'Đã từ chối', CANCELLED: 'Đã thu hồi', EXPIRED: 'Đã hết hạn',
};

export default function GymInvitationsScreen() {
  const { session, signOut } = useAuth();
  const admin = session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';
  const [data, setData] = useState<GymInvitationsResponse | null>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    try { setData(await fetchGymInvitations()); setError(''); }
    catch (cause) { setError(messageOf(cause)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function send() {
    if (lock.current) return;
    if (username.trim().length < 3) return setError('Nhập tên đăng nhập PT cần mời.');
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await invitePtToGym(username.trim()); setUsername('');
      await load(); setNotice('Đã gửi lời mời. PT có thể xác nhận trong Hồ sơ → Lời mời gym.');
    } catch (cause) { setError(messageOf(cause)); }
    finally { lock.current = false; setBusy(false); }
  }

  async function respond(invitation: GymInvitation, action: 'ACCEPT' | 'DECLINE' | 'CANCEL') {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await respondToGymInvitation(invitation.id, action);
      if (action === 'ACCEPT') {
        await signOut();
        router.replace('/(auth)/login');
        Alert.alert('Đã tham gia gym', 'Dữ liệu của bạn đã chuyển sang ' + invitation.centerName + '. Vui lòng đăng nhập lại để sử dụng.');
      } else { await load(); setNotice(action === 'CANCEL' ? 'Đã thu hồi lời mời.' : 'Đã từ chối lời mời.'); }
    } catch (cause) { setError(messageOf(cause)); }
    finally { lock.current = false; setBusy(false); }
  }

  function confirmAccept(invitation: GymInvitation) {
    Alert.alert('Tham gia ' + invitation.centerName + '?',
      'Toàn bộ khách hàng, giáo án, thực đơn và dữ liệu cá nhân của bạn sẽ chuyển sang gym này. Chủ gym sẽ được quyền quản lý dữ liệu. Bạn sẽ cần đăng nhập lại. Bạn đồng ý chuyển toàn bộ dữ liệu và tham gia gym?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đồng ý chuyển và tham gia', onPress: () => { void respond(invitation, 'ACCEPT'); } },
      ]);
  }

  return <Screen title={admin ? 'Mời PT vào gym' : 'Lời mời gym'} subtitle={data?.workspaceType === 'GYM' ? data.centerName : 'Bạn đang sử dụng tài khoản PT độc lập'} refreshing={loading} onRefresh={load}>
    {admin && <View style={styles.card}>
      <Text style={styles.heading}>Mời PT đã có tài khoản</Text>
      <Text style={styles.body}>Nhập đúng tên đăng nhập của PT độc lập. PT chỉ thuộc gym sau khi tự xác nhận lời mời. Lời mời có hiệu lực 7 ngày.</Text>
      <TextInput accessibilityLabel="Tên đăng nhập PT" value={username} onChangeText={setUsername} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={64} placeholder="Tên đăng nhập PT" placeholderTextColor={colors.textMuted} style={styles.input} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void send()} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>Gửi lời mời</Text></Pressable>
    </View>}
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    {(loading || busy) && <ActivityIndicator color={colors.primary} />}
    {!loading && !data?.items.length && <Text style={styles.body}>Chưa có lời mời nào. {admin ? 'Bạn có thể gửi lời mời bằng tên đăng nhập PT.' : 'Lời mời từ admin sẽ xuất hiện tại đây.'}</Text>}
    {data?.items.map(invitation => <View key={invitation.id} style={styles.card}>
      <Text style={styles.heading}>{admin ? invitation.fullName || invitation.username : invitation.centerName}</Text>
      {admin && <Text style={styles.body}>Tên đăng nhập: {invitation.username}</Text>}
      <Text style={styles.body}>{statusLabels[invitation.status]}</Text>
      <Text style={styles.body}>Hết hạn: {new Date(invitation.expiresAt).toLocaleDateString('vi-VN')}</Text>
      {invitation.status === 'PENDING' && <View style={styles.actions}>
        {admin ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void respond(invitation, 'CANCEL')} style={styles.secondary}><Text style={styles.secondaryText}>Thu hồi</Text></Pressable> : <>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => confirmAccept(invitation)} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>Xác nhận tham gia</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void respond(invitation, 'DECLINE')} style={styles.secondary}><Text style={styles.secondaryText}>Từ chối</Text></Pressable>
        </>}
      </View>}
    </View>)}
  </Screen>;
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, gap: spacing.sm },
  heading: { ...typography.heading, color: colors.text }, body: { ...typography.body, color: colors.textMuted },
  input: { ...typography.body, color: colors.text, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  primary: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  primaryText: { ...typography.bodyMedium, color: colors.textOnPrimary },
  secondary: { minHeight: 48, paddingHorizontal: spacing.md, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { ...typography.bodyMedium, color: colors.primary }, actions: { gap: spacing.xs }, disabled: { opacity: 0.5 },
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md }, notice: { ...typography.body, color: colors.success, marginBottom: spacing.md },
});
