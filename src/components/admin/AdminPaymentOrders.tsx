import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api/client';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { display, type AdminRecord } from '@/services/adminResources';
import {
  resolveAdminUsers,
  formatUserDisplay,
  type AdminUserParty,
} from '@/services/adminUsers';

export interface PaymentOrderRecord extends AdminRecord {
  _id?: string;
  id?: string;
  orderCode?: string;
  userId?: string | AdminUserParty;
  amountVnd?: number;
  grantCredits?: number;
  gateway?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Đã thanh toán', color: '#16A34A', bg: '#DCFCE7' },
  COMPLETED: { label: 'Hoàn thành', color: '#16A34A', bg: '#DCFCE7' },
  PENDING: { label: 'Chờ thanh toán', color: '#D97706', bg: '#FEF3C7' },
  FAILED: { label: 'Thất bại', color: '#EF4444', bg: '#FEE2E2' },
  CANCELLED: { label: 'Đã hủy', color: '#64748B', bg: '#F1F5F9' },
  EXPIRED: { label: 'Hết hạn', color: '#64748B', bg: '#F1F5F9' },
};

function OrderDetailSheet({
  order,
  onClose,
}: {
  order: PaymentOrderRecord;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const st = statusMap[order.status || ''] || {
    label: order.status || '—',
    color: '#64748B',
    bg: '#F1F5F9',
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Chi tiết đơn nạp credit</Text>
              <Text style={styles.sheetSub}>Mã đơn: #{order.orderCode || order._id || order.id}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
            {/* Amount & Credits Big Banner */}
            <View style={styles.detailAmountBanner}>
              <View style={styles.detailAmountLeft}>
                <Text style={styles.detailAmountLabel}>Số tiền thanh toán</Text>
                <Text style={styles.detailAmountVnd}>
                  {Number(order.amountVnd || 0).toLocaleString('vi-VN')} VNĐ
                </Text>
              </View>

              <View style={styles.detailAmountRight}>
                <Text style={styles.detailAmountLabel}>Credit thực nhận</Text>
                <Text style={styles.detailGrantCredits}>
                  +{order.grantCredits || 0} Credit
                </Text>
              </View>
            </View>

            {/* Info Grid */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Trạng thái đơn:</Text>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                  <Text style={[styles.statusBadgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Cổng thanh toán:</Text>
                <Text style={styles.detailRowValue}>{order.gateway || 'Chưa xác định'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Tài khoản người nạp:</Text>
                <Text style={styles.detailRowValue}>{formatUserDisplay(order.userId)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Thời gian tạo:</Text>
                <Text style={styles.detailRowValue}>
                  {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}
                </Text>
              </View>

              {order.updatedAt ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Cập nhật lần cuối:</Text>
                  <Text style={styles.detailRowValue}>
                    {new Date(order.updatedAt).toLocaleString('vi-VN')}
                  </Text>
                </View>
              ) : null}

              {order._id || order.id ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>ID hệ thống:</Text>
                  <Text style={[styles.detailRowValue, styles.codeText]}>
                    {order._id || order.id}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Pressable onPress={onClose} style={styles.sheetOkBtn}>
              <Text style={styles.sheetOkText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminPaymentOrders() {
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrderRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (appliedSearch.trim()) params.set('keyword', appliedSearch.trim());
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.getPage<PaymentOrderRecord>(
        `/api/admin/payment-orders?${params.toString()}`
      );
      const raw = res.data || [];
      const resolved = await resolveAdminUsers(raw, ['userId']);
      setOrders(resolved);
      setTotal(res.meta?.total ?? raw.length);
      setPages(Math.max(1, res.meta?.totalPages || 1));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, appliedSearch, statusFilter]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) void load();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleSearchSubmit = () => {
    setAppliedSearch(keyword);
    setPage(1);
  };

  const handleClearSearch = () => {
    setKeyword('');
    setAppliedSearch('');
    setPage(1);
  };

  const paidCount = orders.filter((o) => o.status === 'PAID' || o.status === 'COMPLETED').length;
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <View style={styles.container}>
      {/* 1. STATS BANNER (Vertical Layout) */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatusFilter('');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="receipt" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{total}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng số đơn
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatusFilter('PAID');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{paidCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Đã nạp tiền
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatusFilter('PENDING');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={16} color="#D97706" />
            </View>
            <Text style={[styles.statValue, { color: '#D97706' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Chờ thanh toán
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã đơn, tài khoản…"
            placeholderTextColor="#94A3B8"
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {keyword ? (
            <Pressable onPress={handleClearSearch} hitSlop={8}>
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => void load()}
          disabled={loading}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* 3. FILTER PILLS */}
      <View style={styles.filterPillsRow}>
        {[
          { value: '', label: 'Tất cả' },
          { value: 'PAID', label: 'Đã nạp' },
          { value: 'PENDING', label: 'Chờ nạp' },
          { value: 'FAILED', label: 'Lỗi / Hủy' },
        ].map((pill) => (
          <Pressable
            key={pill.value}
            onPress={() => {
              setStatusFilter(pill.value);
              setPage(1);
            }}
            style={[
              styles.filterPill,
              statusFilter === pill.value && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === pill.value && styles.filterPillTextActive,
              ]}
            >
              {pill.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 4. ORDERS LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.statusBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusBoxText}>Đang tải danh sách đơn nạp tiền…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>Chưa có đơn nạp tiền nào phù hợp.</Text>
          </View>
        ) : (
          orders.map((order) => {
            const st = statusMap[order.status || ''] || {
              label: order.status || '—',
              color: '#64748B',
              bg: '#F1F5F9',
            };

            return (
              <Pressable
                key={order._id || order.id || order.orderCode}
                onPress={() => setSelectedOrder(order)}
                style={({ pressed }) => [
                  styles.orderCard,
                  pressed && { opacity: 0.92 },
                ]}
              >
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.orderIconBox}>
                    <Ionicons name="receipt" size={18} color={colors.primary} />
                  </View>

                  <View style={styles.headerInfo}>
                    <Text style={styles.orderCode} numberOfLines={1}>
                      #{order.orderCode || 'ORDER'}
                    </Text>
                    <Text style={styles.orderUser} numberOfLines={1}>
                      {formatUserDisplay(order.userId)}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                    <Text style={[styles.statusBadgeText, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                </View>

                {/* Amount & Credits Row */}
                <View style={styles.amountCreditsRow}>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountValue}>
                      {Number(order.amountVnd || 0).toLocaleString('vi-VN')} VNĐ
                    </Text>
                  </View>

                  <View style={styles.grantCreditBadge}>
                    <Ionicons name="sparkles" size={13} color="#0284C7" />
                    <Text style={styles.grantCreditText}>
                      +{order.grantCredits || 0} Credit
                    </Text>
                  </View>
                </View>

                {/* Footer details */}
                <View style={styles.cardFooterRow}>
                  {order.gateway ? (
                    <View style={styles.gatewayChip}>
                      <Text style={styles.gatewayChipText}>{order.gateway}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.orderDateText}>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString('vi-VN')
                      : '—'}
                  </Text>

                  <View style={{ flex: 1 }} />
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </View>
              </Pressable>
            );
          })
        )}

        {/* Pagination */}
        {!loading && !error && pages > 1 && (
          <View style={styles.paginationRow}>
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            >
              <Feather name="chevron-left" size={16} color={page <= 1 ? '#94A3B8' : colors.text} />
              <Text style={[styles.pageBtnText, page <= 1 && { color: '#94A3B8' }]}>Trước</Text>
            </Pressable>

            <Text style={styles.pageInfoText}>
              Trang {page} / {pages}
            </Text>

            <Pressable
              disabled={page >= pages}
              onPress={() => setPage((p) => Math.min(pages, p + 1))}
              style={[styles.pageBtn, page >= pages && styles.pageBtnDisabled]}
            >
              <Text style={[styles.pageBtnText, page >= pages && { color: '#94A3B8' }]}>Sau</Text>
              <Feather
                name="chevron-right"
                size={16}
                color={page >= pages ? '#94A3B8' : colors.text}
              />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Detail Bottom Sheet */}
      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.text,
    paddingVertical: 0,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  statusBoxText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statusBoxError: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    justifyContent: 'center',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  orderUser: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amountCreditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  amountBox: {},
  amountValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  grantCreditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  grantCreditText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gatewayChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gatewayChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  orderDateText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pageInfoText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  // Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScroll: {
    paddingVertical: 14,
    gap: 14,
  },
  detailAmountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 14,
  },
  detailAmountLeft: {},
  detailAmountRight: {
    alignItems: 'flex-end',
  },
  detailAmountLabel: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  detailAmountVnd: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  detailGrantCredits: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
  },
  detailSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRowLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  detailRowValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11.5,
  },
  sheetFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sheetOkBtn: {
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
