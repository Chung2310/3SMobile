import { Alert, Linking, Platform } from 'react-native';

export interface AiDisclosure { code?: string; message?: string; consentVersion?: string }
let dialogQueue: Promise<unknown> = Promise.resolve();

export function confirmAiSharing(disclosure: AiDisclosure): Promise<boolean> {
  const show = () => new Promise<boolean>(resolve => {
    if (disclosure.code !== 'AI_CONSENT_REQUIRED' || !disclosure.message || !disclosure.consentVersion) { resolve(false); return; }
    const message = disclosure.message;
    if (Platform.OS === 'web') { resolve(window.confirm(message)); return; }
    const open = () => Alert.alert('Cho phép chia sẻ dữ liệu với AI?', message, [
      { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Chính sách bảo mật', onPress: () => {
        resolve(false);
        void Linking.openURL('https://3s.igentechnology.net/privacy-policy').catch(() => undefined);
      } },
      { text: 'Đồng ý và tiếp tục', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
    open();
  });
  const result = dialogQueue.then(show, show);
  dialogQueue = result.catch(() => undefined);
  return result;
}
