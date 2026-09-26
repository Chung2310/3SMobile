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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/services/api/client';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { type AdminRecord } from '@/services/adminResources';
import { RecordPicker } from './RecordPicker';

export function AdminCreditAdjustment() {
  const [targetUser, setTargetUser] = useState<AdminRecord | null>(null);
  const [creditsInput, setCreditsInput] = useState('100');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<{
    credits: number;
    availableCredits?: number;
    userName?: string;
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const lock = useRef(false);

  const quickCreditChips = [
    { label: '+50', value: 50 },
    { label: '+100', value: 100 },
    { label: '+200', value: 200 },
    { label: '+500', value: 500 },
    { label: '-50', value: -50 },
    { label: '-100', value: -100 },
    { label: '-200', value: -200 },
  ];

  const quickReasonSuggestions = [
    'Cấp credit ban đầu',
    'Bù credit lỗi tác vụ AI',
    'Hoàn trả do sự cố hệ thống',
    'Thưởng nhiệm vụ / thành tích',
    'Thu hồi credit cấp nhầm',
  ];

  const handleApplyQuickCredits = (delta: number) => {
    setCreditsInput(String(delta));
  };

  const handleValidateAndConfirm = () => {
    if (!targetUser) {
      setError('Vui lòng chọn tài khoản cần điều chỉnh credit.');
      return;
    }
    const creditsNum = Number(creditsInput);
    if (!Number.isFinite(creditsNum) || creditsNum === 0 || !Number.isInteger(creditsNum)) {
      setError('Số credit thay đổi phải là số nguyên khác 0 (dương để cộng, âm để trừ).');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Vui lòng nhập lý do điều chỉnh (tối thiểu 3 ký tự).');
      return;
    }

    setError('');
    setConfirmModal(true);
  };

  const handleExecuteAdjustment = async () => {
    if (lock.current || !targetUser) return;
    lock.current = true;
    setBusy(true);
    setError('');

    const creditsNum = Number(creditsInput);
    const userId = String(targetUser._id || targetUser.id || '');

    try {
      const response = await api.post<{
        availableCredits?: number;
        success?: boolean;
      }>('/api/admin/credit-adjustments', {
        userId,
        credits: creditsNum,
        reason: reason.trim(),
      });

      setSuccessResult({
        credits: creditsNum,
        availableCredits: response?.availableCredits,
        userName: String(targetUser.fullName || targetUser.username || 'Tài khoản'),
      });

      setConfirmModal(false);
      setReason('');
      setCreditsInput('100');
    } catch (cause) {
      setError(messageOf(cause));
      setConfirmModal(false);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const creditsNum = Number(creditsInput || 0);
  const isPositive = creditsNum > 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {/* 1. Header Information Banner */}
      <View style={styles.guideCard}>
        <View style={styles.guideIconBox}>
          <Ionicons name="swap-vertical" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.guideTitle}>Nghiệp vụ điều chỉnh số dư Credit</Text>
          <Text style={styles.guideText}>
            Nhập <Text style={{ color: '#16A34A', fontWeight: '700' }}>số dương (+)</Text> để nạp/cộng thêm credit, hoặc <Text style={{ color: '#EF4444', fontWeight: '700' }}>số âm (-)</Text> để thu hồi/trừ bớt credit. Mọi thay đổi đều được ghi lại vào Sổ cái giao dịch.
          </Text>
        </View>
      </View>

      {/* 2. Success Result Banner */}
      {successResult ? (
        <View style={styles.successBanner}>
          <View style={styles.successIconBox}>
            <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.successTitle}>Điều chỉnh số dư thành công!</Text>
            <Text style={styles.successDesc}>
              Đã {successResult.credits > 0 ? 'cộng' : 'trừ'}{' '}
              <Text style={{ fontWeight: '700' }}>{Math.abs(successResult.credits)}</Text> credit cho{' '}
              <Text style={{ fontWeight: '700' }}>{successResult.userName}</Text>.
              {successResult.availableCredits !== undefined
                ? ` Số dư hiện tại: ${successResult.availableCredits} credit.`
                : ''}
            </Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/admin/[section]',
                  params: { section: 'ledger' },
                })
              }
              style={styles.viewLedgerBtn}
            >
              <Text style={styles.viewLedgerText}>Xem trong Sổ cái giao dịch →</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* 3. Main Form Card */}
      <View style={styles.formCard}>
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Target User Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Tài khoản nhận điều chỉnh <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <RecordPicker
            label="Chọn tài khoản người dùng"
            source="/api/users"
            selected={targetUser ? [targetUser] : []}
            onChange={(records) => setTargetUser(records[0] || null)}
            multiple={false}
          />
        </View>

        {/* Credit Delta Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Số credit thay đổi <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <View
            style={[
              styles.creditInputRow,
              isPositive ? styles.creditInputRowPositive : styles.creditInputRowNegative,
            ]}
          >
            <View
              style={[
                styles.creditSignBadge,
                { backgroundColor: isPositive ? '#DCFCE7' : '#FEE2E2' },
              ]}
            >
              <Ionicons
                name={isPositive ? 'add-circle' : 'remove-circle'}
                size={22}
                color={isPositive ? '#16A34A' : '#EF4444'}
              />
              <Text
                style={[
                  styles.creditSignText,
                  { color: isPositive ? '#16A34A' : '#EF4444' },
                ]}
              >
                {isPositive ? 'CỘNG THÊM' : 'TRỪ BỚT'}
              </Text>
            </View>

            <TextInput
              style={styles.creditNumberInput}
              value={creditsInput}
              onChangeText={setCreditsInput}
              keyboardType="numbers-and-punctuation"
              placeholder="100"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Quick Amount Chips */}
          <Text style={styles.quickChipsTitle}>Chọn nhanh số lượng:</Text>
          <View style={styles.chipsRow}>
            {quickCreditChips.map((chip) => (
              <Pressable
                key={chip.label}
                onPress={() => handleApplyQuickCredits(chip.value)}
                style={[
                  styles.quickChip,
                  Number(creditsInput) === chip.value && styles.quickChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    Number(creditsInput) === chip.value && styles.quickChipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reason Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Lý do điều chỉnh <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            placeholder="Nhập chi tiết lý do thay đổi số dư để lưu nhật ký kiểm toán…"
            placeholderTextColor="#94A3B8"
          />

          {/* Reason Suggestions */}
          <Text style={styles.quickChipsTitle}>Gợi ý lý do phổ biến:</Text>
          <View style={styles.chipsRow}>
            {quickReasonSuggestions.map((sug) => (
              <Pressable
                key={sug}
                onPress={() => setReason(sug)}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionChipText}>{sug}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleValidateAndConfirm}
          disabled={busy}
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.85 },
            busy && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>Kiểm tra & Tiến hành điều chỉnh</Text>
        </Pressable>
      </View>

      {/* Confirmation Modal */}
      {confirmModal && targetUser ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmModal(false)}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <View
                style={[
                  styles.dialogIconBox,
                  { backgroundColor: isPositive ? '#DCFCE7' : '#FEF3C7' },
                ]}
              >
                <Ionicons
                  name={isPositive ? 'arrow-up-circle' : 'arrow-down-circle'}
                  size={28}
                  color={isPositive ? '#16A34A' : '#D97706'}
                />
              </View>

              <Text style={styles.dialogTitle}>Xác nhận điều chỉnh số dư</Text>

              <View style={styles.confirmDetailsBox}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmRowLabel}>Tài khoản:</Text>
                  <Text style={styles.confirmRowValue}>
                    {String(targetUser.fullName || targetUser.username)}
                  </Text>
                </View>

                <View style={styles.confirmRow}>
                  <Text style={styles.confirmRowLabel}>Số credit:</Text>
                  <Text
                    style={[
                      styles.confirmRowValue,
                      { color: isPositive ? '#16A34A' : '#EF4444', fontWeight: '800' },
                    ]}
                  >
                    {isPositive ? `+${creditsNum}` : creditsNum} Credit
                  </Text>
                </View>

                <View style={styles.confirmRow}>
                  <Text style={styles.confirmRowLabel}>Lý do:</Text>
                  <Text style={styles.confirmRowValue} numberOfLines={2}>
                    {reason}
                  </Text>
                </View>
              </View>

              <Text style={styles.dialogDesc}>
                Thao tác sẽ được áp dụng trực tiếp vào tài khoản và ghi nhận vào sổ giao dịch kế toán.
              </Text>

              <View style={styles.dialogActions}>
                <Pressable
                  onPress={() => setConfirmModal(false)}
                  disabled={busy}
                  style={styles.dialogCancelBtn}
                >
                  <Text style={styles.dialogCancelText}>Kiểm tra lại</Text>
                </Pressable>

                <Pressable
                  onPress={() => void handleExecuteAdjustment()}
                  disabled={busy}
                  style={[
                    styles.dialogConfirmBtn,
                    { backgroundColor: isPositive ? colors.primary : '#EF4444' },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogConfirmText}>Xác nhận lưu</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  guideIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  guideText: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 14,
  },
  successIconBox: {
    marginTop: 2,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  successDesc: {
    fontSize: 12.5,
    color: '#166534',
    marginTop: 2,
    lineHeight: 17,
  },
  viewLedgerBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewLedgerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#EF4444',
    fontWeight: '500',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  creditInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 52,
    backgroundColor: '#FFFFFF',
  },
  creditInputRowPositive: {
    borderColor: '#86EFAC',
  },
  creditInputRowNegative: {
    borderColor: '#FECACA',
  },
  creditSignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  creditSignText: {
    fontSize: 11,
    fontWeight: '800',
  },
  creditNumberInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  quickChipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: colors.primary,
  },
  quickChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  quickChipTextActive: {
    color: colors.primary,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionChipText: {
    fontSize: 11.5,
    color: '#475569',
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
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modal Confirmation Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  dialogIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  confirmRowLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmRowValue: {
    flex: 1,
    fontSize: 12.5,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
    marginLeft: 12,
  },
  dialogDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  dialogConfirmBtn: {
    flex: 1.3,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
