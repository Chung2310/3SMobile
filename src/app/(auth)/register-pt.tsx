import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { registerPt, type RegisterPtResponse } from '@/services/ptRegistration';
import { isValidPassword, PASSWORD_HINT } from '@/services/passwordValidation';
import { colors, radius, spacing, typography } from '@/theme';
import { messageOf } from '@/utils/error';

interface RegisterForm {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const initialForm: RegisterForm = { fullName: '', username: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function RegisterPtScreen() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<RegisterPtResponse | null>(null);
  const submitLock = useRef(false);

  function updateField(field: keyof RegisterForm, value: string) {
    if (submitLock.current) return;
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError(null);
  }

  async function handleSubmit() {
    if (submitLock.current) return;
    const fullName = form.fullName.trim();
    const username = form.username.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (fullName.length < 2) return setError('Vui lòng nhập họ tên từ 2 ký tự.');
    if (username.length < 3) return setError('Tên đăng nhập cần có ít nhất 3 ký tự.');
    if (!isValidPassword(form.password)) return setError(PASSWORD_HINT);
    if (form.password !== form.confirmPassword) return setError('Mật khẩu xác nhận chưa khớp.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Email chưa đúng định dạng.');

    submitLock.current = true;
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const result = await registerPt({
        fullName,
        username,
        password: form.password,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      });
      setCreated(result);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Screen title="Tài khoản đã sẵn sàng">
        <View style={styles.successCard}>
          <View style={styles.successIcon}><Feather name="check" size={28} color={colors.success} /></View>
          <Text style={styles.successTitle}>Chào mừng {created.user.fullName}</Text>
          <Text style={styles.successDescription}>Tài khoản đã được tạo. Bạn có thể đăng nhập để bắt đầu sử dụng.</Text>
          <View style={styles.accountSummary}>
            <Text style={styles.summaryLabel}>Tên đăng nhập</Text>
            <Text selectable style={styles.summaryValue}>{created.user.username}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace({ pathname: '/(auth)/login', params: { username: created.user.username } })}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>Đăng nhập</Text>
            <Feather name="arrow-right" size={18} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Đăng ký tài khoản">
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
        <FormField label="Họ và tên" value={form.fullName} onChangeText={(value) => updateField('fullName', value)} placeholder="Tên của bạn" autoCapitalize="words" returnKeyType="next" maxLength={120} />
        <FormField label="Tên đăng nhập" value={form.username} onChangeText={(value) => updateField('username', value)} placeholder="Từ 3 đến 64 ký tự" autoCapitalize="none" autoCorrect={false} returnKeyType="next" maxLength={64} />
        <FormField label="Email (không bắt buộc)" value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="pt@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" returnKeyType="next" maxLength={254} />
        <FormField label="Số điện thoại (không bắt buộc)" value={form.phone} onChangeText={(value) => updateField('phone', value)} placeholder="Số điện thoại liên hệ" keyboardType="phone-pad" returnKeyType="next" maxLength={32} />
        <FormField label="Mật khẩu" value={form.password} onChangeText={(value) => updateField('password', value)} placeholder="Tối thiểu 8 ký tự" secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} returnKeyType="next" rightAction={<PasswordVisibilityButton visible={showPassword} onPress={() => setShowPassword((visible) => !visible)} label="mật khẩu" />} />
        <Text style={styles.passwordHint}>{PASSWORD_HINT}</Text>
        <FormField label="Xác nhận mật khẩu" value={form.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} placeholder="Nhập lại mật khẩu" secureTextEntry={!showConfirmPassword} autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={() => void handleSubmit()} rightAction={<PasswordVisibilityButton visible={showConfirmPassword} onPress={() => setShowConfirmPassword((visible) => !visible)} label="mật khẩu xác nhận" />} />

        {error ? <View style={styles.errorBox} accessibilityLiveRegion="polite"><Feather name="alert-circle" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}

        <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting, busy: submitting }} disabled={submitting} onPress={() => void handleSubmit()} style={({ pressed }) => [styles.primaryButton, pressed && !submitting && styles.primaryButtonPressed, submitting && styles.buttonDisabled]}>
          {submitting ? <View style={styles.loadingRow}><ActivityIndicator color={colors.textOnPrimary} size="small" /><Text style={styles.primaryButtonText}>Đang tạo tài khoản...</Text></View> : <Text style={styles.primaryButtonText}>Tạo tài khoản</Text>}
        </Pressable>
        <Text style={styles.footerNote}>Đã có tài khoản? <Text accessibilityRole="link" onPress={() => router.replace('/(auth)/login')} style={styles.inlineLink}>Đăng nhập</Text></Text>
      </View>
    </Screen>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  maxLength?: number;
  rightAction?: React.ReactNode;
}

function FormField({ label, rightAction, ...inputProps }: FormFieldProps) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.inputWrap}><TextInput {...inputProps} accessibilityLabel={label} placeholderTextColor={colors.textMuted} style={styles.input} />{rightAction}</View></View>;
}

function PasswordVisibilityButton({ visible, onPress, label }: { visible: boolean; onPress: () => void; label: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Ẩn' : 'Hiện'} ${label}`} accessibilityState={{ selected: visible }} onPress={onPress} style={styles.visibilityButton}><Feather name={visible ? 'eye-off' : 'eye'} size={19} color={colors.textMuted} /></Pressable>;
}

const styles = StyleSheet.create({
  formCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  field: { marginTop: spacing.sm }, fieldLabel: { ...typography.caption, color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
  inputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingRight: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, minHeight: 48, paddingVertical: spacing.sm, color: colors.text, ...typography.body },
  visibilityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  passwordHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginTop: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xl, borderRadius: radius.md, backgroundColor: colors.primary },
  primaryButtonPressed: { backgroundColor: colors.primaryDark, opacity: 0.92 }, buttonDisabled: { opacity: 0.65 }, primaryButtonText: { ...typography.bodyMedium, color: colors.textOnPrimary },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, footerNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  inlineLink: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  successCard: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  successIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: '#DCFCE7', marginBottom: spacing.lg },
  successTitle: { ...typography.title, color: colors.text, textAlign: 'center' }, successDescription: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  accountSummary: { width: '100%', padding: spacing.md, marginTop: spacing.xl, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  summaryLabel: { ...typography.caption, color: colors.textMuted }, summaryValue: { ...typography.heading, color: colors.text, marginTop: spacing.xs },
});
