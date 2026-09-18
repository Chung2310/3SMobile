import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  const removeCustomer = (idToRemove: string) => {
    setCustomers((prev) => prev.filter((c) => recordId(c) !== idToRemove));
  };

  const selectedPt = pts[0];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* 1. HERO HEADER */}
      <View style={styles.heroCard}>
        <View style={styles.heroIconBox}>
          <Feather name="repeat" size={24} color={colors.primary} />
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle}>Chuyển giao hàng loạt</Text>
          <Text style={styles.heroSub}>
            Điều chuyển đồng thời nhiều học viên sang một HLV mới chỉ trong một lần xác nhận.
          </Text>
        </View>
      </View>

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
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Danh sách học viên cần chuyển</Text>
            <Text style={styles.stepSub}>
              {customers.length > 0
                ? `Đã chọn ${customers.length} học viên`
                : 'Chưa có học viên nào được chọn'}
            </Text>
          </View>
        </View>

        <RecordPicker
          label="Mở danh sách học viên"
          source="/api/customers"
          selected={customers}
          onChange={setCustomers}
          disabled={busy}
        />

        {/* Selected Customers Preview Chips */}
        {customers.length > 0 ? (
          <View style={styles.chipsContainer}>
            <Text style={styles.chipsLabel}>Học viên đã chọn:</Text>
            <View style={styles.chipsGrid}>
              {customers.map((c) => {
                const cId = recordId(c);
                return (
                  <View key={cId} style={styles.customerChip}>
                    <View style={styles.chipAvatar}>
                      <Text style={styles.chipAvatarText}>
                        {display(c).trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.chipName} numberOfLines={1}>
                      {display(c)}
                    </Text>
                    <Pressable
                      onPress={() => removeCustomer(cId)}
                      hitSlop={8}
                      style={styles.chipRemoveBtn}
                    >
                      <Feather name="x" size={13} color="#64748B" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      {/* STEP 2: CHỌN HLV TIẾP NHẬN */}
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>HLV tiếp nhận mới</Text>
            <Text style={styles.stepSub}>
              {selectedPt ? `HLV: ${display(selectedPt)}` : 'Chọn HLV sẽ tiếp quản các học viên này'}
            </Text>
          </View>
        </View>

        <RecordPicker
          label="Mở danh sách HLV"
          source="/api/users?role=PT&status=ACTIVE"
          selected={pts}
          onChange={setPts}
          multiple={false}
          disabled={busy}
        />

        {selectedPt ? (
          <View style={styles.ptTargetCard}>
            <View style={styles.ptTargetAvatar}>
              <Text style={styles.ptTargetAvatarText}>
                {display(selectedPt).trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ptTargetName}>{display(selectedPt)}</Text>
              <Text style={styles.ptTargetUser}>
                @{String(selectedPt.username || '')} · SĐT: {String(selectedPt.phone || 'Chưa cập nhật')}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          </View>
        ) : null}
      </View>

      {/* STEP 3: LÝ DO CHUYỂN GIAO */}
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>3</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Lý do chuyển giao</Text>
            <Text style={styles.stepSub}>Ghi chú lý do lưu vào lịch sử hệ thống</Text>
          </View>
        </View>

        {/* Preset quick reasons */}
        <View style={styles.presetRow}>
          {PRESET_REASONS.map((preset) => (
            <Pressable
              key={preset}
              onPress={() => setReason(preset)}
              style={({ pressed }) => [
                styles.presetChip,
                reason === preset && styles.presetChipActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text
                style={[
                  styles.presetChipText,
                  reason === preset && styles.presetChipTextActive,
                ]}
              >
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          accessibilityLabel="Lý do chuyển giao"
          style={styles.reasonInput}
          placeholder="Nhập chi tiết lý do chuyển giao hoặc chọn từ gợi ý phía trên…"
          placeholderTextColor="#94A3B8"
          multiline
          value={reason}
          onChangeText={setReason}
          editable={!busy}
        />
      </View>

      {/* SUBMIT BUTTON */}
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
          Xem lại & Xác nhận chuyển giao ({customers.length} học viên)
        </Text>
      </Pressable>

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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  heroSub: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  resultIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
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
  stepSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
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
