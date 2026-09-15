import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PrimaryButton } from '@/components/UI';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(username, password);
      router.replace('/(app)/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Đăng nhập không thành công.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <View style={styles.logoMark}><Text style={styles.logoText}>3S</Text></View>
          <Text style={styles.brand}>3S GYM</Text>
          <Text style={styles.tagline}>Your progress. Your journey.</Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình của bạn.</Text>

          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Nhập tên đăng nhập"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={!submitting}
            returnKeyType="next"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Nhập mật khẩu"
              placeholderTextColor={colors.textMuted}
              style={styles.passwordInput}
              editable={!submitting}
              returnKeyType="go"
              onSubmitEditing={() => void handleSubmit()}
            />
            <Pressable onPress={() => setShowPassword((current) => !current)} hitSlop={10} style={styles.showButton}>
              <Text style={styles.showText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Đăng nhập" onPress={() => void handleSubmit()} loading={submitting} />
          <Text style={styles.help}>Tài khoản customer được cấp bởi phòng gym.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  keyboard: { flex: 1 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  logoMark: { width: 74, height: 74, borderRadius: 22, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-6deg' }] },
  logoText: { fontSize: 26, fontWeight: '900', color: colors.textOnPrimary, transform: [{ rotate: '6deg' }] },
  brand: { ...typography.display, color: colors.textOnPrimary, letterSpacing: 2, marginTop: spacing.md },
  tagline: { ...typography.body, color: '#B9DDF0', marginTop: spacing.xs },
  formCard: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, paddingBottom: spacing.xxl },
  title: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { ...typography.bodyMedium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, ...typography.body },
  passwordWrap: { height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, height: 50, paddingHorizontal: spacing.md, color: colors.text, ...typography.body },
  showButton: { paddingHorizontal: spacing.md },
  showText: { ...typography.caption, color: colors.secondary },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.md },
  help: { ...typography.caption, textAlign: 'center', color: colors.textMuted, marginTop: spacing.lg },
});
