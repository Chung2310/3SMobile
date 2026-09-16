import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type AlertModalType = 'success' | 'warning' | 'error' | 'info';

export interface AppAlertModalProps {
  visible: boolean;
  type?: AlertModalType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function AppAlertModal({
  visible,
  type = 'info',
  title,
  message,
  confirmLabel = 'Đã hiểu',
  cancelLabel,
  onConfirm,
  onCancel,
}: AppAlertModalProps) {
  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'check-circle' as const, color: '#16A34A', bg: '#DCFCE7' };
      case 'warning':
        return { name: 'alert-triangle' as const, color: '#D97706', bg: '#FEF3C7' };
      case 'error':
        return { name: 'alert-circle' as const, color: '#DC2626', bg: '#FEE2E2' };
      default:
        return { name: 'info' as const, color: '#0284C7', bg: '#E0F2FE' };
    }
  };

  const iconConfig = getIconConfig();
  const hasCancel = Boolean(cancelLabel && onCancel);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel || onConfirm}>
      <Pressable style={styles.backdrop} onPress={onCancel || onConfirm}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
            <Feather name={iconConfig.name} size={26} color={iconConfig.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionRow}>
            {hasCancel && (
              <Pressable
                style={styles.cancelBtn}
                onPress={onCancel}
                hitSlop={6}
                accessibilityRole="button"
              >
                <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.confirmBtn,
                type === 'error' && styles.confirmBtnDanger,
                !hasCancel && styles.confirmBtnFull,
              ]}
              onPress={onConfirm}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmBtnDanger: {
    backgroundColor: '#EF4444',
  },
  confirmBtnFull: {
    flex: 1,
    width: '100%',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
