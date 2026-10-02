import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { registerCenter, type RegisterCenterResponse } from '@/services/centerRegistration';
import { isValidPassword, PASSWORD_HINT } from '@/services/passwordValidation';
import { colors, radius, spacing, typography } from '@/theme';
import { messageOf } from '@/utils/error';

interface RegisterForm {
  centerName: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const initialForm: RegisterForm = {
  centerName: '',
  fullName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterCenterScreen() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<RegisterCenterResponse | null>(null);
  const submitLock = useRef(false);

  function updateField(field: keyof RegisterForm, value: string) {
    if (submitLock.current) return;
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError(null);
  }

  async function handleSubmit() {
    if (submitLock.current) return;
    const centerName = form.centerName.trim();
    const fullName = form.fullName.trim();
    const username = form.username.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (centerName.length < 2) return setError('Tên trung tâm cần có ít nhất 2 ký tự.');
    if (fullName.length < 2) return setError('Vui lòng nhập họ tên chủ trung tâm.');
    if (username.length < 3) return setError('Tên đăng nhập cần có ít nhất 3 ký tự.');
    if (!isValidPassword(form.password)) return setError(PASSWORD_HINT);
    if (form.password !== form.confirmPassword) return setError('Mật khẩu xác nhận chưa khớp.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Email chưa đúng định dạng.');

    submitLock.current = true;
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      const result = await registerCenter({
        centerName,
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
      <Screen title="Trung tâm đã được tạo" subtitle="Tài khoản Admin đã sẵn sàng">
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Feather name="check" size={28} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Chào mừng {created.center.name}</Text>
          <Text style={styles.successDescription}>
            Trung tâm đã được đăng ký. Dùng tài khoản Admin dưới đây để đăng nhập và tạo tài khoản PT.
          </Text>

          <View style={styles.accountSummary}>
            <Text style={styles.summaryLabel}>Tên đăng nhập Admin</Text>
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
    <Screen title="Đăng ký trung tâm" subtitle="Tạo tài khoản Admin cho phòng gym của bạn">
      <View style={styles.introCard}>
        <View style={styles.introIcon}>
          <Feather name="home" size={21} color={colors.primary} />
        </View>
        <View style={styles.introCopy}>
          <Text style={styles.introTitle}>Dành cho chủ trung tâm</Text>
          <Text style={styles.introDescription}>
            Mỗi trung tâm có dữ liệu riêng. Sau khi đăng ký, Admin có thể tạo tài khoản cho các PT.
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Thông tin trung tâm</Text>
        <FormField
          label="Tên trung tâm"
          value={form.centerName}
          onChangeText={(value) => updateField('centerName', value)}
          placeholder="Ví dụ: Gym Sức Mạnh"
          autoCapitalize="words"
          returnKeyType="next"
          maxLength={120}
        />

        <Text style={[styles.sectionTitle, styles.accountSectionTitle]}>Tài khoản Admin</Text>
        <FormField
          label="Họ và tên"
          value={form.fullName}
          onChangeText={(value) => updateField('fullName', value)}
          placeholder="Tên chủ trung tâm"
          autoCapitalize="words"
          returnKeyType="next"
          maxLength={120}
        />
        <FormField
          label="Tên đăng nhập"
          value={form.username}
          onChangeText={(value) => updateField('username', value)}
          placeholder="Từ 3 đến 64 ký tự"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          maxLength={64}
        />
        <FormField
          label="Email (không bắt buộc)"
          value={form.email}
          onChangeText={(value) => updateField('email', value)}
          placeholder="admin@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          maxLength={254}
        />
        <FormField
          label="Số điện thoại (không bắt buộc)"
          value={form.phone}
          onChangeText={(value) => updateField('phone', value)}
          placeholder="Số điện thoại liên hệ"
          keyboardType="phone-pad"
          returnKeyType="next"
          maxLength={32}
        />
        <FormField
          label="Mật khẩu"
          value={form.password}
          onChangeText={(value) => updateField('password', value)}
          placeholder="Tối thiểu 8 ký tự"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          rightAction={(
            <PasswordVisibilityButton
              visible={showPassword}
              onPress={() => setShowPassword((visible) => !visible)}
              label="mật khẩu"
            />
          )}
        />
        <Text style={styles.passwordHint}>{PASSWORD_HINT}</Text>
        <FormField
          label="Xác nhận mật khẩu"
          value={form.confirmPassword}
          onChangeText={(value) => updateField('confirmPassword', value)}
          placeholder="Nhập lại mật khẩu"
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
          rightAction={(
            <PasswordVisibilityButton
              visible={showConfirmPassword}
              onPress={() => setShowConfirmPassword((visible) => !visible)}
              label="mật khẩu xác nhận"
            />
          )}
        />

        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Feather name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting, busy: submitting }}
          disabled={submitting}
          onPress={() => void handleSubmit()}
          style={({ pressed }) => [styles.primaryButton, pressed && !submitting && styles.primaryButtonPressed, submitting && styles.buttonDisabled]}
        >
          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
              <Text style={styles.primaryButtonText}>Đang tạo trung tâm...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Tạo tài khoản Admin</Text>
          )}
        </Pressable>

        <Text style={styles.footerNote}>
          Đã có tài khoản?{' '}
          <Text accessibilityRole="link" onPress={() => router.replace('/(auth)/login')} style={styles.inlineLink}>
            Đăng nhập
          </Text>
        </Text>
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
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {rightAction}
      </View>
    </View>
  );
}

function PasswordVisibilityButton({ visible, onPress, label }: { visible: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${visible ? 'Ẩn' : 'Hiện'} ${label}`}
      accessibilityState={{ selected: visible }}
      onPress={onPress}
      style={styles.visibilityButton}
    >
      <Feather name={visible ? 'eye-off' : 'eye'} size={19} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceIce,
    borderWidth: 1,
    borderColor: '#D5EAF7',
    marginBottom: spacing.md,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  introCopy: { flex: 1 },
  introTitle: { ...typography.bodyMedium, color: colors.text },
  introDescription: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  formCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  accountSectionTitle: { marginTop: spacing.lg },
  field: { marginTop: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
  inputWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, minHeight: 48, paddingVertical: spacing.sm, color: colors.text, ...typography.body },
  visibilityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  passwordHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
  primaryButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonPressed: { backgroundColor: colors.primaryDark, opacity: 0.92 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { ...typography.bodyMedium, color: colors.textOnPrimary },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footerNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  inlineLink: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  successCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  successIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    marginBottom: spacing.lg,
  },
  successTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  successDescription: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  accountSummary: {
    width: '100%',
    padding: spacing.md,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryValue: { ...typography.heading, color: colors.text, marginTop: spacing.xs },
});
