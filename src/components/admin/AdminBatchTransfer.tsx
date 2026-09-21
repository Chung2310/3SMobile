import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api/client';
import { batchTransferPayload } from '@/services/adminOperations';
import { display, recordId, type AdminRecord } from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { RecordPicker } from './RecordPicker';

const PRESET_REASONS = [
  'HLV chuyển ca / nghỉ việc',
  'Tối ưu phân bổ số lượng học viên',
  'Theo yêu cầu sắp xếp của học viên',
  'Điều chuyển chuyên môn định kỳ',
];

export function AdminBatchTransfer({ onDone }: { onDone?: () => void }) {
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<AdminRecord[]>([]);
  const [pts, setPts] = useState<AdminRecord[]>([]);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [result, setResult] = useState<{ transferredCount: number; toPtName: string }>();
  const lock = useRef(false);

  const review = () => {
    setError('');
    setResult(undefined);
    try {
      batchTransferPayload(customers, pts[0] ? recordId(pts[0]) : '', reason.trim());
      setConfirm(true);
    } catch (cause) {
      setError(messageOf(cause));
    }
  };

  const submit = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api.post<{ transferredCount: number; toPtName: string }>(
        '/api/transfers/admin-force-batch',
        batchTransferPayload(customers, recordId(pts[0]), reason.trim())
      );
      setResult(response);
      setConfirm(false);
      setCustomers([]);
      setPts([]);
      setReason('');
      setCustomReason('');
      onDone?.();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const removeCustomer = (idToRemove: string) => {
    setCustomers((prev) => prev.filter((item) => recordId(item) !== idToRemove));
  };

  const selectedPt = pts[0];
  const canSubmit = customers.length > 0 && !!selectedPt && reason.trim().length > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* SUCCESS RESULT BANNER */}
        {result ? (
          <View style={styles.resultBanner}>
            <View style={styles.resultIconBox}>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>Chuyển giao thành công</Text>
              <Text style={styles.resultDesc}>
                Đã chuyển giao toàn bộ quyền quản lý của{' '}
                <Text style={{ fontWeight: '700' }}>{result.transferredCount} học viên</Text> sang HLV{' '}
                <Text style={{ fontWeight: '700' }}>{result.toPtName}</Text>.
              </Text>
            </View>
            <Pressable onPress={() => setResult(undefined)} hitSlop={10}>
              <Feather name="x" size={18} color="#166534" />
            </Pressable>
          </View>
        ) : null}

        {/* ERROR NOTICE */}
        {error && !confirm ? (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorNoticeText}>{error}</Text>
            <Pressable onPress={() => setError('')} hitSlop={10}>
              <Feather name="x" size={16} color="#EF4444" />
            </Pressable>
          </View>
        ) : null}

        {/* GUIDE CARD */}
        <View style={styles.guideCard}>
          <View style={styles.guideIconBox}>
            <Feather name="repeat" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guideTitle}>Chuyển giao hàng loạt</Text>
          </View>
        </View>

        {/* CARD 1: HỌC VIÊN CẦN CHUYỂN */}
        <View style={styles.sectionCard}>
          <RecordPicker
            label="Học viên cần chuyển giao"
            source="/api/customers"
            selected={customers}
            onChange={setCustomers}
            disabled={busy}
            renderTrigger={(openPicker, selected) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn học viên cần chuyển giao"
                style={styles.formRow}
                onPress={openPicker}
                disabled={busy}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Feather name="users" size={18} color="#0284C7" />
                  </View>
                  <View style={styles.rowLabelWrap}>
                    <Text style={styles.rowLabel}>Học viên cần chuyển</Text>
                    <Text style={styles.rowSubLabel}>
                      {selected.length > 0
                        ? `Đã chọn ${selected.length} học viên`
                        : 'Chạm để chọn danh sách học viên'}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <View style={[styles.valueBadge, selected.length > 0 && styles.valueBadgeActive]}>
                    <Text
                      style={[styles.valueBadgeText, selected.length > 0 && styles.valueBadgeTextActive]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selected.length > 0 ? `${selected.length} học viên` : 'Chọn…'}
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={selected.length > 0 ? colors.primary : '#94A3B8'}
                    />
                  </View>
                </View>
              </Pressable>
            )}
          />

          {/* PREVIEW CHIPS OF SELECTED CUSTOMERS */}
          {customers.length > 0 ? (
            <View style={styles.selectedSection}>
              <View style={styles.selectedHeader}>
                <Text style={styles.selectedTitle}>Học viên đã chọn ({customers.length}):</Text>
                <Pressable onPress={() => setCustomers([])} hitSlop={8}>
                  <Text style={styles.clearAllText}>Bỏ chọn tất cả</Text>
                </Pressable>
              </View>

              <View style={styles.chipsWrap}>
                {customers.slice(0, 8).map((c) => (
                  <View key={recordId(c)} style={styles.customerChip}>
                    <View style={styles.chipAvatar}>
                      <Text style={styles.chipAvatarText}>
                        {(display(c) || 'H').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.chipName} numberOfLines={1} ellipsizeMode="tail">
                      {display(c)}
                    </Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeCustomer(recordId(c))}
                      style={styles.chipCloseBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Bỏ chọn ${display(c)}`}
                    >
                      <Feather name="x" size={13} color="#64748B" />
                    </Pressable>
                  </View>
                ))}
                {customers.length > 8 ? (
                  <View style={styles.moreChip}>
                    <Text style={styles.moreChipText}>+{customers.length - 8} học viên khác</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        {/* CARD 2: HLV TIẾP NHẬN */}
        <View style={styles.sectionCard}>
          <RecordPicker
            label="HLV tiếp nhận"
            source="/api/users?role=PT&status=ACTIVE"
            selected={pts}
            onChange={setPts}
            multiple={false}
            disabled={busy}
            renderTrigger={(openPicker, selected) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn HLV tiếp nhận"
                style={styles.formRow}
                onPress={openPicker}
                disabled={busy}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Feather name="user-check" size={18} color="#16A34A" />
                  </View>
                  <View style={styles.rowLabelWrap}>
                    <Text style={styles.rowLabel}>HLV tiếp nhận</Text>
                    <Text style={styles.rowSubLabel} numberOfLines={1} ellipsizeMode="tail">
                      {selected[0] ? display(selected[0]) : 'Chọn HLV phụ trách mới'}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <View style={[styles.valueBadge, selected[0] && styles.valueBadgeActive]}>
                    <Text
                      style={[styles.valueBadgeText, selected[0] && styles.valueBadgeTextActive]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selected[0] ? display(selected[0]) : 'Chọn…'}
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={selected[0] ? colors.primary : '#94A3B8'}
                    />
                  </View>
                </View>
              </Pressable>
            )}
          />

          {/* PREVIEW SELECTED PT */}
          {selectedPt ? (
            <View style={styles.ptSelectedCard}>
              <View style={styles.ptAvatar}>
                <Text style={styles.ptAvatarText}>
                  {(display(selectedPt) || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ptSelectedName} numberOfLines={1} ellipsizeMode="tail">
                  {display(selectedPt)}
                </Text>
                {selectedPt.phone ? (
                  <Text style={styles.ptSelectedMeta}>{String(selectedPt.phone)}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => setPts([])} hitSlop={8}>
                <Feather name="x" size={16} color="#64748B" />
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* CARD 3: LÝ DO CHUYỂN GIAO */}
        <View style={styles.sectionCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn lý do chuyển giao"
            style={styles.formRow}
            onPress={() => setReasonOpen(true)}
            disabled={busy}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="file-text" size={18} color="#D97706" />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>Lý do chuyển giao</Text>
                <Text style={styles.rowSubLabel} numberOfLines={1} ellipsizeMode="tail">
                  {reason || 'Chọn hoặc nhập lý do điều chuyển'}
                </Text>
              </View>
            </View>

            <View style={styles.rowRight}>
              <View style={[styles.valueBadge, reason ? styles.valueBadgeActive : null]}>
                <Text
                  style={[styles.valueBadgeText, reason ? styles.valueBadgeTextActive : null]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {reason ? 'Đã chọn' : 'Chọn lý do'}
                </Text>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={reason ? colors.primary : '#94A3B8'}
                />
              </View>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* STICKY FOOTER ANCHORED AT BOTTOM */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xác nhận chuyển giao"
          onPress={review}
          disabled={busy || !canSubmit}
          style={({ pressed }) => [
            styles.submitReviewBtn,
            pressed && styles.submitReviewBtnPressed,
            (!canSubmit || busy) && styles.submitReviewBtnDisabled,
          ]}
        >
          <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.submitReviewText}>Xác nhận chuyển giao</Text>
        </Pressable>
      </View>

      {/* REASON BOTTOM SHEET */}
      {reasonOpen && (
        <Modal
          transparent
          animationType="slide"
          visible={reasonOpen}
          onRequestClose={() => setReasonOpen(false)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setReasonOpen(false)} />
            <View style={[styles.reasonSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.sheetHandle} />

              <View style={styles.reasonSheetHeader}>
                <Text style={styles.sheetTitle}>Chọn lý do chuyển giao</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đóng"
                  onPress={() => setReasonOpen(false)}
                  hitSlop={10}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                {PRESET_REASONS.map((preset) => {
                  const isSelected = reason === preset;
                  return (
                    <Pressable
                      key={preset}
                      style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                      onPress={() => {
                        setReason(preset);
                        setCustomReason('');
                        setReasonOpen(false);
                      }}
                    >
                      <Text
                        style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextActive]}
                      >
                        {preset}
                      </Text>
                      {isSelected ? (
                        <Feather name="check" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}

                <View style={styles.customReasonBox}>
                  <Text style={styles.customReasonLabel}>Hoặc nhập lý do khác:</Text>
                  <TextInput
                    style={styles.customReasonInput}
                    placeholder="Nhập chi tiết lý do chuyển giao..."
                    placeholderTextColor="#94A3B8"
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                  />
                  {customReason.trim().length > 0 ? (
                    <Pressable
                      style={styles.applyCustomBtn}
                      onPress={() => {
                        setReason(customReason.trim());
                        setReasonOpen(false);
                      }}
                    >
                      <Text style={styles.applyCustomText}>Sử dụng lý do này</Text>
                    </Pressable>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {confirm && (
        <Modal
          visible={confirm}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!lock.current) setConfirm(false);
          }}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconBox}>
                <Feather name="repeat" size={24} color={colors.primary} />
              </View>

              <Text style={styles.confirmTitle}>Xác nhận chuyển giao</Text>
              <Text style={styles.confirmSub}>
                Vui lòng kiểm tra lại thông tin trước khi thực hiện điều chuyển:
              </Text>

              <View style={styles.confirmInfoBox}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>HLV tiếp nhận:</Text>
                  <Text style={[styles.confirmVal, { color: colors.primary, fontWeight: '700' }]}>
                    {display(selectedPt)}
                  </Text>
                </View>

                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Số lượng học viên:</Text>
                  <Text style={styles.confirmVal}>{customers.length} học viên</Text>
                </View>

                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Lý do:</Text>
                  <Text style={styles.confirmVal}>{reason || '—'}</Text>
                </View>
              </View>

              <Text style={styles.confirmCustomerListTitle}>
                Danh sách học viên ({customers.length}):
              </Text>
              <ScrollView style={styles.confirmScrollList} showsVerticalScrollIndicator={false}>
                {customers.map((c, idx) => (
                  <View key={recordId(c)} style={styles.confirmCustomerItem}>
                    <Text style={styles.confirmCustomerIndex}>{idx + 1}.</Text>
                    <Text style={styles.confirmCustomerName}>{display(c)}</Text>
                    {c.phone ? (
                      <Text style={styles.confirmCustomerPhone}>{String(c.phone)}</Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>

              <View style={styles.confirmWarningBox}>
                <Feather name="info" size={14} color="#0284C7" />
                <Text style={styles.confirmWarningText}>
                  Sau khi xác nhận, toàn bộ học viên sẽ được chuyển giao ngay lập tức cho HLV mới.
                </Text>
              </View>

              {error ? (
                <View style={styles.errorNotice}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorNoticeText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.confirmActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => setConfirm(false)}
                  style={styles.confirmCancelBtn}
                >
                  <Text style={styles.confirmCancelText}>Hủy bỏ</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => void submit()}
                  style={styles.confirmSubmitBtn}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmSubmitText}>Xác nhận chuyển ngay</Text>
                  )}
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
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 16,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  resultDesc: {
    fontSize: 13,
    color: '#166534',
    marginTop: 2,
    lineHeight: 18,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  guideIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  /* SECTION CARDS (INDIVIDUAL CARDS FOR EACH STEP) */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  formRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabelWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.text,
  },
  rowSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    maxWidth: 160,
  },
  valueBadgeActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  valueBadgeText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
  valueBadgeTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },

  /* SELECTED CUSTOMERS SECTION */
  selectedSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  clearAllText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  chipName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    maxWidth: 130,
  },
  chipCloseBtn: {
    padding: 2,
  },
  moreChip: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  moreChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },

  /* SELECTED PT CARD */
  ptSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 10,
  },
  ptAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  ptSelectedName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text,
  },
  ptSelectedMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },

  /* STICKY FOOTER */
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
  },
  submitReviewBtn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReviewBtnPressed: {
    backgroundColor: '#0369A1',
    transform: [{ scale: 0.99 }],
  },
  submitReviewBtnDisabled: {
    opacity: 0.5,
  },
  submitReviewText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* BOTTOM SHEET */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  reasonSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  reasonSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 10,
  },
  reasonOptionActive: {
    backgroundColor: '#F0F9FF',
  },
  reasonOptionText: {
    flex: 1,
    fontSize: 13.5,
    color: colors.text,
  },
  reasonOptionTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  customReasonBox: {
    marginTop: 12,
    gap: 8,
  },
  customReasonLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  customReasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },
  applyCustomBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCustomText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* CONFIRM DIALOG MODAL */
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  confirmSub: {
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  confirmInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  confirmVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    maxWidth: '65%',
    textAlign: 'right',
  },
  confirmCustomerListTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  confirmScrollList: {
    maxHeight: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  confirmCustomerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 6,
  },
  confirmCustomerIndex: {
    fontSize: 12,
    color: '#94A3B8',
    width: 22,
  },
  confirmCustomerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  confirmCustomerPhone: {
    fontSize: 12,
    color: '#64748B',
  },
  confirmWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  confirmWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmSubmitBtn: {
    flex: 1.5,
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
