import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const [customers, setCustomers] = useState<AdminRecord[]>([]);
  const [pts, setPts] = useState<AdminRecord[]>([]);
  const [reason, setReason] = useState('');
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
      batchTransferPayload(customers, pts[0] ? recordId(pts[0]) : '', reason);
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
        batchTransferPayload(customers, recordId(pts[0]), reason)
      );
      setResult(response);
      setConfirm(false);
      setCustomers([]);
      setPts([]);
      setReason('');
      onDone?.();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };


  const selectedPt = pts[0];

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* SUCCESS RESULT BANNER */}
      {result ? (
        <View style={styles.resultBanner}>
          <View style={styles.resultIconBox}>
            <Ionicons name="checkmark-circle" size={26} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultTitle}>Chuyển giao thành công!</Text>
            <Text style={styles.resultDesc}>
              Đã chuyển giao toàn bộ quyền quản lý của{' '}
              <Text style={{ fontWeight: '800' }}>{result.transferredCount} học viên</Text> sang HLV{' '}
              <Text style={{ fontWeight: '800' }}>{result.toPtName}</Text>.
            </Text>
          </View>
        </View>
      ) : null}

      {/* ERROR NOTICE */}
      {error && !confirm ? (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle" size={18} color="#EF4444" />
          <Text style={styles.errorNoticeText}>{error}</Text>
        </View>
      ) : null}

      {/* STEP 1: CHỌN HỌC VIÊN */}
      <View style={styles.stepCard}>
        <RecordPicker label={"Học viên ("+customers.length+")"} source="/api/customers" selected={customers} onChange={setCustomers} disabled={busy} compact />
      </View>

      {/* STEP 2: CHỌN HLV TIẾP NHẬN */}
      <View style={styles.stepCard}>
        <RecordPicker label="HLV tiếp nhận" source="/api/users?role=PT&status=ACTIVE" selected={pts} onChange={setPts} multiple={false} disabled={busy} compact />
      </View>

      {/* STEP 3: LÝ DO CHUYỂN GIAO */}
      <View style={styles.stepCard}>
        <Pressable style={styles.formRow} onPress={() => setReasonOpen(true)} disabled={busy}><Text style={styles.formRowLabel}>Lý do chuyển giao</Text><View style={styles.formRowValue}><Text style={reason ? styles.selectedValue : styles.placeholderValue} numberOfLines={1}>{reason || "Chọn lý do"}</Text><Feather name="chevron-right" size={18} color="#94A3B8" /></View></Pressable>
      </View>

      {/* Sticky footer */}
      <View style={styles.stickyFooter}>
      <Pressable
        onPress={review}
        disabled={busy}
        style={({ pressed }) => [
          styles.submitReviewBtn,
          pressed && { opacity: 0.85 },
          busy && { opacity: 0.6 },
        ]}
      >
        <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.submitReviewText}>
          Xác nhận chuyển giao
        </Text>
      </Pressable>

      </View>

      {reasonOpen && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setReasonOpen(false)}>
          <View style={styles.modalOverlay}><View style={styles.reasonSheet}>
            <View style={styles.reasonSheetHeader}><Text style={styles.confirmTitle}>Chọn lý do chuyển giao</Text><Pressable onPress={() => setReasonOpen(false)} hitSlop={10}><Feather name="x" size={20} color={colors.text} /></Pressable></View>
            {PRESET_REASONS.map((preset) => <Pressable key={preset} style={styles.reasonOption} onPress={() => { setReason(preset); setReasonOpen(false); }}><Text style={styles.reasonOptionText}>{preset}</Text>{reason === preset ? <Feather name="check" size={18} color={colors.primary} /> : null}</Pressable>)}
          </View></View>
        </Modal>
      )}

      {/* CONFIRMATION MODAL */}
      {confirm && (
        <Modal
          visible={confirm}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!lock.current) setConfirm(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconBox}>
                <Feather name="repeat" size={26} color={colors.primary} />
              </View>

              <Text style={styles.confirmTitle}>Xác nhận chuyển giao</Text>
              <Text style={styles.confirmSub}>
                Vui lòng kiểm tra lại thông tin trước khi thực hiện điều chuyển:
              </Text>

              <View style={styles.confirmInfoBox}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>HLV tiếp nhận:</Text>
                  <Text style={[styles.confirmVal, { color: colors.primary, fontWeight: '800' }]}>
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

              <Text style={styles.confirmCustomerListTitle}>Danh sách học viên ({customers.length}):</Text>
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
                <Feather name="info" size={14} color="#0369A1" />
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 16, paddingBottom: 96, gap: 0 },
  resultBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC", borderRadius: 14, padding: 12, gap: 10 },
  resultIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  resultTitle: { fontSize: 15, fontWeight: "800", color: "#16A34A" },
  resultDesc: { fontSize: 13, color: "#166534", marginTop: 2, lineHeight: 18 },
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
  stepCard: { backgroundColor: "#FFFFFF", paddingVertical: 4, gap: 0 },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  stepSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  formRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  formRowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  formRowValue: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "58%" },
  selectedValue: { fontSize: 13, color: colors.text, fontWeight: "600" },
  placeholderValue: { fontSize: 13, color: colors.textMuted },
  stickyFooter: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  reasonSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 4 },
  reasonSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  reasonOption: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  reasonOptionText: { flex: 1, fontSize: 14, color: colors.text },
  chipsContainer: {
    marginTop: 4,
    gap: 6,
  },
  chipsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 5,
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
    maxWidth: 140,
  },
  chipRemoveBtn: {
    padding: 2,
  },
  ptTargetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  ptTargetAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptTargetAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  ptTargetName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ptTargetUser: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  presetChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  presetChipText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 88,
    textAlignVertical: 'top',
    fontSize: 13.5,
    color: colors.text,
  },
  submitReviewBtn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitReviewText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 18,
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
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  confirmScrollList: {
    maxHeight: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
  },
  confirmCustomerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  confirmCustomerIndex: {
    fontSize: 12,
    color: '#94A3B8',
    width: 20,
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
    borderRadius: 10,
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
