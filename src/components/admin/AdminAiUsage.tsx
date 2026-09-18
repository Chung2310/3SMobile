import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api/client';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { display, type AdminRecord } from '@/services/adminResources';
import { taskTypeFriendlyNames } from './AdminPricing';

export interface AiUsageRecord extends AdminRecord {
  _id?: string;
  id?: string;
  userId?: string | AdminRecord;
  taskType?: string;
  status?: string;
  settledCredits?: number;
  promptTokens?: number;
  completionTokens?: number;
  errorMessage?: string;
  createdAt?: string;
}

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  SUCCESS: { label: 'Hoàn thành', color: '#16A34A', bg: '#DCFCE7' },
  COMPLETED: { label: 'Hoàn thành', color: '#16A34A', bg: '#DCFCE7' },
  FAILED: { label: 'Thất bại', color: '#EF4444', bg: '#FEE2E2' },
  TIMEOUT: { label: 'Hết thời gian', color: '#D97706', bg: '#FEF3C7' },
  CANCELLED: { label: 'Đã hủy', color: '#64748B', bg: '#F1F5F9' },
};

function UsageDetailSheet({
  record,
  onClose,
}: {
  record: AiUsageRecord;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const st = statusMap[record.status || ''] || {
    label: record.status || '—',
    color: '#64748B',
    bg: '#F1F5F9',
  };
  const friendlyName = taskTypeFriendlyNames[record.taskType || ''] || record.taskType || 'Tác vụ AI';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {friendlyName}
              </Text>
              <Text style={styles.sheetSub}>
                {record.createdAt ? new Date(record.createdAt).toLocaleString('vi-VN') : '—'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
            {/* Settled Credits Banner */}
            <View style={styles.detailCreditsBanner}>
              <View>
                <Text style={styles.detailCreditsLabel}>Credit quyết toán</Text>
                <Text style={styles.detailCreditsValue}>
                  {record.settledCredits ?? 0} Credit
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                <Text style={[styles.statusBadgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>

            {/* Error notice if failed */}
            {record.errorMessage ? (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorNoticeText}>{record.errorMessage}</Text>
              </View>
            ) : null}

            {/* Info Grid */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Mã tác vụ:</Text>
                <Text style={[styles.detailRowValue, styles.codeText]}>
                  {record.taskType || '—'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Tài khoản thực hiện:</Text>
                <Text style={styles.detailRowValue}>{display(record.userId)}</Text>
              </View>

              {record.promptTokens !== undefined ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Prompt Tokens:</Text>
                  <Text style={styles.detailRowValue}>{record.promptTokens}</Text>
                </View>
              ) : null}

              {record.completionTokens !== undefined ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Completion Tokens:</Text>
                  <Text style={styles.detailRowValue}>{record.completionTokens}</Text>
                </View>
              ) : null}

              {record._id || record.id ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>ID nhật ký:</Text>
                  <Text style={[styles.detailRowValue, styles.codeText]}>
                    {record._id || record.id}
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

export function AdminAiUsage() {
  const [usages, setUsages] = useState<AiUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AiUsageRecord | null>(null);

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

      const res = await api.getPage<AiUsageRecord>(
        `/api/admin/ai-usage?${params.toString()}`
      );
      setUsages(res.data || []);
      setTotal(res.meta?.total ?? res.data.length);
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

  const successCount = usages.filter(
    (u) => u.status === 'SUCCESS' || u.status === 'COMPLETED'
  ).length;
  const failedCount = usages.filter(
    (u) => u.status === 'FAILED' || u.status === 'TIMEOUT'
  ).length;

  return (
    <View style={styles.container}>
      {/* 1. STATS BANNER */}
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
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{total}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng tác vụ AI
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatusFilter('SUCCESS');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{successCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Hoàn thành
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatusFilter('FAILED');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{failedCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Thất bại / Lỗi
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

      {/* 3. FILTER PILLS */}
      <View style={styles.filterPillsRow}>
        {[
          { value: '', label: 'Tất cả' },
          { value: 'SUCCESS', label: 'Hoàn thành' },
          { value: 'FAILED', label: 'Thất bại' },
          { value: 'TIMEOUT', label: 'Hết giờ' },
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

      {/* 4. USAGE LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải nhật ký sử dụng AI…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : usages.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="hardware-chip-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>Chưa có nhật ký sử dụng AI nào.</Text>
          </View>
        ) : (
          usages.map((record, index) => {
            const st = statusMap[record.status || ''] || {
              label: record.status || '—',
              color: '#64748B',
              bg: '#F1F5F9',
            };
            const friendlyName =
              taskTypeFriendlyNames[record.taskType || ''] || record.taskType || 'Tác vụ AI';

            return (
              <Pressable
                key={record._id || record.id || `usage-${index}`}
                onPress={() => setSelectedRecord(record)}
                style={({ pressed }) => [
                  styles.usageCard,
                  pressed && { opacity: 0.92 },
                ]}
              >
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.usageIconBox}>
                    <Ionicons name="hardware-chip" size={18} color={colors.primary} />
                  </View>

                  <View style={styles.headerInfo}>
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {friendlyName}
                    </Text>
                    <Text style={styles.userName} numberOfLines={1}>
                      {display(record.userId)}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                    <Text style={[styles.statusBadgeText, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                </View>

                {/* Footer details */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.creditsChip}>
                    <Ionicons name="flash-outline" size={13} color="#0284C7" />
                    <Text style={styles.creditsChipText}>
                      {record.settledCredits ?? 0} Credit
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
        <UsageDetailSheet
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
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
    paddingHorizontal: 13,
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
    fontSize: 12,
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
  usageCard: {
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
  usageIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
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
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  creditsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  creditsChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
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
  detailCreditsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 14,
  },
  detailCreditsLabel: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  detailCreditsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: '#EF4444',
    lineHeight: 17,
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
