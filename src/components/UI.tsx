import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export function Card({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'primary' }) {
  return <View style={[styles.card, tone === 'primary' ? styles.primaryCard : undefined]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MetricCard({ label, value, hint, accent = colors.secondary }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricDot, { backgroundColor: accent }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const toneStyle = tone === 'success' ? styles.successPill : tone === 'warning' ? styles.warningPill : tone === 'danger' ? styles.dangerPill : styles.neutralPill;
  const textStyle = tone === 'success' ? styles.successText : tone === 'warning' ? styles.warningText : tone === 'danger' ? styles.dangerText : styles.neutralText;
  return <Text style={[styles.pill, toneStyle, textStyle]}>{label}</Text>;
}

export function Row({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelWrap}>
        {icon ? <Text style={styles.rowIcon}>{icon}</Text> : null}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.primaryButton, (disabled || loading) && styles.disabledButton, pressed && styles.pressedButton]}>
      <Text style={styles.primaryButtonText}>{loading ? 'Đang xử lý…' : label}</Text>
    </Pressable>
  );
}

export function LoadingState({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return <View style={styles.state}><Text style={styles.stateText}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? <PrimaryButton label="Thử lại" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.stateText}>{message}</Text></View>;
}

export function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={[styles.tabIcon, { color }]}>{glyph}</Text>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  primaryCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.primary },
  action: { ...typography.caption, color: colors.secondary },
  metricCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, minHeight: 108 },
  metricDot: { width: 8, height: 8, borderRadius: radius.pill, marginBottom: spacing.sm },
  metricValue: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: colors.primary },
  metricLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  metricHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, overflow: 'hidden', ...typography.caption },
  neutralPill: { backgroundColor: colors.surfaceMuted },
  successPill: { backgroundColor: '#E3F6EC' },
  warningPill: { backgroundColor: '#FFF4D6' },
  dangerPill: { backgroundColor: '#FDE8E8' },
  neutralText: { color: colors.textMuted },
  successText: { color: colors.success },
  warningText: { color: colors.warning },
  dangerText: { color: colors.danger },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  rowLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowIcon: { fontSize: 17, width: 22, textAlign: 'center' },
  rowLabel: { ...typography.body, color: colors.textMuted },
  rowValue: { flex: 1, ...typography.bodyMedium, color: colors.text, textAlign: 'right' },
  primaryButton: { backgroundColor: colors.accent, minHeight: 50, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  primaryButtonText: { ...typography.bodyMedium, color: colors.textOnPrimary },
  disabledButton: { opacity: 0.55 },
  pressedButton: { opacity: 0.85 },
  state: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 180 },
  stateText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  errorTitle: { ...typography.heading, color: colors.danger, marginBottom: spacing.xs },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' },
  tabIcon: { fontSize: 20, lineHeight: 24 },
});
