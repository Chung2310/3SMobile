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
import { router } from 'expo-router';
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
import { taskTypeFriendlyNames } from './AdminPricing';

export interface CreditShortfallRecord extends AdminRecord {
  _id?: string;
  id?: string;
  userId?: string | AdminUserParty;
  taskType?: string;
  billingShortfall?: number;
  reservedCredits?: number;
  reason?: string;
  createdAt?: string;
}

function ShortfallDetailSheet({
  record,
  onClose,
  onGoAdjust,
}: {
  record: CreditShortfallRecord;
  onClose: () => void;
  onGoAdjust: () => void;
}) {
  const insets = useSafeAreaInsets();
  const friendlyName = taskTypeFriendlyNames[record.taskType || ''] || record.taskType || 'Tác vụ AI';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Sự cố thiếu hụt credit</Text>
              <Text style={styles.sheetSub}>
                {record.createdAt ? new Date(record.createdAt).toLocaleString('vi-VN') : '—'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
            {/* Shortfall Alert Banner */}
            <View style={styles.detailAlertBanner}>
              <View>
                <Text style={styles.detailAlertLabel}>Credit thiếu hụt cần bù</Text>
                <Text style={styles.detailAlertValue}>
                  -{record.billingShortfall ?? 0} Credit
                </Text>
              </View>

              <View style={styles.reservedBadge}>
                <Text style={styles.reservedBadgeLabel}>Đã giữ chỗ</Text>
                <Text style={styles.reservedBadgeValue}>
                  {record.reservedCredits ?? 0} Credit
                </Text>
              </View>
            </View>

            {/* Info Grid */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Tác vụ AI bị thiếu:</Text>
                <Text style={styles.detailRowValue}>{friendlyName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Mã hệ thống:</Text>
                <Text style={[styles.detailRowValue, styles.codeText]}>
                  {record.taskType || '—'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Tài khoản hội viên:</Text>
                <Text style={styles.detailRowValue}>{formatUserDisplay(record.userId)}</Text>
              </View>

              {record.reason ? (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={styles.detailRowLabel}>Nguyên nhân:</Text>
                  <Text style={[styles.detailRowValue, { flex: 1, textAlign: 'right', marginLeft: 12 }]}>
                    {record.reason}
                  </Text>
                </View>
              ) : null}

              {record._id || record.id ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>ID sự cố:</Text>
                  <Text style={[styles.detailRowValue, styles.codeText]}>
                    {record._id || record.id}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Sheet Actions */}
          <View style={styles.sheetFooter}>
            <Pressable onPress={onClose} style={styles.sheetCancelBtn}>
              <Text style={styles.sheetCancelText}>Đóng</Text>
            </Pressable>

            <Pressable onPress={onGoAdjust} style={styles.sheetAdjustBtn}>
              <Ionicons name="swap-vertical" size={17} color="#FFFFFF" />
              <Text style={styles.sheetAdjustText}>Điều chỉnh credit</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminCreditShortfalls() {
  const [shortfalls, setShortfalls] = useState<CreditShortfallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CreditShortfallRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (appliedSearch.trim()) params.set('keyword', appliedSearch.trim());

      const res = await api.getPage<CreditShortfallRecord>(
        `/api/admin/credit-shortfalls?${params.toString()}`
      );
      const raw = res.data || [];
      const resolved = await resolveAdminUsers(raw, ['userId']);
      setShortfalls(resolved);
      setTotal(res.meta?.total ?? raw.length);
      setPages(Math.max(1, res.meta?.totalPages || 1));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, appliedSearch]);

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

  const handleGoAdjust = () => {
    setSelectedRecord(null);
    router.push({
      pathname: '/(app)/admin/[section]',
      params: { section: 'credits' },
    });
  };

  // Aggregated metrics
  const totalShortfallCredits = shortfalls.reduce(
    (sum, item) => sum + (item.billingShortfall || 0),
    0
  );

  return (
    <View style={styles.container}>
      {/* 1. STATS BANNER */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{total}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Lượt thiếu hụt
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="flash-off" size={16} color="#D97706" />
            </View>
            <Text style={[styles.statValue, { color: '#D97706' }]}>
              {totalShortfallCredits}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng credit thiếu
            </Text>
          </View>

          <View style={styles.statDivider} />

          <Pressable style={styles.statItem} onPress={handleGoAdjust}>
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="swap-vertical" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>Bù credit</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Xử lý nhanh
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
            placeholder="Tìm theo tài khoản, tác vụ…"
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

      {/* 3. SHORTFALLS LIST */}
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
            <Text style={styles.statusBoxText}>Đang kiểm tra cảnh báo thiếu hụt credit…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : shortfalls.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#16A34A" />
            <Text style={styles.statusBoxText}>Tuyệt vời! Không có sự cố thiếu hụt credit nào.</Text>
          </View>
        ) : (
          shortfalls.map((record, index) => {
            const friendlyName =
              taskTypeFriendlyNames[record.taskType || ''] || record.taskType || 'Tác vụ AI';

            return (
              <Pressable
                key={record._id || record.id || `shortfall-${index}`}
                onPress={() => setSelectedRecord(record)}
                style={({ pressed }) => [
                  styles.shortfallCard,
                  pressed && { opacity: 0.92 },
                ]}
              >
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.warningIconBox}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  </View>

                  <View style={styles.headerInfo}>
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {friendlyName}
                    </Text>
                    <Text style={styles.userName} numberOfLines={1}>
                      {formatUserDisplay(record.userId)}
                    </Text>
                  </View>

                  <View style={styles.shortfallBadge}>
                    <Text style={styles.shortfallBadgeText}>
                      -{record.billingShortfall ?? 0} Credit
                    </Text>
                  </View>
                </View>

                {/* Footer details */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.reservedChip}>
                    <Text style={styles.reservedChipText}>
                      Giữ chỗ: {record.reservedCredits ?? 0} Credit
                    </Text>
                  </View>

                  <Text style={styles.dateText}>
                    {record.createdAt
                      ? new Date(record.createdAt).toLocaleString('vi-VN')
                      : '—'}
                  </Text>

                  <View style={{ flex: 1 }} />
                  <Feather name="chevron-right" size={15} color="#94A3B8" />
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
      {selectedRecord && (
        <ShortfallDetailSheet
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onGoAdjust={handleGoAdjust}
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
    marginBottom: 10,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
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
  shortfallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FEE2E2',
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
  warningIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  userName: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  shortfallBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shortfallBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDF2F2',
    paddingTop: 8,
  },
  reservedChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reservedChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  dateText: {
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
  detailAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
  },
  detailAlertLabel: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
  },
  detailAlertValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 2,
  },
  reservedBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  reservedBadgeLabel: {
    fontSize: 10.5,
    color: '#64748B',
  },
  reservedBadgeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sheetCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  sheetAdjustBtn: {
    flex: 1.4,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sheetAdjustText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
