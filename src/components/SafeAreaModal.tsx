import { Modal as NativeModal, Platform, StyleSheet, type ModalProps } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

/** A modal has its own native window, outside the app navigator's safe area. */
export function SafeAreaModal({ children, ...props }: ModalProps) {
  if (Platform.OS !== 'android') {
    return <NativeModal {...props}>{children}</NativeModal>;
  }

  return (
    <NativeModal {...props} statusBarTranslucent navigationBarTranslucent>
      {/* Measure this dialog, never reuse the inset already consumed by the
          screen underneath. Native padding also protects absolute footers. */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.fill} edges={['top', 'bottom', 'left', 'right']}>
          {/* Descendants measure the remaining safe bounds rather than adding
              the same system padding twice. Nested dialogs measure afresh. */}
          <SafeAreaProvider>{children}</SafeAreaProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
