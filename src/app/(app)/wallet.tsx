import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
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

const BANNER_WALLET = require('../../../assets/public/banner-wallet.png');

export interface CreditWallet {
  id?: string;
  availableCredits: number;
  reservedCredits: number;
}

export interface CreditLedgerItem {
  _id?: string;
  id?: string;
  type: 'TOPUP' | 'RESERVE' | 'SETTLE' | 'RELEASE' | 'ADJUSTMENT' | string;
  availableDelta: number;
  reservedDelta: number;
  availableAfter: number;
  reservedAfter: number;
  reason: string;
  createdAt: string;
}

export type DateFilterType = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'THIS_MONTH';

export interface DateFilterOption {
  key: DateFilterType;
  label: string;
}

export const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  { key: 'ALL', label: 'Tất cả thời gian' },
  { key: 'TODAY', label: 'Hôm nay' },
  { key: 'WEEK', label: '7 ngày gần nhất' },
  { key: 'MONTH', label: '30 ngày gần nhất' },
  { key: 'THIS_MONTH', label: 'Tháng này' },
];

interface PresetOption {
  amount: number;
  credits: number;
  isHot?: boolean;
}

const DEFAULT_PRESETS: PresetOption[] = [
  { amount: 50000, credits: 500 },
  { amount: 100000, credits: 1000, isHot: true },
  { amount: 200000, credits: 2000 },
  { amount: 500000, credits: 5000 },
  { amount: 1000000, credits: 10000 },
  { amount: 2000000, credits: 20000 },
];

const formatDate = (isoStr?: string) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
};

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  // Dữ liệu số dư ví từ BE (không dùng mockdata)
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Lịch sử giao dịch từ BE (không dùng mockdata)
  const [ledgerItems, setLedgerItems] = useState<CreditLedgerItem[] | null>(null);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'ALL' | 'SETTLE' | 'RESERVE' | 'TOPUP'>('ALL');

  // Trạng thái refresh
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Nhập / chọn số tiền nạp
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmountText, setCustomAmountText] = useState<string>('100000');

  // Popup thông báo tính năng QR thanh toán
  const [showUnderDevModal, setShowUnderDevModal] = useState<boolean>(false);

  // Lọc theo ngày tháng trong lịch sử giao dịch
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [showDateFilterModal, setShowDateFilterModal] = useState<boolean>(false);

  // Tính số credit nhận được tương ứng với số tiền (100đ = 1 credit)
  const calculatedCredits = useMemo(() => {
    return Math.floor(selectedAmount / 100);
  }, [selectedAmount]);

  // Gọi API lấy thông tin số dư ví từ backend
  const fetchWalletData = useCallback(async () => {
    try {
      setWalletError(null);
      const res = await api.get<any>('/api/credits/me');
      const payload = res?.data || res;
      if (payload && typeof payload.availableCredits === 'number') {
        setWallet({
          id: payload.id,
          availableCredits: payload.availableCredits,
          reservedCredits: payload.reservedCredits ?? 0,
        });
      } else {
        setWallet({ availableCredits: 0, reservedCredits: 0 });
      }
    } catch (err: any) {
      setWalletError(err?.message || 'Không thể tải thông tin ví credit.');
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  // Gọi API lấy lịch sử giao dịch từ backend theo loại lọc
  const fetchLedgerData = useCallback(async (typeFilter: string) => {
    setLoadingLedger(true);
    try {
      const typeParam = typeFilter !== 'ALL' ? `&type=${typeFilter}` : '';
      const res = await api.get<any>(`/api/credits/me/ledger?page=1&limit=30${typeParam}`);
      const payload = res?.data || res;
      const list = Array.isArray(payload) ? payload : payload?.items;
      if (Array.isArray(list)) {
        setLedgerItems(list);
      } else {
        setLedgerItems([]);
      }
    } catch {
      setLedgerItems([]);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  // Tải dữ liệu ban đầu từ BE
  useEffect(() => {
    let active = true;

    // 1. Tải số dư ví
    api
      .get<any>('/api/credits/me')
      .then((res) => {
        if (!active) return;
        const payload = res?.data || res;
        if (payload && typeof payload.availableCredits === 'number') {
          setWallet({
            id: payload.id,
            availableCredits: payload.availableCredits,
            reservedCredits: payload.reservedCredits ?? 0,
          });
        } else {
          setWallet({ availableCredits: 0, reservedCredits: 0 });
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setWalletError(err?.message || 'Không thể tải thông tin ví credit.');
      })
      .finally(() => {
        if (active) setLoadingWallet(false);
      });

    // 2. Tải lịch sử giao dịch
    api
      .get<any>('/api/credits/me/ledger?page=1&limit=30')
      .then((res) => {
        if (!active) return;
        const payload = res?.data || res;
        const list = Array.isArray(payload) ? payload : payload?.items;
        setLedgerItems(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (active) setLedgerItems([]);
      })
      .finally(() => {
        if (active) setLoadingLedger(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Xử lý làm mới toàn bộ dữ liệu từ API
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchWalletData(), fetchLedgerData(filterType)]);
    } finally {
      setRefreshing(false);
    }
  };

  // Xử lý thay đổi bộ lọc lịch sử
  const handleFilterChange = (newType: 'ALL' | 'SETTLE' | 'RESERVE' | 'TOPUP') => {
    setFilterType(newType);
    fetchLedgerData(newType);
  };

  // Danh sách lịch sử giao dịch sau khi lọc theo ngày tháng
  const filteredLedgerItems = useMemo(() => {
    if (!ledgerItems || ledgerItems.length === 0) return [];
    if (dateFilter === 'ALL') return ledgerItems;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return ledgerItems.filter((item) => {
      if (!item.createdAt) return false;
      const itemTime = new Date(item.createdAt).getTime();
      if (isNaN(itemTime)) return false;

      switch (dateFilter) {
        case 'TODAY':
          return itemTime >= startOfToday;
        case 'WEEK':
          return itemTime >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
        case 'MONTH':
          return itemTime >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
        case 'THIS_MONTH': {
          const itemDate = new Date(item.createdAt);
          return (
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear()
          );
        }
        default:
          return true;
      }
    });
  }, [ledgerItems, dateFilter]);

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
        {/* ================= 1. CARD SỐ DƯ VÍ TỪ BE ================= */}
        <View style={styles.balanceCard}>
          {/* Hàng trên: Tiêu đề ví & Nút làm mới */}
          <View style={styles.balanceHeader}>
            <View style={styles.balanceHeaderLeft}>
              <Ionicons name="sparkles" size={15} color="#BAE6FD" style={{ marginRight: 6 }} />
              <Text style={styles.balanceCardTitle}>VÍ AI 3S GYM</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.75 }]}
              onPress={handleManualRefresh}
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
          {loadingWallet ? (
            <View style={styles.loadingWalletWrap}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingWalletText}>Đang đồng bộ số dư từ máy chủ...</Text>
            </View>
          ) : walletError ? (
            <View style={styles.errorWalletWrap}>
              <Text style={styles.errorWalletText}>{walletError}</Text>
              <Pressable style={styles.retryBtn} onPress={fetchWalletData}>
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.balanceBody}>
              <View style={styles.availableCol}>
                <Text style={styles.availableLabel}>CREDIT KHẢ DỤNG</Text>
                <View style={styles.availableValueRow}>
                  <Text style={styles.availableNumber}>
                    {(wallet?.availableCredits ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.availableUnit}>credit</Text>
                </View>
              </View>

              <View style={styles.holdBadge}>
                <Text style={styles.holdLabel}>ĐANG TẠM GIỮ</Text>
                <View style={styles.holdValueRow}>
                  <Text style={styles.holdNumber}>
                    {(wallet?.reservedCredits ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.holdUnit}>credit</Text>
                </View>
              </View>
            </View>
          )}
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
              {DEFAULT_PRESETS.map((pkg) => {
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

          {/* Phương thức thanh toán bằng mã QR */}
          <View style={styles.paymentMethodBox}>
            <View style={styles.methodHeaderRow}>
              <View style={styles.methodHeaderLeft}>
                <Ionicons name="qr-code-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.methodTitle}>Thanh toán bằng mã QR</Text>
              </View>
            </View>
            <Text style={styles.bankSupportText}>
              Hỗ trợ: VCB, MB Bank, Techcombank, ACB, VPBank, MoMo, ZaloPay và 40+ ngân hàng...
            </Text>
            <Image
              source={BANNER_WALLET}
              style={styles.bankBannerImage}
              resizeMode="contain"
            />
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

        {/* ================= 3. LỊCH SỬ GIAO DỊCH TỪ BE ================= */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleRow}>
              <View style={styles.historyHeaderLeft}>
                <Feather name="clock" size={15} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.sectionHeading}>Lịch sử giao dịch credit</Text>
              </View>
              <Pressable
                style={[
                  styles.filterIconButton,
                  dateFilter !== 'ALL' && styles.filterIconButtonActive,
                ]}
                onPress={() => setShowDateFilterModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Lọc theo ngày tháng"
              >
                <Ionicons
                  name="filter"
                  size={15}
                  color={dateFilter !== 'ALL' ? '#FFFFFF' : '#475569'}
                />
              </Pressable>
            </View>

            {/* Filter pills */}
            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterPill, filterType === 'ALL' && styles.filterPillActive]}
                onPress={() => handleFilterChange('ALL')}
              >
                <Text style={[styles.filterText, filterType === 'ALL' && styles.filterTextActive]}>
                  Tất cả
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, filterType === 'SETTLE' && styles.filterPillActive]}
                onPress={() => handleFilterChange('SETTLE')}
              >
                <Text style={[styles.filterText, filterType === 'SETTLE' && styles.filterTextActive]}>
                  Quyết toán
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, filterType === 'RESERVE' && styles.filterPillActive]}
                onPress={() => handleFilterChange('RESERVE')}
              >
                <Text style={[styles.filterText, filterType === 'RESERVE' && styles.filterTextActive]}>
                  Tạm giữ
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, filterType === 'TOPUP' && styles.filterPillActive]}
                onPress={() => handleFilterChange('TOPUP')}
              >
                <Text style={[styles.filterText, filterType === 'TOPUP' && styles.filterTextActive]}>
                  Nạp tiền
                </Text>
              </Pressable>
            </View>

            {/* Chip hiển thị bộ lọc ngày tháng khi đang kích hoạt */}
            {dateFilter !== 'ALL' && (
              <View style={styles.activeFilterChipRow}>
                <View style={styles.activeFilterChip}>
                  <Ionicons name="calendar-outline" size={12} color="#0284C7" style={{ marginRight: 4 }} />
                  <Text style={styles.activeFilterChipText}>
                    {DATE_FILTER_OPTIONS.find((o) => o.key === dateFilter)?.label}
                  </Text>
                  <Pressable
                    onPress={() => setDateFilter('ALL')}
                    style={styles.clearDateFilterBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Bỏ lọc ngày"
                  >
                    <Ionicons name="close-circle" size={14} color="#0284C7" />
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {loadingLedger ? (
            <View style={styles.loadingLedgerBox}>
              <ActivityIndicator size="small" color="#0284C7" />
              <Text style={styles.loadingLedgerText}>Đang tải lịch sử giao dịch từ máy chủ...</Text>
            </View>
          ) : !filteredLedgerItems || filteredLedgerItems.length === 0 ? (
            <View style={styles.emptyHistoryBox}>
              <Feather name="inbox" size={24} color="#94A3B8" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyHistoryText}>
                {dateFilter !== 'ALL'
                  ? 'Không có giao dịch nào trong khoảng thời gian đã chọn.'
                  : 'Chưa có giao dịch credit nào trong mục này.'}
              </Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {filteredLedgerItems.map((tx, idx) => {
                const isNegative = tx.availableDelta < 0 || tx.reservedDelta < 0;
                const deltaNum = tx.availableDelta !== 0 ? tx.availableDelta : tx.reservedDelta;
                const deltaSign = deltaNum > 0 ? `+${deltaNum}` : `${deltaNum}`;

                let typeLabel = 'Giao dịch AI';
                if (tx.type === 'SETTLE') typeLabel = 'Quyết toán AI';
                else if (tx.type === 'RESERVE') typeLabel = 'Tạm giữ AI';
                else if (tx.type === 'TOPUP') typeLabel = 'Nạp credit';
                else if (tx.type === 'RELEASE') typeLabel = 'Hoàn trả AI';
                else if (tx.type === 'ADJUSTMENT') typeLabel = 'Điều chỉnh';

                return (
                  <View key={tx._id || tx.id || `ledger-${idx}`} style={styles.txItem}>
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
                          {typeLabel}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.txDeltaText,
                          isNegative ? styles.txDeltaNegative : styles.txDeltaPositive,
                        ]}
                      >
                        {deltaSign} credit
                      </Text>
                    </View>

                    {/* Hàng giữa: Ghi chú tác vụ thực tế từ BE */}
                    <Text style={styles.txNoteText} numberOfLines={2}>
                      {tx.reason || 'Giao dịch hệ thống AI 3S Gym'}
                    </Text>

                    {/* Hàng dưới: Thời gian & Số dư sau giao dịch */}
                    <View style={styles.txBottomRow}>
                      <Text style={styles.txDateText}>{formatDate(tx.createdAt)}</Text>
                      {typeof tx.availableAfter === 'number' && (
                        <Text style={styles.txBalanceAfterText}>
                          Số dư sau:{' '}
                          <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                            {tx.availableAfter.toLocaleString()}
                          </Text>
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Popup thông báo tính năng đang cập nhật */}
      <AppAlertModal
        visible={showUnderDevModal}
        type="info"
        title="Tính năng đang được cập nhật"
        message="Tính năng tạo mã QR thanh toán đang được cập nhật. Vui lòng liên hệ quản trị viên để biết thêm chi tiết."
        confirmLabel="Đã hiểu"
        onConfirm={() => setShowUnderDevModal(false)}
      />

      {/* Modal lọc theo ngày tháng */}
      <Modal
        visible={showDateFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateFilterModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDateFilterModal(false)}>
          <Pressable style={styles.filterModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.filterModalHeader}>
              <View style={styles.filterModalHeaderLeft}>
                <Ionicons name="calendar-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                <Text style={styles.filterModalTitle}>Lọc theo thời gian</Text>
              </View>
              <Pressable
                style={styles.filterModalCloseBtn}
                onPress={() => setShowDateFilterModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Đóng bộ lọc"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.filterOptionsList}>
              {DATE_FILTER_OPTIONS.map((opt) => {
                const isSelected = dateFilter === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.filterOptionItem,
                      isSelected && styles.filterOptionItemSelected,
                    ]}
                    onPress={() => {
                      setDateFilter(opt.key);
                      setShowDateFilterModal(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                  >
                    <Text
                      style={[
                        styles.filterOptionLabel,
                        isSelected && styles.filterOptionLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#0284C7" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  loadingWalletWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  loadingWalletText: {
    fontSize: 12,
    color: '#E0F2FE',
    fontWeight: '600',
  },
  errorWalletWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  errorWalletText: {
    fontSize: 12,
    color: '#FEE2E2',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
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
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  methodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  bankSupportText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  bankBannerImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
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
    marginBottom: 12,
    gap: 8,
  },
  historyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterIconButtonActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  activeFilterChipRow: {
    width: '100%',
    marginTop: 4,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginRight: 4,
  },
  clearDateFilterBtn: {
    padding: 2,
  },

  /* MODAL LỌC THEO NGÀY THÁNG */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterModalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
  },
  filterOptionsList: {
    gap: 8,
  },
  filterOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 44,
  },
  filterOptionItemSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  filterOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  filterOptionLabelSelected: {
    color: '#0284C7',
    fontWeight: '700',
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
  loadingLedgerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingLedgerText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyHistoryBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#94A3B8',
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
});
