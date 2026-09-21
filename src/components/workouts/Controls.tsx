import { ContextIcon } from '@/components/LibraryIcon';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

export const ws = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8, marginBottom: 10 },
  hero: { borderColor: colors.primary, borderWidth: 1.5 },
  display: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24, color: colors.text },
  title: { fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 20, color: colors.text },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, lineHeight: 18, color: colors.text },
  text: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 17, color: colors.text },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 11.5, lineHeight: 16, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sub: { backgroundColor: colors.surfaceMuted, padding: 10, borderRadius: 12, gap: 6 },
  input: { minHeight: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 12.5, backgroundColor: colors.surface },
  button: { minHeight: 36, borderRadius: 10, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  badge: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 15, color: colors.primaryDark },
  roundAction: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  thumbnail: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surfaceMuted },
});
export function Button({ label, onPress, secondary = false, busy = false, disabled = false, icon, destructive = false }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean; icon?: keyof typeof Feather.glyphMap; destructive?: boolean }) {
  const foreground = secondary ? destructive ? colors.danger : colors.text : '#fff';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: busy || disabled, busy }} disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [ws.button, secondary && ws.secondary, destructive && !secondary && { backgroundColor: colors.danger }, { opacity: busy || disabled ? 0.5 : pressed ? 0.8 : 1 }, pressed && !secondary && !destructive && { backgroundColor: colors.primaryDark }]}>
    {busy ? <ActivityIndicator size="small" color={foreground} /> : <>{icon && <ContextIcon name={icon} size={15} color={foreground} />}<Text numberOfLines={2} ellipsizeMode="tail" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, lineHeight: 17, color: foreground, flexShrink: 1 }}>{label}</Text></>}
  </Pressable>;
}
export function Field({ label, value, onChange, numeric = false, multiline = false, error, placeholder }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean; multiline?: boolean; error?: string; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 4 }}><Text style={ws.muted}>{label}</Text><View style={{ justifyContent: 'center' }}><TextInput accessibilityLabel={label} style={[ws.input, focused && { borderColor: colors.primary, borderWidth: 1.5 }, error && { borderColor: colors.danger, paddingRight: 38 }, multiline && { minHeight: 68, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} keyboardType={numeric ? 'decimal-pad' : 'default'} multiline={multiline} placeholder={placeholder} placeholderTextColor={colors.textMuted} />{error && <ContextIcon name="alert-circle" size={18} color={colors.danger} style={{ position: 'absolute', right: 10 }} />}</View>{error && <Text accessibilityRole="alert" numberOfLines={2} ellipsizeMode="tail" style={[ws.muted, { color: colors.danger, fontSize: 11 }]}>{error}</Text>}</View>;
}
export function Notice({ text, error = false, tone = 'info' }: { text: string; error?: boolean; tone?: 'info' | 'success' | 'warning' }) {
  const color = error ? colors.danger : tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : '#3B82F6';
  const icon = error ? 'x-circle' : tone === 'success' ? 'check-circle' : tone === 'warning' ? 'alert-triangle' : 'info';
  return <View accessibilityRole="alert" style={[ws.sub, ws.row, { flexWrap: 'nowrap', alignItems: 'flex-start', borderWidth: 1, borderColor: `${color}40`, marginBottom: 8, padding: 8, gap: 6 }]}><ContextIcon name={icon} size={16} color={color} /><Text numberOfLines={6} ellipsizeMode="tail" style={[ws.text, { flex: 1, fontSize: 11.5, lineHeight: 16 }]}>{text}</Text></View>;
}
export function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return <View style={[ws.card, { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, gap: 6 }]}><ContextIcon name="book-open" size={22} color={colors.primary} /><Text style={[{ fontFamily: 'Inter_700Bold', fontSize: 13.5, lineHeight: 18, color: colors.text, textAlign: 'center' }]}>{title}</Text><Text style={[{ fontFamily: 'Inter_400Regular', fontSize: 11.5, lineHeight: 16, color: colors.textMuted, textAlign: 'center', maxWidth: '85%' }]}>{text}</Text><Button label={action} onPress={onAction} /></View>;
}
export function Busy() {
  const [opacity] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true })]));
    animation.start(); return () => animation.stop();
  }, [opacity]);
  return <View accessibilityLabel="Đang tải dữ liệu" accessibilityState={{ busy: true }} style={{ gap: 12, paddingVertical: 12 }}><View style={ws.row}><ActivityIndicator size="small" color={colors.primary} /><Text style={ws.muted}>Đang tải dữ liệu</Text></View>{[0, 1].map((key) => <View key={key} style={ws.card}><Animated.View style={{ opacity, gap: 10 }}><View style={{ width: '40%', height: 16, backgroundColor: colors.border, borderRadius: 8 }} /><View style={{ height: 26, backgroundColor: colors.border, borderRadius: 8 }} /><View style={{ height: 48, backgroundColor: colors.surfaceMuted, borderRadius: 10 }} /></Animated.View></View>)}</View>;
}
export function Sheet({ title, children, onClose, locked = false, footer }: { title: string; children: ReactNode; onClose: () => void; locked?: boolean; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={() => !locked && onClose()}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 24) : 24 }}>
      <Pressable accessibilityLabel="Đóng" onPress={() => { Keyboard.dismiss(); if (!locked) onClose(); }} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ maxHeight: '100%', backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 14, paddingBottom: Math.max(insets.bottom, 20) }}>
        <View style={{ width: 32, height: 4, backgroundColor: colors.border, borderRadius: 4, alignSelf: 'center', marginBottom: 8 }} />
        <View style={[ws.row, { flexWrap: 'nowrap', marginBottom: 10 }]}><Text numberOfLines={2} ellipsizeMode="tail" style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 20, color: colors.text }}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng" disabled={locked} onPress={() => { Keyboard.dismiss(); onClose(); }} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}><ContextIcon name="x" size={18} color={colors.text} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={true} style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>{children}</ScrollView>
        {footer && <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border }}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
export function Picker({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const entries = Object.entries(options);
  const filtered = entries.filter(([, text]) => text.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  return <><Button secondary label={`${label}: ${options[value] || 'Chọn'}`} onPress={() => { setSearch(''); setOpen(true); }} icon="chevron-down" />{open && <Sheet title={label} onClose={() => setOpen(false)}>
    {entries.length > 8 && <Field label="Tìm nhanh" placeholder="Nhập từ khóa" value={search} onChange={setSearch} />}
    {filtered.map(([key, text]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: key === value }} onPress={() => { onChange(key); setOpen(false); }} style={({ pressed }) => ({ minHeight: 38, padding: 8, borderRadius: 10, backgroundColor: pressed || key === value ? colors.surfaceMuted : colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 })}><Text numberOfLines={3} ellipsizeMode="tail" style={[ws.text, { flex: 1 }]}>{text}</Text>{key === value && <ContextIcon name="check" size={18} color={colors.primary} />}</Pressable>)}
    {!filtered.length && <Notice text="Không có lựa chọn phù hợp. Hãy thử từ khóa khác." />}
  </Sheet>}</>;
}
export function Segments({ value, options, onChange }: { value: string; options: Record<string, string>; onChange: (value: string) => void }) {
  return <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16 }}>{Object.entries(options).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: value === key }} onPress={() => onChange(key)} style={{ flex: 1, minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' }}><Text numberOfLines={2} ellipsizeMode="tail" style={[ws.badge, { textAlign: 'center', color: key === value ? colors.text : colors.textMuted }]}>{label}</Text>{key === value && <View style={{ position: 'absolute', bottom: 0, left: 12, right: 12, height: 3, borderRadius: 4, backgroundColor: colors.primary }} />}</Pressable>)}</View>;
}
