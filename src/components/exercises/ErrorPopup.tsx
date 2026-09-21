import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LibraryIcon } from '@/components/LibraryIcon';
import { colors } from '@/theme';
import { Button, ws } from '@/components/workouts/Controls';

type PopupProps = { message: string; onClose: () => void; onRetry?: () => void };

export function ErrorPopup(props: PopupProps) {
  return <FeedbackPopup {...props} />;
}

export function SuccessPopup(props: Omit<PopupProps, 'onRetry'>) {
  return <FeedbackPopup {...props} success />;
}

function FeedbackPopup({ message, onClose, onRetry, success = false }: {
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  success?: boolean;
}) {
  if (!message) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View accessibilityViewIsModal style={{ maxHeight: '90%', borderRadius: 24, padding: 20, gap: 16, backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <LibraryIcon name={success ? "check-circle" : "alert-circle"} size={24} color={success ? colors.success : colors.danger} />
            <Text style={[ws.cardTitle, { flex: 1 }]}>{success ? 'Thành công' : 'Không thể hoàn tất'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
              <LibraryIcon name="x" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView><Text accessibilityRole="alert" style={ws.text}>{message}</Text></ScrollView>
          {onRetry && <Button label="Thử lại" icon="refresh-cw" onPress={() => { onClose(); onRetry(); }} />}
          <Button secondary={!!onRetry} label="Đóng" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
