import type { PropsWithChildren, ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { Check, ChevronDown, X, CircleAlert, Inbox } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/theme';

export function Label({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  return <Text numberOfLines={3} ellipsizeMode="tail" style={[ui.text, muted && ui.muted]}>{children}</Text>;
}
export function Button({ label, onPress, busy = false, disabled = false, secondary = false, danger = false }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, danger && { backgroundColor: colors.danger }, pressed && { opacity: 0.8 }, (disabled || busy) && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color={secondary ? colors.primary : colors.textOnPrimary} /> : <Text numberOfLines={2} ellipsizeMode="tail" style={[ui.buttonText, secondary && { color: colors.primary }]}>{label}</Text>}</Pressable>;
}
export function Notice({ message, retry, empty = false }: { message: string; retry?: () => void; empty?: boolean }) {
  const Icon = empty ? Inbox : CircleAlert;
  return <View style={ui.card}><Icon size={28} color={empty ? colors.textMuted : colors.danger} /><Label>{empty ? 'Chưa có dữ liệu' : 'Không thể hoàn tất'}</Label><Label muted>{message}</Label>{retry && <Button secondary label={empty ? 'Tải lại' : 'Thử lại'} onPress={retry} />}</View>;
}
export function Sheet({ title, onClose, children, footer }: PropsWithChildren<{ title: string; onClose: () => void; footer?: ReactNode }>) {
  const insets = useSafeAreaInsets();
  return <Modal transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView style={ui.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Pressable accessibilityLabel="Đóng" style={StyleSheet.absoluteFill} onPress={onClose} /><View style={[ui.sheet, { paddingBottom: Math.max(insets.bottom, 20), maxHeight: '92%' }]}><View style={ui.handle} /><View style={ui.row}><Text numberOfLines={2} ellipsizeMode="tail" style={[ui.heading, ui.flex]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng" style={ui.iconButton} onPress={onClose}><X color={colors.text} size={24} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.gap}>{children}</ScrollView>{footer}</View></KeyboardAvoidingView></Modal>;
}
export interface Option { value: string; label: string }
export function Select({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  return <View style={ui.gap}><Label>{label}</Label><Pressable accessibilityRole="button" onPress={() => { setQuery(''); setOpen(true); }} style={[ui.input, ui.row]}><View style={ui.flex}><Label>{options.find(o => o.value === value)?.label || 'Chọn…'}</Label></View><ChevronDown color={colors.primary} size={20} /></Pressable>{open && <Sheet title={label} onClose={() => setOpen(false)}>{options.length > 8 && <TextInput accessibilityLabel="Tìm lựa chọn" placeholder="Tìm nhanh…" style={ui.input} value={query} onChangeText={setQuery} />}{options.filter(o => o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(o => <Pressable accessibilityRole="button" accessibilityState={{ selected: value === o.value }} key={o.value} style={[ui.row, ui.option]} onPress={() => { onChange(o.value); setOpen(false); }}><View style={ui.flex}><Label>{o.label}</Label></View>{value === o.value && <Check size={20} color={colors.primary} />}</Pressable>)}</Sheet>}</View>;
}
export const ui = StyleSheet.create({
  text: { ...typography.body, fontFamily: 'Inter_400Regular', color: colors.text, fontSize: 13.5, lineHeight: 19 },
  muted: { color: colors.textMuted },
  heading: { ...typography.heading, fontFamily: 'Inter_700Bold', color: colors.text, fontSize: 15, lineHeight: 20 },
  title: { ...typography.display, fontFamily: 'Inter_800ExtraBold', color: colors.text, fontSize: 17, lineHeight: 22 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  gap: { gap: 10 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  buttonText: {
    ...typography.bodyMedium,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
});
