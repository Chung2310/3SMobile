import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';

export const PRIVACY_POLICY_URL = 'https://3s.igentechnology.net/privacy-policy';

export function PrivacyPolicyLink() {
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const openPolicy = async () => {
    setOpening(true);
    setFailed(false);
    try { await Linking.openURL(PRIVACY_POLICY_URL); }
    catch { setFailed(true); }
    finally { setOpening(false); }
  };
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="link" accessibilityLabel="Chính sách bảo mật"
        accessibilityHint="Mở trang chính sách bảo mật trên trình duyệt"
        accessibilityState={{ disabled: opening, busy: opening }} disabled={opening}
        onPress={() => void openPolicy()}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        {opening ? <ActivityIndicator color={colors.primary} /> : <Feather name="shield" size={20} color={colors.primary} />}
        <Text style={styles.label}>{opening ? 'Đang mở chính sách…' : failed ? 'Thử lại: Chính sách bảo mật' : 'Chính sách bảo mật'}</Text>
        <Feather name="external-link" size={16} color={colors.primary} />
      </Pressable>
      {failed && <View style={styles.error} accessibilityLiveRegion="polite">
        <Feather name="alert-circle" size={16} color={colors.danger} />
        <Text style={styles.errorText}>Không thể mở trình duyệt. Vui lòng thử lại.</Text>
      </View>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { marginVertical: spacing.sm },
  link: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.surfaceIce, opacity: 0.8 },
  label: { ...typography.bodyMedium, color: colors.primary, flex: 1 },
  error: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
});
