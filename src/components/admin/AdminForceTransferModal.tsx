import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api } from '@/services/api/client';
import { display, recordId, type AdminRecord } from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

interface AdminForceTransferModalProps {
  visible: boolean;
  customer: AdminRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminForceTransferModal({
  visible,
  customer,
  onClose,
  onSuccess,
}: AdminForceTransferModalProps) {
  if (!visible || !customer) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <AdminForceTransferModalInner
        customer={customer}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}

function AdminForceTransferModalInner({
  customer,
  onClose,
  onSuccess,
}: {
  customer: AdminRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [pts, setPts] = useState<AdminRecord[]>([]);
  const [loadingPts, setLoadingPts] = useState(true);
  const [toPtId, setToPtId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ptPickerOpen, setPtPickerOpen] = useState(false);
  const [ptSearch, setPtSearch] = useState('');
  const lock = useRef(false);

  // Fetch active PT list
  useEffect(() => {
    let mounted = true;
    api.getPage<AdminRecord>('/api/users?role=PT&status=ACTIVE&limit=100')
      .then((res) => {
        if (!mounted) return;
        setPts(res.data || []);
      })
      .catch(() => {
        // bỏ qua lỗi
      })
      .finally(() => {
        if (mounted) setLoadingPts(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const currentPtId = () => {
    if (!customer.assignedPtId) return '';
    if (typeof customer.assignedPtId === 'object') {
      return recordId(customer.assignedPtId as AdminRecord);
    }
    return String(customer.assignedPtId);
  };

  const currentPtName = () => {
    if (!customer.assignedPtId) return 'Chưa phân công';
    if (typeof customer.assignedPtId === 'object') {
      const p = customer.assignedPtId as AdminRecord;
      return String(p.fullName || p.username || 'HLV');
    }
    const found = pts.find((p) => recordId(p) === customer.assignedPtId);
    if (found) return String(found.fullName || found.username);
    return String(customer.assignedPtId);
  };

  const selectedPtName = () => {
    if (!toPtId) return 'Chưa chọn HLV';
    const found = pts.find((p) => recordId(p) === toPtId);
    if (found) return String(found.fullName || found.username);
    return toPtId;
  };

  const filteredPts = pts.filter((p) => {
    const q = ptSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.fullName || '').toLowerCase().includes(q) ||
      String(p.username || '').toLowerCase().includes(q) ||
      String(p.phone || '').includes(q)
    );
  });

  const handleSubmit = async () => {
    if (lock.current || busy) return;
    setError('');

    if (!toPtId) {
      setError('Vui lòng chọn HLV tiếp nhận mới.');
      return;
    }

    if (toPtId === currentPtId()) {
      setError('HLV mới phải khác HLV đang phụ trách hiện tại.');
      return;
    }

    if (!reason.trim()) {
      setError('Vui lòng nhập lý do điều chuyển.');
      return;
    }

    try {
      lock.current = true;
      setBusy(true);
      await api.post('/api/transfers/admin-force', {
        customerId: recordId(customer),
        toPtId,
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (!busy) onClose();
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Chuyển HLV phụ trách</Text>
              <Text style={styles.sheetSub}>
                Học viên: {display(customer)} ({String(customer.phone || '')})
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (!busy) onClose();
              }}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              hitSlop={8}
            >
              <Text style={styles.closeBtnText}>Đóng</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.bodyContent}
          >
            {error ? (
              <View style={styles.errorNotice}>
                <Text style={styles.errorNoticeText}>{error}</Text>
              </View>
            ) : null}

            {/* Current PT Card */}
            <View style={styles.ptCompareCard}>
              <View style={styles.ptCompareCol}>
                <Text style={styles.ptCompareLabel}>HLV hiện tại</Text>
                <View style={styles.ptCurrentBadge}>
                  <Text style={styles.ptCurrentText} numberOfLines={1}>
                    {currentPtName()}
                  </Text>
                </View>
              </View>

              <View style={styles.ptCompareArrow}>
                <Feather name="arrow-right" size={18} color={colors.primary} />
              </View>

              <View style={styles.ptCompareCol}>
                <Text style={styles.ptCompareLabel}>
                  HLV tiếp nhận mới <Text style={styles.requiredMark}>*</Text>
                </Text>
                <Pressable
                  onPress={() => setPtPickerOpen(true)}
                  style={({ pressed }) => [
                    styles.ptCurrentBadge,
                    styles.ptTargetBadge,
                    toPtId ? styles.ptTargetActive : styles.ptTargetEmpty,
                    pressed && styles.ptTargetPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Chọn HLV tiếp nhận mới"
                >
                  <Text
                    style={[
                      styles.ptCurrentText,
                      toPtId
                        ? { color: colors.primary, fontWeight: '700' }
                        : { color: '#94A3B8' },
                    ]}
                    numberOfLines={1}
                  >
                    {loadingPts ? 'Đang tải…' : (toPtId ? selectedPtName() : 'Chọn HLV')}
                  </Text>
                  <Feather
                    name="chevron-down"
                    size={16}
                    color={toPtId ? colors.primary : '#94A3B8'}
                  />
                </Pressable>
              </View>
            </View>

            {/* Reason Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Lý do điều chuyển <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Nhập lý do điều chuyển (ví dụ: HLV cũ chuyển ca làm việc, học viên yêu cầu đổi...)"
                placeholderTextColor="#94A3B8"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.sheetFooter}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSubmit()}
              disabled={busy}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Xác nhận điều chuyển</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* PT Picker Sub-Modal */}
      {ptPickerOpen && (
        <Modal
          visible={ptPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPtPickerOpen(false)}
        >
          <View style={styles.subModalOverlay}>
            <View style={styles.ptPickerCard}>
              <View style={styles.ptPickerHeader}>
                <Text style={styles.ptPickerTitle}>Chọn HLV tiếp nhận</Text>
                <Pressable onPress={() => setPtPickerOpen(false)} hitSlop={8}>
                  <Text style={styles.ptPickerCloseText}>Đóng</Text>
                </Pressable>
              </View>

              <View style={styles.searchBox}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm theo tên HLV..."
                  placeholderTextColor="#94A3B8"
                  value={ptSearch}
                  onChangeText={setPtSearch}
                />
                {ptSearch ? (
                  <Pressable onPress={() => setPtSearch('')} hitSlop={6}>
                    <Text style={styles.clearSearchText}>Xóa</Text>
                  </Pressable>
                ) : null}
              </View>

              <ScrollView style={styles.ptListScroll} showsVerticalScrollIndicator={false}>
                {filteredPts.map((pt) => {
                  const pId = recordId(pt);
                  const isCurrent = pId === currentPtId();
                  const isSelected = pId === toPtId;

                  return (
                    <Pressable
                      key={pId}
                      disabled={isCurrent}
                      onPress={() => {
                        setToPtId(pId);
                        setPtPickerOpen(false);
                      }}
                      style={[
                        styles.ptItem,
                        isCurrent && styles.ptItemDisabled,
                        isSelected && styles.ptItemSelected,
                      ]}
                    >
                      <View style={styles.ptItemAvatar}>
                        <Text style={styles.ptItemAvatarText}>
                          {String(pt.fullName || pt.username || 'PT').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.ptItemInfo}>
                        <Text
                          style={[
                            styles.ptItemName,
                            isCurrent && { color: '#94A3B8' },
                          ]}
                        >
                          {String(pt.fullName || pt.username)}
                        </Text>
                        <Text style={styles.ptItemMeta}>
                          {isCurrent ? '(HLV hiện tại)' : `@${String(pt.username || '')} · ${String(pt.phone || '')}`}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.ptSelectedBadge}>
                          <Text style={styles.ptSelectedBadgeText}>Đã chọn</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    maxHeight: '90%',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sheetSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  bodyContent: {
    paddingVertical: 16,
    gap: 14,
  },
  errorNotice: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
  },
  errorNoticeText: {
    fontSize: 13,
    color: '#EF4444',
  },
  ptCompareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  ptCompareCol: {
    flex: 1,
    gap: 6,
  },
  ptCompareLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  ptCurrentBadge: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ptTargetBadge: {
    justifyContent: 'space-between',
    gap: 6,
  },
  ptTargetEmpty: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  ptTargetActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  ptTargetPressed: {
    opacity: 0.75,
    backgroundColor: '#F1F5F9',
  },
  ptCurrentText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  ptCompareArrow: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  requiredMark: {
    color: '#EF4444',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  noticeBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
  },
  noticeBoxText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 17,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  ptPickerCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  ptPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ptPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  ptPickerCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  clearSearchText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  ptListScroll: {
    maxHeight: 320,
  },
  ptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ptItemDisabled: {
    opacity: 0.45,
    backgroundColor: '#F8FAFC',
  },
  ptItemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  ptItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ptItemAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  ptItemInfo: {
    flex: 1,
  },
  ptItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ptItemMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  ptSelectedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ptSelectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
