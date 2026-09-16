import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { CustomerStatusFilter } from './types';

interface CustomerStatusFilterSheetProps {
  visible: boolean;
  statusFilter: CustomerStatusFilter;
  totalCount: number;
  activeCount: number;
  leadCount: number;
  inactiveCount: number;
  onSelect: (status: CustomerStatusFilter) => void;
  onClose: () => void;
}

export function CustomerStatusFilterSheet({
  visible,
  statusFilter,
  totalCount,
  activeCount,
  leadCount,
  inactiveCount,
  onSelect,
  onClose,
}: CustomerStatusFilterSheetProps) {
  const options: Array<{
    id: CustomerStatusFilter;
    label: string;
    count: number;
    dotColor: string;
  }> = [
    { id: 'ALL', label: 'Tất cả', count: totalCount, dotColor: '#00C2FF' },
    { id: 'ACTIVE', label: 'Đang hoạt động', count: activeCount, dotColor: '#22C55E' },
    { id: 'LEAD', label: 'Tiềm năng', count: leadCount, dotColor: '#F59E0B' },
    { id: 'INACTIVE', label: 'Ngừng hoạt động', count: inactiveCount, dotColor: '#6B7280' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Trạng thái khách hàng</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.sheetCloseBtn, pressed && { opacity: 0.7 }]}
            >
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.sheetOptionsList}>
            {options.map((opt) => {
              const active = statusFilter === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    styles.sheetOptionItem,
                    active && styles.sheetOptionItemActive,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    onSelect(opt.id);
                    onClose();
                  }}
                >
                  <View style={styles.sheetOptionLeft}>
                    <View style={[styles.sheetDot, { backgroundColor: opt.dotColor }]} />
                    <Text
                      style={[
                        styles.sheetOptionText,
                        active && styles.sheetOptionTextActive,
                      ]}
                    >
                      {opt.label} ({opt.count})
                    </Text>
                  </View>
                  {active ? (
                    <Feather name="check" size={18} color="#00C2FF" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionsList: {
    gap: 4,
  },
  sheetOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  sheetOptionItemActive: {
    backgroundColor: '#F0F9FF',
  },
  sheetOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  sheetOptionTextActive: {
    color: '#0098CC',
    fontWeight: '700',
  },
});
