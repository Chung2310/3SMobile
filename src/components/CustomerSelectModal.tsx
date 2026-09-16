import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile } from '@/types/domain';

export interface CustomerSelectModalProps {
  visible: boolean;
  customers: CustomerProfile[];
  selectedId: string;
  title?: string;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
  onPressAdd?: (currentSearch: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function CustomerSelectModal({
  visible,
  customers,
  selectedId,
  title = 'Chọn học viên',
  placeholder = 'Tìm theo tên hoặc SĐT...',
  allowClear = false,
  clearLabel = 'Tất cả học viên',
  onPressAdd,
  onClose,
  onSelect,
}: CustomerSelectModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, search]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={placeholder}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {onPressAdd && (
            <Pressable
              style={styles.quickAddRow}
              onPress={() => {
                onClose();
                onPressAdd(search);
              }}
            >
              <Ionicons name="person-add" size={14} color={colors.primary} />
              <Text style={styles.quickAddText}>
                {search.trim()
                  ? `+ Thêm học viên mới: "${search.trim()}"`
                  : '+ Thêm nhanh học viên mới'}
              </Text>
            </Pressable>
          )}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {allowClear && (
              <Pressable
                style={[
                  styles.item,
                  !selectedId && styles.itemSelected,
                ]}
                onPress={() => handleSelect('')}
              >
                <Text
                  style={[
                    styles.itemName,
                    !selectedId && styles.itemNameSelected,
                  ]}
                >
                  {clearLabel}
                </Text>
                {!selectedId && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            )}

            {filtered.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Không tìm thấy học viên.</Text>
                {onPressAdd && (
                  <Pressable
                    style={styles.emptyAddBtn}
                    onPress={() => {
                      onClose();
                      onPressAdd(search);
                    }}
                  >
                    <Ionicons name="person-add" size={13} color="#FFFFFF" />
                    <Text style={styles.emptyAddBtnText}>
                      {search.trim()
                        ? `Tạo mới "${search.trim()}"`
                        : 'Tạo mới học viên'}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              filtered.map((item) => {
                const isSelected = item._id === selectedId;
                return (
                  <Pressable
                    key={item._id}
                    style={[
                      styles.item,
                      isSelected && styles.itemSelected,
                    ]}
                    onPress={() => handleSelect(item._id)}
                  >
                    <View style={styles.itemLeft}>
                      <Text
                        style={[
                          styles.itemName,
                          isSelected && styles.itemNameSelected,
                        ]}
                      >
                        {item.fullName}
                      </Text>
                      <Text style={styles.itemPhone}>
                        {item.phone || 'Chưa có SĐT'}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '75%',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.primaryNavy,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: colors.text,
  },
  list: {
    maxHeight: 280,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    borderRadius: radius.sm,
  },
  itemSelected: {
    backgroundColor: colors.surfaceIce,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.text,
  },
  itemNameSelected: {
    color: colors.primary,
  },
  itemPhone: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: 10,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: spacing.xs,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
