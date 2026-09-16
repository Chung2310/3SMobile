import { Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContextIcon } from '@/components/LibraryIcon';
import { colors } from '@/theme';
import { Button, ws } from '../workouts/Controls';
export function ProgressNotice({ message, error = false, onClose }: { message: string; error?: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return <Modal visible={!!message} transparent animationType="fade" onRequestClose={onClose}><View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24), backgroundColor: 'rgba(0,0,0,0.5)' }}><View accessibilityViewIsModal style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 24, gap: 16, maxHeight: '90%' }}><ContextIcon name={error ? 'x-circle' : 'check-circle'} size={32} color={error ? colors.danger : colors.success} /><Text style={ws.title}>{error ? 'Không thể thực hiện' : 'Thành công'}</Text><ScrollView style={{ flexShrink: 1 }}><Text accessibilityRole="alert" style={ws.text}>{message}</Text></ScrollView><Button label="Đã hiểu" onPress={onClose} /></View></View></Modal>;
}
