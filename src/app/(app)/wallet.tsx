import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePickerModal } from '@/components/DatePickerModal';
import { api } from '@/services/api/client';

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

export type DateFilterType = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'THIS_MONTH' | 'CUSTOM';

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
  const [filterType, setFilterType] = useState<'ALL' | 'TOPUP' | 'USAGE'>('ALL');

  // Trạng thái refresh
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Lọc theo ngày tháng trong lịch sử giao dịch
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [showDateFilterModal, setShowDateFilterModal] = useState<boolean>(false);

  // Chọn ngày tùy chỉnh (Từ ngày - Đến ngày)
  const [customStartDate, setCustomStartDate] = useState<string>(''); // YYYY-MM-DD
  const [customEndDate, setCustomEndDate] = useState<string>(''); // YYYY-MM-DD
  const [customStartDisplay, setCustomStartDisplay] = useState<string>(''); // DD/MM/YYYY
  const [customEndDisplay, setCustomEndDisplay] = useState<string>(''); // DD/MM/YYYY
  const [datePickerTarget, setDatePickerTarget] = useState<'START' | 'END' | null>(null);



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

  // Gọi API lấy lịch sử giao dịch từ backend
  const fetchLedgerData = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const res = await api.get<any>(`/api/credits/me/ledger?page=1&limit=100`);
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
      .get<any>('/api/credits/me/ledger?page=1&limit=100')
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
      await Promise.all([fetchWalletData(), fetchLedgerData()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Xử lý thay đổi bộ lọc lịch sử (Chỉ có Nạp credit và Sử dụng AI)
  const handleFilterChange = (newType: 'ALL' | 'TOPUP' | 'USAGE') => {
    setFilterType(newType);
  };

  // Danh sách lịch sử giao dịch sau khi lọc theo loại và ngày tháng
  const filteredLedgerItems = useMemo(() => {
    if (!ledgerItems || ledgerItems.length === 0) return [];

    let items = ledgerItems;

    // 1. Lọc theo loại giao dịch (Tất cả / Nạp credit / Sử dụng AI)
    if (filterType === 'TOPUP') {
      items = items.filter(
        (item) => item.type === 'TOPUP' || item.type === 'ADJUSTMENT' || item.availableDelta > 0
      );
    } else if (filterType === 'USAGE') {
      items = items.filter(
        (item) =>
          item.type === 'SETTLE' ||
          item.type === 'RESERVE' ||
          item.type === 'USAGE' ||
          item.availableDelta < 0
      );
    }

    // 2. Lọc theo ngày tháng
    if (dateFilter === 'ALL') return items;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return items.filter((item) => {
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
        case 'CUSTOM': {
          let matches = true;
          if (customStartDate) {
            const [y, m, d] = customStartDate.split('-').map(Number);
            const startTimestamp = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
            if (itemTime < startTimestamp) matches = false;
          }
          if (customEndDate) {
            const [y, m, d] = customEndDate.split('-').map(Number);
            const endTimestamp = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
            if (itemTime > endTimestamp) matches = false;
          }
          return matches;
        }
        default:
          return true;
      }
    });
  }, [ledgerItems, filterType, dateFilter, customStartDate, customEndDate]);

  // Đặt lại bộ lọc ngày
  const handleResetDateFilter = () => {
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setCustomStartDisplay('');
    setCustomEndDisplay('');
  };

  // Lấy nhãn hiển thị cho bộ lọc ngày tùy chỉnh
  const getCustomFilterLabel = () => {
    if (customStartDate && customEndDate) {
      if (customStartDate === customEndDate) {
        return `Ngày: ${customStartDisplay}`;
      }
      return `${customStartDisplay} - ${customEndDisplay}`;
    }
    if (customStartDisplay) return `Ngày: ${customStartDisplay}`;
    if (customEndDisplay) return `Đến ngày: ${customEndDisplay}`;
    return 'Tùy chọn ngày';
  };

  // Mở modal chọn ngày từ lịch
  const openDatePicker = (target: 'START' | 'END') => {
    setDatePickerTarget(target);
    setShowDateFilterModal(false);
  };

  // Xử lý khi đã chọn ngày từ lịch
  const handleDatePicked = (isoDate: string, displayDate: string) => {
    if (datePickerTarget === 'START') {
      setCustomStartDate(isoDate);
      setCustomStartDisplay(displayDate);
      if (!customEndDate || customEndDate < isoDate) {
        setCustomEndDate(isoDate);
        setCustomEndDisplay(displayDate);
      }
    } else if (datePickerTarget === 'END') {
      setCustomEndDate(isoDate);
      setCustomEndDisplay(displayDate);
      if (!customStartDate) {
        setCustomStartDate(isoDate);
        setCustomStartDisplay(displayDate);
      }
    }
    setDatePickerTarget(null);
    setShowDateFilterModal(true);
  };



  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.navigate('/(app)/(tabs)');
            }
          }}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Ví credit AI</Text>
          <Text style={styles.pageSubtitle}>Theo dõi số dư và nhật ký sử dụng AI</Text>
        </View>
        <View style={styles.topBalanceBadge}>
          <Ionicons name="sparkles" size={12} color="#0284C7" style={{ marginRight: 4 }} />
          <Text style={styles.topBalanceText}>
            {(wallet?.availableCredits ?? 0).toLocaleString()} cr
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleManualRefresh}
            colors={['#0284C7']}
            tintColor="#0284C7"
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
      >
        {/* ================= THẺ SỐ DƯ CREDIT AI ================= */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardTop}>
            <View style={styles.balanceIconWrap}>
              <Ionicons name="sparkles" size={22} color="#0284C7" />
            </View>
            <View style={styles.balanceTitleBox}>
              <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
              <Text style={styles.balanceValue}>
                {loadingWallet ? '...' : (wallet?.availableCredits ?? 0).toLocaleString('vi-VN')}{' '}
                <Text style={styles.balanceUnit}>Credit</Text>
              </Text>
            </View>
          </View>

          {Boolean(wallet?.reservedCredits) && (
            <View style={styles.reservedRow}>
              <Text style={styles.reservedLabel}>Credit đang giữ chỗ tác vụ:</Text>
              <Text style={styles.reservedValue}>
                {(wallet?.reservedCredits ?? 0).toLocaleString('vi-VN')} Credit
              </Text>
            </View>
          )}

          <View style={styles.balanceDivider} />

          <View style={styles.balanceInfoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0284C7" style={{ marginTop: 2, marginRight: 6 }} />
            <Text style={styles.balanceInfoText}>
              Credit được cấp dùng để xử lý các tác vụ AI như phân tích InBody, xây dựng thực đơn dinh dưỡng và thiết kế lộ trình tập luyện.
            </Text>
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

            {/* Filter pills: Chỉ gồm Tất cả, Nạp credit, Sử dụng AI */}
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
                style={[styles.filterPill, filterType === 'USAGE' && styles.filterPillActive]}
                onPress={() => handleFilterChange('USAGE')}
              >
                <Text style={[styles.filterText, filterType === 'USAGE' && styles.filterTextActive]}>
                  Sử dụng AI
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, filterType === 'TOPUP' && styles.filterPillActive]}
                onPress={() => handleFilterChange('TOPUP')}
              >
                <Text style={[styles.filterText, filterType === 'TOPUP' && styles.filterTextActive]}>
                  Cộng credit
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, filterType === 'USAGE' && styles.filterPillActive]}
                onPress={() => handleFilterChange('USAGE')}
              >
                <Text style={[styles.filterText, filterType === 'USAGE' && styles.filterTextActive]}>
                  Sử dụng AI
                </Text>
              </Pressable>
            </View>

            {/* Chip hiển thị bộ lọc ngày tháng khi đang kích hoạt */}
            {dateFilter !== 'ALL' && (
              <View style={styles.activeFilterChipRow}>
                <View style={styles.activeFilterChip}>
                  <Ionicons name="calendar-outline" size={12} color="#0284C7" style={{ marginRight: 4 }} />
                  <Text style={styles.activeFilterChipText}>
                    {dateFilter === 'CUSTOM'
                      ? getCustomFilterLabel()
                      : DATE_FILTER_OPTIONS.find((o) => o.key === dateFilter)?.label}
                  </Text>
                  <Pressable
                    onPress={handleResetDateFilter}
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

                const isTopup = tx.type === 'TOPUP' || tx.type === 'ADJUSTMENT' || deltaNum > 0;
                const isUsage = tx.type === 'SETTLE' || tx.type === 'RESERVE' || tx.type === 'USAGE' || deltaNum < 0;

                let typeLabel = 'Cộng credit';
                if (isTopup) {
                  typeLabel = 'Cộng credit';
                } else if (isUsage) {
                  typeLabel = 'Sử dụng AI';
                } else if (tx.type === 'RELEASE') {
                  typeLabel = 'Hoàn credit';
                }

                return (
                  <View key={tx._id || tx.id || `ledger-${idx}`} style={styles.txItem}>
                    {/* Hàng trên: Badge loại & Biến động credit */}
                    <View style={styles.txTopRow}>
                      <View
                        style={[
                          styles.txTypeBadge,
                          isUsage && styles.txTypeSettle,
                          isTopup && styles.txTypeTopup,
                        ]}
                      >
                        <Text
                          style={[
                            styles.txTypeText,
                            isUsage && styles.txTypeTextSettle,
                            isTopup && styles.txTypeTextTopup,
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

            {/* Danh sách mốc thời gian nhanh */}
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
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setCustomStartDisplay('');
                      setCustomEndDisplay('');
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

            {/* Phân cách */}
            <View style={styles.customDateDivider} />

            {/* Mục chọn ngày tùy chỉnh */}
            <View style={styles.customDateSection}>
              <Text style={styles.customDateSectionTitle}>Hoặc chọn ngày cụ thể:</Text>
              <View style={styles.customDateRow}>
                <View style={styles.customDateField}>
                  <Text style={styles.customDateLabel}>Từ ngày</Text>
                  <Pressable
                    style={styles.customDateInputBtn}
                    onPress={() => openDatePicker('START')}
                    accessibilityRole="button"
                    accessibilityLabel="Chọn từ ngày"
                  >
                    <Ionicons name="calendar-outline" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text
                      style={[
                        styles.customDateInputText,
                        !customStartDisplay && styles.customDatePlaceholder,
                      ]}
                    >
                      {customStartDisplay || 'DD/MM/YYYY'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.customDateField}>
                  <Text style={styles.customDateLabel}>Đến ngày</Text>
                  <Pressable
                    style={styles.customDateInputBtn}
                    onPress={() => openDatePicker('END')}
                    accessibilityRole="button"
                    accessibilityLabel="Chọn đến ngày"
                  >
                    <Ionicons name="calendar-outline" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text
                      style={[
                        styles.customDateInputText,
                        !customEndDisplay && styles.customDatePlaceholder,
                      ]}
                    >
                      {customEndDisplay || 'DD/MM/YYYY'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Nút thao tác chọn ngày */}
              <View style={styles.customDateActionRow}>
                {Boolean(customStartDate || customEndDate) && (
                  <Pressable
                    style={styles.customDateResetBtn}
                    onPress={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setCustomStartDisplay('');
                      setCustomEndDisplay('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Xóa ngày đã chọn"
                  >
                    <Text style={styles.customDateResetText}>Xóa ngày</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.customDateApplyBtn,
                    !customStartDate && !customEndDate && styles.customDateApplyBtnDisabled,
                  ]}
                  disabled={!customStartDate && !customEndDate}
                  onPress={() => {
                    setDateFilter('CUSTOM');
                    setShowDateFilterModal(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Áp dụng ngày chọn"
                >
                  <Text style={styles.customDateApplyBtnText}>Áp dụng ngày chọn</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* DatePickerModal chọn ngày cụ thể từ lịch */}
      <DatePickerModal
        visible={datePickerTarget !== null}
        title={datePickerTarget === 'START' ? 'Chọn từ ngày' : 'Chọn đến ngày'}
        value={datePickerTarget === 'START' ? customStartDate : customEndDate}
        onClose={() => {
          setDatePickerTarget(null);
          setShowDateFilterModal(true);
        }}
        onSelect={handleDatePicked}
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
  topBalanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  topBalanceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
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
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  balanceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  balanceIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceTitleBox: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0284C7',
    marginTop: 2,
  },
  balanceUnit: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0369A1',
  },
  reservedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
  },
  reservedLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  reservedValue: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  balanceInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
  },
  balanceInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 17,
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
  customDateDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  customDateSection: {
    gap: 8,
  },
  customDateSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customDateField: {
    flex: 1,
  },
  customDateLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  customDateInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  customDateInputText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  customDatePlaceholder: {
    color: '#94A3B8',
  },
  customDateActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  customDateResetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  customDateResetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  customDateApplyBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customDateApplyBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  customDateApplyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
