import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppAlertModal } from '@/components/AppAlertModal';
import { api } from '@/services/api/client';

interface CreditPackageOption {
  amount: number;
  credits: number;
  isHot?: boolean;
}

const PRESET_AMOUNTS: CreditPackageOption[] = [
  { amount: 50000, credits: 500 },
  { amount: 100000, credits: 1000, isHot: true },
  { amount: 200000, credits: 2000 },
  { amount: 500000, credits: 5000 },
  { amount: 1000000, credits: 10000 },
  { amount: 2000000, credits: 20000 },
];

interface LedgerEntry {
  id: string;
  createdAt: string;
  type: string;
  typeLabel: string;
  amount: number;
  balanceAfter: number;
  note: string;
}

const DEFAULT_TRANSACTIONS: LedgerEntry[] = [
  {
    id: 'tx-1',
    createdAt: '09:36:31 17/9/2026',
    type: 'SETTLE',
    typeLabel: 'Quyết toán AI',
    amount: -12,
    balanceAfter: 235,
    note: 'Quyết toán tác vụ AI.',
  },
  {
    id: 'tx-2',
    createdAt: '09:36:29 17/9/2026',
    type: 'SETTLE',
    typeLabel: 'Quyết toán AI',
    amount: -12,
    balanceAfter: 247,
    note: 'Quyết toán tác vụ AI.',
  },
  {
    id: 'tx-3',
    createdAt: '09:36:28 17/9/2026',
    type: 'SETTLE',
    typeLabel: 'Quyết toán AI',
    amount: -12,
    balanceAfter: 259,
    note: 'Quyết toán tác vụ AI.',
  },
  {
    id: 'tx-4',
    createdAt: '09:36:21 17/9/2026',
    type: 'RESERVE',
    typeLabel: 'Tạm giữ AI',
    amount: -10,
    balanceAfter: 271,
    note: 'Tạm giữ credit cho tác vụ AI.',
  },
  {
    id: 'tx-5',
    createdAt: '09:36:19 17/9/2026',
    type: 'RESERVE',
    typeLabel: 'Tạm giữ AI',
    amount: -10,
    balanceAfter: 281,
    note: 'Tạm giữ credit cho tác vụ AI.',
  },
  {
    id: 'tx-6',
    createdAt: '09:36:18 17/9/2026',
    type: 'RESERVE',
    typeLabel: 'Tạm giữ AI',
    amount: -10,
    balanceAfter: 291,
    note: 'Tạm giữ credit cho tác vụ AI.',
  },
  {
    id: 'tx-7',
    createdAt: '09:36:15 17/9/2026',
    type: 'SETTLE',
    typeLabel: 'Quyết toán AI',
    amount: -12,
    balanceAfter: 301,
    note: 'Quyết toán tác vụ AI.',
  },
  {
    id: 'tx-8',
    createdAt: '09:36:13 17/9/2026',
    type: 'SETTLE',
    typeLabel: 'Quyết toán AI',
    amount: -12,
    balanceAfter: 313,
    note: 'Quyết toán tác vụ AI.',
  },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  // Dữ liệu số dư ví
  const [availableCredits, setAvailableCredits] = useState<number>(499);
  const [reservedCredits, setReservedCredits] = useState<number>(1);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Nhập / chọn số tiền nạp
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmountText, setCustomAmountText] = useState<string>('100000');

  // Lịch sử giao dịch & Bộ lọc
  const [transactions, setTransactions] = useState<LedgerEntry[]>(DEFAULT_TRANSACTIONS);
  const [filterType, setFilterType] = useState<'ALL' | 'SETTLE' | 'RESERVE' | 'TOPUP'>('ALL');

  // Popup thông báo tính năng QR thanh toán
  const [showUnderDevModal, setShowUnderDevModal] = useState<boolean>(false);

  // Tính số credit nhận được tương ứng với số tiền (100đ = 1 credit)
  const calculatedCredits = useMemo(() => {
    return Math.floor(selectedAmount / 100);
  }, [selectedAmount]);

  // Tải dữ liệu ví thực tế từ backend
  const fetchWallet = useCallback(async () => {
    setRefreshing(true);
    try {
      const [walletRes, ledgerRes] = await Promise.allSettled([
        api.get<any>('/api/credits/me'),
        api.get<any>('/api/credits/me/ledger?page=1&limit=25'),
      ]);

      if (walletRes.status === 'fulfilled') {
        const payload = (walletRes.value as any)?.data || walletRes.value;
        if (typeof payload?.availableCredits === 'number') {
          setAvailableCredits(payload.availableCredits);
        }
        if (typeof payload?.reservedCredits === 'number') {
          setReservedCredits(payload.reservedCredits);
        }
      }

      if (ledgerRes.status === 'fulfilled') {
        const payload = (ledgerRes.value as any)?.data || ledgerRes.value;
        const list = Array.isArray(payload) ? payload : payload?.items;
        if (Array.isArray(list) && list.length > 0) {
          const parsed: LedgerEntry[] = list.map((item: any, idx: number) => {
            const rawType = item.type || 'SETTLE';
            let typeLabel = 'Quyết toán AI';
            if (rawType === 'TOPUP') typeLabel = 'Nạp credit';
            else if (rawType === 'RESERVE') typeLabel = 'Tạm giữ AI';
            else if (rawType === 'RELEASE') typeLabel = 'Hoàn trả AI';
            else if (rawType === 'ADJUSTMENT') typeLabel = 'Điều chỉnh';

            const createdDate = item.createdAt ? new Date(item.createdAt) : new Date();
            const dateStr = `${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}:${String(createdDate.getSeconds()).padStart(2, '0')} ${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;

            return {
              id: item._id || item.id || `tx-${idx}`,
              createdAt: dateStr,
              type: rawType,
              typeLabel,
              amount: typeof item.availableDelta === 'number' ? item.availableDelta : (item.amount || 0),
              balanceAfter: typeof item.availableAfter === 'number' ? item.availableAfter : (item.balanceAfter || 0),
              note: item.reason || item.note || 'Giao dịch hệ thống AI.',
            };
          });
          setTransactions(parsed);
        }
      }
    } catch {
      // Giữ nguyên dữ liệu hiển thị mẫu ban đầu nếu mất kết nối mạng
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get<any>('/api/credits/me'),
      api.get<any>('/api/credits/me/ledger?page=1&limit=25'),
    ]).then(([walletRes, ledgerRes]) => {
      if (!active) return;
      if (walletRes.status === 'fulfilled') {
        const payload = (walletRes.value as any)?.data || walletRes.value;
        if (typeof payload?.availableCredits === 'number') {
          setAvailableCredits(payload.availableCredits);
        }
        if (typeof payload?.reservedCredits === 'number') {
          setReservedCredits(payload.reservedCredits);
        }
      }

      if (ledgerRes.status === 'fulfilled') {
        const payload = (ledgerRes.value as any)?.data || ledgerRes.value;
        const list = Array.isArray(payload) ? payload : payload?.items;
        if (Array.isArray(list) && list.length > 0) {
          const parsed: LedgerEntry[] = list.map((item: any, idx: number) => {
            const rawType = item.type || 'SETTLE';
            let typeLabel = 'Quyết toán AI';
            if (rawType === 'TOPUP') typeLabel = 'Nạp credit';
            else if (rawType === 'RESERVE') typeLabel = 'Tạm giữ AI';
            else if (rawType === 'RELEASE') typeLabel = 'Hoàn trả AI';
            else if (rawType === 'ADJUSTMENT') typeLabel = 'Điều chỉnh';

            const createdDate = item.createdAt ? new Date(item.createdAt) : new Date();
            const dateStr = `${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}:${String(createdDate.getSeconds()).padStart(2, '0')} ${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;

            return {
              id: item._id || item.id || `tx-${idx}`,
              createdAt: dateStr,
              type: rawType,
              typeLabel,
              amount: typeof item.availableDelta === 'number' ? item.availableDelta : (item.amount || 0),
              balanceAfter: typeof item.availableAfter === 'number' ? item.availableAfter : (item.balanceAfter || 0),
              note: item.reason || item.note || 'Giao dịch hệ thống AI.',
            };
          });
          setTransactions(parsed);
        }
      }
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Xử lý chọn mức nạp có sẵn
  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmountText(String(amount));
  };

  // Xử lý nhập số tiền tùy chọn
  const handleCustomAmountChange = (text: string) => {
    const rawNumber = text.replace(/[^0-9]/g, '');
    setCustomAmountText(rawNumber);
    const num = Number(rawNumber) || 0;
    setSelectedAmount(num);
  };

  // Lọc giao dịch
  const filteredTransactions = useMemo(() => {
    if (filterType === 'ALL') return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [transactions, filterType]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.navigate('/(app)/(tabs)')}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Ví Credit</Text>
          <Text style={styles.pageSubtitle}>Quản lý số dư & tác vụ AI</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
      >
        {/* ================= 1. CARD SỐ DƯ VÍ (XANH DƯƠNG THỂ THAO) ================= */}
        <View style={styles.balanceCard}>
          {/* Hàng trên: Tiêu đề ví & Nút làm mới */}
          <View style={styles.balanceHeader}>
            <View style={styles.balanceHeaderLeft}>
              <Ionicons name="sparkles" size={15} color="#BAE6FD" style={{ marginRight: 6 }} />
              <Text style={styles.balanceCardTitle}>VÍ AI 3S GYM</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.75 }]}
              onPress={fetchWallet}
              hitSlop={8}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
              ) : (
                <Feather name="refresh-cw" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.refreshBtnText}>Làm mới</Text>
            </Pressable>
          </View>

          {/* Hàng giữa: Credit khả dụng & Đang tạm giữ */}
          <View style={styles.balanceBody}>
            <View style={styles.availableCol}>
              <Text style={styles.availableLabel}>CREDIT KHẢ DỤNG</Text>
              <View style={styles.availableValueRow}>
                <Text style={styles.availableNumber}>{availableCredits.toLocaleString()}</Text>
                <Text style={styles.availableUnit}>credit</Text>
              </View>
            </View>

            <View style={styles.holdBadge}>
              <Text style={styles.holdLabel}>ĐANG TẠM GIỮ</Text>
              <View style={styles.holdValueRow}>
                <Text style={styles.holdNumber}>{reservedCredits.toLocaleString()}</Text>
                <Text style={styles.holdUnit}>credit</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= 2. CARD NẠP CREDIT ================= */}
        <View style={styles.topupCard}>
          <Text style={styles.sectionHeading}>Nạp credit</Text>
          <Text style={styles.sectionSubtitle}>
            Tỉ giá: 1.000đ = 10 credit (100đ / credit)
          </Text>

          {/* Nhóm chọn số tiền */}
          <View style={styles.amountSelectBox}>
            <Text style={styles.subHeading}>Mức nạp nhanh phổ biến:</Text>
            <View style={styles.presetsGrid}>
              {PRESET_AMOUNTS.map((pkg) => {
                const isSelected = selectedAmount === pkg.amount;
                return (
                  <Pressable
                    key={pkg.amount}
                    style={[styles.presetPill, isSelected && styles.presetPillSelected]}
                    onPress={() => handleSelectPreset(pkg.amount)}
                  >
                    {pkg.isHot && (
                      <View style={styles.hotBadge}>
                        <Text style={styles.hotBadgeText}>Hot</Text>
                      </View>
                    )}
                    <Text style={[styles.presetAmountText, isSelected && styles.presetAmountTextSelected]}>
                      {pkg.amount.toLocaleString()}đ
                    </Text>
                    <Text style={[styles.presetCreditText, isSelected && styles.presetCreditTextSelected]}>
                      {pkg.credits.toLocaleString()} cr
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Ô nhập số tiền tùy chọn */}
            <Text style={[styles.subHeading, { marginTop: 12 }]}>Số tiền tùy chọn (VND):</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={customAmountText}
                onChangeText={handleCustomAmountChange}
                placeholder="Ví dụ: 100000"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.currencySuffix}>đ</Text>
            </View>
          </View>

          {/* Phương thức thanh toán PayOS */}
          <View style={styles.paymentMethodBox}>
            <View style={styles.methodHeaderRow}>
              <View style={styles.methodHeaderLeft}>
                <Ionicons name="qr-code-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.methodTitle}>Chuyển khoản VietQR tự động qua PayOS</Text>
              </View>
              <View style={styles.instantBadge}>
                <Feather name="zap" size={11} color="#15803D" style={{ marginRight: 3 }} />
                <Text style={styles.instantBadgeText}>Tự động 24/7</Text>
              </View>
            </View>
            <Text style={styles.bankSupportText}>
              Hỗ trợ: Vietcombank, MB Bank, Techcombank, ACB, VPBank, MoMo, ZaloPay và 40+ ngân hàng.
            </Text>
          </View>

          {/* Tóm tắt thanh toán & Nút tạo QR */}
          <View style={styles.checkoutBar}>
            <View style={styles.checkoutSummary}>
              <Text style={styles.checkoutLabel}>SỐ TIỀN THANH TOÁN:</Text>
              <Text style={styles.checkoutAmount}>{selectedAmount.toLocaleString()} đ</Text>
              <Text style={styles.checkoutCredits}>
                + {calculatedCredits.toLocaleString()} credit nhận được
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.createQrBtn, pressed && { opacity: 0.85 }]}
              onPress={() => setShowUnderDevModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Tạo mã QR thanh toán"
            >
              <Ionicons name="qr-code" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.createQrBtnText}>Tạo mã QR</Text>
            </Pressable>
          </View>
        </View>

        {/* ================= 3. LỊCH SỬ GIAO DỊCH ================= */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <View style={styles.historyHeaderLeft}>
              <Feather name="clock" size={15} color="#0284C7" style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeading}>Lịch sử giao dịch credit</Text>
            </View>

            {/* Filter pills */}
            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterPill, filterType === 'ALL' && styles.filterPillActive]}
                onPress={() => setFilterType('ALL')}
              >
                <Text style={[styles.filterText, filterType === 'ALL' && styles.filterTextActive]}>
                  Tất cả
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, filterType === 'SETTLE' && styles.filterPillActive]}
                onPress={() => setFilterType('SETTLE')}
              >
                <Text style={[styles.filterText, filterType === 'SETTLE' && styles.filterTextActive]}>
                  Quyết toán
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, filterType === 'RESERVE' && styles.filterPillActive]}
                onPress={() => setFilterType('RESERVE')}
              >
                <Text style={[styles.filterText, filterType === 'RESERVE' && styles.filterTextActive]}>
                  Tạm giữ
                </Text>
              </Pressable>
            </View>
          </View>

          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyHistoryBox}>
              <Text style={styles.emptyHistoryText}>Chưa có giao dịch credit nào.</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {filteredTransactions.map((tx) => {
                const isNegative = tx.amount < 0;
                return (
                  <View key={tx.id} style={styles.txItem}>
                    {/* Hàng trên: Badge loại & Biến động credit */}
                    <View style={styles.txTopRow}>
                      <View
                        style={[
                          styles.txTypeBadge,
                          tx.type === 'SETTLE' && styles.txTypeSettle,
                          tx.type === 'RESERVE' && styles.txTypeReserve,
                          tx.type === 'TOPUP' && styles.txTypeTopup,
                        ]}
                      >
                        <Text
                          style={[
                            styles.txTypeText,
                            tx.type === 'SETTLE' && styles.txTypeTextSettle,
                            tx.type === 'RESERVE' && styles.txTypeTextReserve,
                            tx.type === 'TOPUP' && styles.txTypeTextTopup,
                          ]}
                        >
                          {tx.typeLabel}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.txDeltaText,
                          isNegative ? styles.txDeltaNegative : styles.txDeltaPositive,
                        ]}
                      >
                        {isNegative ? `${tx.amount}` : `+${tx.amount}`} credit
                      </Text>
                    </View>

                    {/* Hàng giữa: Ghi chú tác vụ */}
                    <Text style={styles.txNoteText} numberOfLines={1}>
                      {tx.note}
                    </Text>

                    {/* Hàng dưới: Thời gian & Số dư sau giao dịch */}
                    <View style={styles.txBottomRow}>
                      <Text style={styles.txDateText}>{tx.createdAt}</Text>
                      <Text style={styles.txBalanceAfterText}>
                        Số dư sau: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{tx.balanceAfter}</Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Popup thông báo tính năng đang cập nhật (theo đúng yêu cầu của người dùng) */}
      <AppAlertModal
        visible={showUnderDevModal}
        type="info"
        title="Tính năng đang được cập nhật"
        message="Tính năng tạo mã QR thanh toán đang được cập nhật. Vui lòng liên hệ quản trị viên để biết thêm chi tiết."
        confirmLabel="Đã hiểu"
        onConfirm={() => setShowUnderDevModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: '#E2E8F0',
  },
  titleWrap: {
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  /* CARD SỐ DƯ */
  balanceCard: {
    backgroundColor: '#0284C7',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E0F2FE',
    letterSpacing: 0.8,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  availableCol: {
    flex: 1,
  },
  availableLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#BAE6FD',
    letterSpacing: 0.5,
  },
  availableValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  availableNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  availableUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BAE6FD',
  },
  holdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  holdLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E0F2FE',
    letterSpacing: 0.5,
  },
  holdValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 1,
  },
  holdNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  holdUnit: {
    fontSize: 11,
    color: '#BAE6FD',
    fontWeight: '600',
  },

  /* CARD NẠP TIỀN */
  topupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  amountSelectBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    position: 'relative',
  },
  presetPillSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  hotBadge: {
    position: 'absolute',
    top: -6,
    right: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hotBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presetAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  presetAmountTextSelected: {
    color: '#0284C7',
    fontWeight: '800',
  },
  presetCreditText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  presetCreditTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 44,
  },
  amountInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  currencySuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  paymentMethodBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 12,
  },
  methodHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  instantBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  bankSupportText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  checkoutBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  checkoutSummary: {
    flex: 1,
  },
  checkoutLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  checkoutAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0284C7',
    marginTop: 1,
  },
  checkoutCredits: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  createQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  createQrBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* CARD LỊCH SỬ */
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  txList: {
    gap: 8,
  },
  txItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  txTypeSettle: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  txTypeReserve: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  txTypeTopup: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  txTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  txTypeTextSettle: {
    color: '#475569',
  },
  txTypeTextReserve: {
    color: '#0284C7',
  },
  txTypeTextTopup: {
    color: '#15803D',
  },
  txDeltaText: {
    fontSize: 12,
    fontWeight: '800',
  },
  txDeltaNegative: {
    color: '#DC2626',
  },
  txDeltaPositive: {
    color: '#16A34A',
  },
  txNoteText: {
    fontSize: 11,
    color: '#334155',
    marginBottom: 4,
  },
  txBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txDateText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  txBalanceAfterText: {
    fontSize: 10,
    color: '#64748B',
  },
  emptyHistoryBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
