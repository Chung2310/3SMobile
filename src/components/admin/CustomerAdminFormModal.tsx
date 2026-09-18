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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api/client';
import { formPayload, recordId, resources, type AdminRecord } from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

interface CustomerAdminFormModalProps {
  visible: boolean;
  item: AdminRecord | null; // null => Thêm mới, object => Chỉnh sửa
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}

export function CustomerAdminFormModal({
  visible,
  item,
  onClose,
  onSave,
}: CustomerAdminFormModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <CustomerAdminFormModalInner
        item={item}
        onClose={onClose}
        onSave={onSave}
      />
    </Modal>
  );
}

function CustomerAdminFormModalInner({
  item,
  onClose,
  onSave,
}: {
  item: AdminRecord | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const editing = Boolean(item);
  const resource = resources.customers;

  // Form states
  const [fullName, setFullName] = useState(() => String(item?.fullName || ''));
  const [phone, setPhone] = useState(() => String(item?.phone || ''));
  const [email, setEmail] = useState(() => String(item?.email || ''));
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>(() => (item?.gender as any) || 'MALE');
  const [height, setHeight] = useState(() => (item?.height !== undefined && item?.height !== null ? String(item.height) : ''));
  const [initialWeight, setInitialWeight] = useState(() => (item?.initialWeight !== undefined && item?.initialWeight !== null ? String(item.initialWeight) : ''));
  const [initialGoal, setInitialGoal] = useState(() => String(item?.initialGoal || ''));
  const [medicalNotes, setMedicalNotes] = useState(() => String(item?.medicalNotes || ''));
  const [status, setStatus] = useState<'ACTIVE' | 'LEAD' | 'INACTIVE'>(() => (item?.status as any) || 'ACTIVE');

  // Assigned PT
  const initialPtId = () => {
    if (!item?.assignedPtId) return '';
    if (typeof item.assignedPtId === 'object') {
      return recordId(item.assignedPtId as AdminRecord);
    }
    return String(item.assignedPtId);
  };
  const [assignedPtId, setAssignedPtId] = useState(initialPtId);

  // Active PTs list
  const [pts, setPts] = useState<AdminRecord[]>([]);
  const [loadingPts, setLoadingPts] = useState(true);
  const [ptSelectorOpen, setPtSelectorOpen] = useState(false);
  const [ptSearch, setPtSearch] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [discardModal, setDiscardModal] = useState(false);
  const lock = useRef(false);

  // Fetch active PT list
  useEffect(() => {
    let mounted = true;
    api.getPage<AdminRecord>('/api/users?role=PT&status=ACTIVE&limit=100')
      .then((res) => {
        if (!mounted) return;
        const list = res.data || [];
        setPts(list);
        if (!editing && !assignedPtId && list.length > 0) {
          setAssignedPtId(recordId(list[0]));
        }
      })
      .catch(() => {
        // bỏ qua lỗi nếu không tải được PT
      })
      .finally(() => {
        if (mounted) setLoadingPts(false);
      });
    return () => {
      mounted = false;
    };
  }, [editing, assignedPtId]);

  const handleCloseAttempt = () => {
    if (lock.current || busy) return;
    if (dirty) {
      setDiscardModal(true);
    } else {
      onClose();
    }
  };

  const selectedPtName = () => {
    if (!assignedPtId) return 'Chưa chỉ định';
    const found = pts.find((p) => recordId(p) === assignedPtId);
    if (found) return String(found.fullName || found.username);
    if (typeof item?.assignedPtId === 'object' && item.assignedPtId) {
      const p = item.assignedPtId as AdminRecord;
      return String(p.fullName || p.username || assignedPtId);
    }
    return assignedPtId;
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

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên khách hàng.');
      return;
    }
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!editing && !assignedPtId) {
      setError('Vui lòng chọn HLV phụ trách.');
      return;
    }

    const valuesMap: Record<string, string> = {
      fullName,
      phone,
      email,
      assignedPtId,
      gender,
      height,
      initialWeight,
      initialGoal,
      medicalNotes,
      status,
    };

    try {
      const payload = formPayload(resource.fields || [], valuesMap, editing);
      lock.current = true;
      setBusy(true);
      await onSave(payload);
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
        onPress={handleCloseAttempt}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>
                {editing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
              </Text>
              <Text style={styles.headerSub}>
                {editing
                  ? `Mã: ${recordId(item!)}`
                  : 'Điền thông tin để tạo hồ sơ khách hàng mới'}
              </Text>
            </View>

            <Pressable
              onPress={handleCloseAttempt}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              hitSlop={8}
            >
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Form Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formScrollContent}
          >
            {error ? (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorNoticeText}>{error}</Text>
              </View>
            ) : null}

            {/* PHẦN 1: THÔNG TIN CÁ NHÂN */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Feather name="user" size={15} color={colors.primary} />
                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Họ và tên <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={(val) => {
                    setFullName(val);
                    setDirty(true);
                  }}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>
                    Số điện thoại <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0987654321"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val);
                      setDirty(true);
                    }}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="example@gmail.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      setDirty(true);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Giới tính */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Giới tính</Text>
                <View style={styles.genderRow}>
                  {(
                    [
                      { key: 'MALE', label: 'Nam' },
                      { key: 'FEMALE', label: 'Nữ' },
                      { key: 'OTHER', label: 'Khác' },
                    ] as const
                  ).map((g) => (
                    <Pressable
                      key={g.key}
                      onPress={() => {
                        setGender(g.key);
                        setDirty(true);
                      }}
                      style={[
                        styles.genderPill,
                        gender === g.key && styles.genderPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.genderPillText,
                          gender === g.key && styles.genderPillTextActive,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* PHẦN 2: HLV PHỤ TRÁCH & TRẠNG THÁI */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Feather name="shield" size={15} color={colors.primary} />
                <Text style={styles.sectionTitle}>HLV phụ trách & Trạng thái</Text>
              </View>

              {/* HLV phụ trách Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  HLV phụ trách <Text style={styles.requiredMark}>*</Text>
                </Text>
                <Pressable
                  onPress={() => setPtSelectorOpen(true)}
                  style={styles.ptSelectBtn}
                >
                  <View style={styles.ptSelectInfo}>
                    <Feather name="user-check" size={16} color={colors.primary} />
                    <Text style={styles.ptSelectText}>
                      {loadingPts ? 'Đang tải danh sách HLV…' : selectedPtName()}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={18} color="#64748B" />
                </Pressable>
              </View>

              {/* Trạng thái học viên */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Trạng thái học viên</Text>
                <View style={styles.statusRow}>
                  {(
                    [
                      { key: 'ACTIVE', label: 'Đang tập', color: '#16A34A', bg: '#DCFCE7' },
                      { key: 'LEAD', label: 'Tiềm năng', color: '#D97706', bg: '#FEF3C7' },
                      { key: 'INACTIVE', label: 'Ngừng tập', color: '#64748B', bg: '#F1F5F9' },
                    ] as const
                  ).map((st) => (
                    <Pressable
                      key={st.key}
                      onPress={() => {
                        setStatus(st.key);
                        setDirty(true);
                      }}
                      style={[
                        styles.statusPill,
                        status === st.key && {
                          borderColor: st.color,
                          backgroundColor: st.bg,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: st.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          status === st.key && { color: st.color, fontWeight: '700' },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* PHẦN 3: CHỈ SỐ THỂ TRẠNG & MỤC TIÊU */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Feather name="activity" size={15} color={colors.primary} />
                <Text style={styles.sectionTitle}>Thể trạng & Mục tiêu</Text>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Chiều cao (cm)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="175"
                    placeholderTextColor="#94A3B8"
                    value={height}
                    onChangeText={(val) => {
                      setHeight(val);
                      setDirty(true);
                    }}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>Cân nặng ban đầu (kg)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="68.5"
                    placeholderTextColor="#94A3B8"
                    value={initialWeight}
                    onChangeText={(val) => {
                      setInitialWeight(val);
                      setDirty(true);
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mục tiêu tập luyện</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Ví dụ: Giảm mỡ bụng, tăng cơ ngực, cải thiện sức bền..."
                  placeholderTextColor="#94A3B8"
                  value={initialGoal}
                  onChangeText={(val) => {
                    setInitialGoal(val);
                    setDirty(true);
                  }}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Lưu ý sức khỏe / Bệnh lý</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Ví dụ: Đau khớp gối, tiền sử huyết áp cao..."
                  placeholderTextColor="#94A3B8"
                  value={medicalNotes}
                  onChangeText={(val) => {
                    setMedicalNotes(val);
                    setDirty(true);
                  }}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.sheetFooter}>
            <Pressable
              onPress={handleCloseAttempt}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
              disabled={busy}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>
                    {editing ? 'Lưu thay đổi' : 'Tạo khách hàng'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* PT SELECTOR MODAL */}
      {ptSelectorOpen && (
        <Modal
          visible={ptSelectorOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPtSelectorOpen(false)}
        >
          <View style={styles.subModalOverlay}>
            <View style={styles.ptPickerCard}>
              <View style={styles.ptPickerHeader}>
                <Text style={styles.ptPickerTitle}>Chọn HLV phụ trách</Text>
                <Pressable
                  onPress={() => setPtSelectorOpen(false)}
                  hitSlop={8}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.ptPickerSearch}>
                <Feather name="search" size={16} color="#64748B" />
                <TextInput
                  style={styles.ptPickerSearchInput}
                  placeholder="Tìm HLV theo tên, username..."
                  placeholderTextColor="#94A3B8"
                  value={ptSearch}
                  onChangeText={setPtSearch}
                />
                {ptSearch ? (
                  <Pressable onPress={() => setPtSearch('')} hitSlop={6}>
                    <Feather name="x" size={14} color="#64748B" />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView style={styles.ptPickerList} showsVerticalScrollIndicator={false}>
                {filteredPts.length === 0 ? (
                  <View style={styles.ptPickerEmpty}>
                    <Text style={styles.ptPickerEmptyText}>Không tìm thấy HLV phù hợp</Text>
                  </View>
                ) : (
                  filteredPts.map((pt) => {
                    const pId = recordId(pt);
                    const isSelected = pId === assignedPtId;
                    return (
                      <Pressable
                        key={pId}
                        onPress={() => {
                          setAssignedPtId(pId);
                          setDirty(true);
                          setPtSelectorOpen(false);
                        }}
                        style={[
                          styles.ptPickerItem,
                          isSelected && styles.ptPickerItemSelected,
                        ]}
                      >
                        <View style={styles.ptPickerAvatar}>
                          <Text style={styles.ptPickerAvatarText}>
                            {String(pt.fullName || pt.username || 'PT').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.ptPickerInfo}>
                          <Text style={styles.ptPickerName}>{String(pt.fullName || pt.username)}</Text>
                          <Text style={styles.ptPickerUser}>@{String(pt.username || '')} · {String(pt.phone || 'Chưa có SĐT')}</Text>
                        </View>
                        {isSelected && (
                          <Feather name="check" size={18} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* DISCARD MODAL */}
      {discardModal && (
        <Modal
          visible={discardModal}
          transparent
          animationType="fade"
          onRequestClose={() => setDiscardModal(false)}
        >
          <View style={styles.subModalOverlay}>
            <View style={styles.discardCard}>
              <View style={styles.discardIcon}>
                <Ionicons name="alert" size={24} color="#EF4444" />
              </View>
              <Text style={styles.discardTitle}>Hủy thay đổi?</Text>
              <Text style={styles.discardDesc}>
                Các thông tin bạn vừa nhập sẽ bị mất và không thể khôi phục.
              </Text>
              <View style={styles.discardActions}>
                <Pressable
                  onPress={() => setDiscardModal(false)}
                  style={styles.discardCancelBtn}
                >
                  <Text style={styles.discardCancelText}>Tiếp tục sửa</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDiscardModal(false);
                    onClose();
                  }}
                  style={styles.discardConfirmBtn}
                >
                  <Text style={styles.discardConfirmText}>Bỏ thay đổi</Text>
                </Pressable>
              </View>
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
    maxHeight: '92%',
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
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  formScrollContent: {
    paddingVertical: 16,
    gap: 16,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  formSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
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
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 76,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  genderPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  ptSelectBtn: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ptSelectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  ptSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Sub modals
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
  ptPickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  ptPickerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  ptPickerList: {
    maxHeight: 320,
  },
  ptPickerEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  ptPickerEmptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  ptPickerItem: {
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
  ptPickerItemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  ptPickerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ptPickerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  ptPickerInfo: {
    flex: 1,
  },
  ptPickerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ptPickerUser: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  discardCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  discardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  discardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  discardDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  discardActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  discardCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  discardConfirmBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
