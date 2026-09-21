import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { type AdminRecord } from '@/services/adminResources';
import {
  resolveAdminUsers,
  getUserParty,
  formatUserDisplay,
  getUserInitials,
  formatUserSubtext,
  type AdminUserParty,
} from '@/services/adminUsers';

export interface CreditLedgerRecord extends AdminRecord {
  _id?: string;
  id?: string;
  userId?: string | AdminUserParty;
  actorUserId?: string | AdminUserParty;
  type?: string;
  availableDelta?: number;
  availableAfter?: number;
  reason?: string;
  referenceId?: string;
  createdAt?: string;
}

const typeMap: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  GRANT: { label: 'Cấp credit', color: '#16A34A', bg: '#DCFCE7', icon: 'add-circle' },
  TOPUP: { label: 'Cộng credit', color: '#16A34A', bg: '#DCFCE7', icon: 'add-circle' },
  CONSUME: { label: 'Sử dụng tác vụ AI', color: '#EF4444', bg: '#FEE2E2', icon: 'flash' },
  SETTLE: { label: 'Sử dụng tác vụ AI', color: '#EF4444', bg: '#FEE2E2', icon: 'flash' },
  ADJUSTMENT: { label: 'Admin điều chỉnh', color: '#0284C7', bg: '#E0F2FE', icon: 'options' },
  REFUND: { label: 'Hoàn trả credit', color: '#16A34A', bg: '#DCFCE7', icon: 'refresh-circle' },
  RELEASE: { label: 'Hoàn trả credit', color: '#16A34A', bg: '#DCFCE7', icon: 'refresh-circle' },
  RESERVE: { label: 'Tạm giữ chỗ', color: '#64748B', bg: '#F1F5F9', icon: 'lock-closed' },
  CANCEL: { label: 'Hủy giữ chỗ', color: '#64748B', bg: '#F1F5F9', icon: 'close-circle' },
  EXPIRATION: { label: 'Hết hạn', color: '#EF4444', bg: '#FEE2E2', icon: 'time' },
};

function LedgerDetailSheet({
  record,
  onClose,
}: {
  record: CreditLedgerRecord;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const delta = record.availableDelta || 0;
  const isPositive = delta > 0;
  const tm = typeMap[record.type || ''] || {
    label: record.type || 'Giao dịch',
    color: isPositive ? '#16A34A' : '#EF4444',
    bg: isPositive ? '#DCFCE7' : '#FEE2E2',
    icon: 'receipt',
  };
  const user = getUserParty(record.userId);
  const actor = record.actorUserId ? getUserParty(record.actorUserId) : null;
  const displayName = formatUserDisplay(record.userId);
  const initials = getUserInitials(user.fullName || user.username);
  const userSub = formatUserSubtext(record.userId);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Chi tiết giao dịch số cái</Text>
              <Text style={styles.sheetSub}>
                {record.createdAt ? new Date(record.createdAt).toLocaleString('vi-VN') : '—'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
            {/* Big Delta Banner */}
            <View
              style={[
                styles.detailDeltaBanner,
                { backgroundColor: isPositive ? '#F0FDF4' : '#FEF2F2', borderColor: isPositive ? '#86EFAC' : '#FECACA' },
              ]}
            >
              <View>
                <Text style={[styles.detailDeltaLabel, { color: isPositive ? '#166534' : '#991B1B' }]}>
                  Biến động số dư
                </Text>
                <Text style={[styles.detailDeltaValue, { color: isPositive ? '#16A34A' : '#EF4444' }]}>
                  {isPositive ? `+${delta}` : delta} Credit
                </Text>
              </View>

              {record.availableAfter !== undefined ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailDeltaLabel}>Số dư sau GD</Text>
                  <Text style={styles.detailAfterValue}>
                    {record.availableAfter} Credit
                  </Text>
                </View>
              ) : null}
            </View>

            {/* User Profile Card */}
            <View style={styles.detailUserCard}>
              <View style={styles.detailAvatarBox}>
                <Text style={styles.detailAvatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailUserName} numberOfLines={1}>
                  {displayName}
                </Text>
                {userSub ? (
                  <Text style={styles.detailUserSub} numberOfLines={1}>
                    {userSub}
                  </Text>
                ) : null}
                {user.email ? (
                  <Text style={styles.detailUserEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Info Grid */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Loại giao dịch:</Text>
                <View style={[styles.typeChip, { backgroundColor: tm.bg }]}>
                  <Ionicons name={tm.icon} size={14} color={tm.color} />
                  <Text style={[styles.typeChipText, { color: tm.color }]}>{tm.label}</Text>
                </View>
              </View>

              <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.detailRowLabel}>Lý do / Diễn giải:</Text>
                <Text style={[styles.detailRowValue, { flex: 1, textAlign: 'right', marginLeft: 12 }]}>
                  {record.reason || 'Không có mô tả'}
                </Text>
              </View>

              {actor && (actor.fullName || actor.username) ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Người điều chỉnh:</Text>
                  <Text style={styles.detailRowValue}>{formatUserDisplay(actor)}</Text>
                </View>
              ) : null}

              {record.referenceId ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Mã tham chiếu:</Text>
                  <Text style={[styles.detailRowValue, styles.codeText]}>
                    {record.referenceId}
                  </Text>
                </View>
              ) : null}

              {record._id || record.id ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Mã bút toán:</Text>
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

export function AdminCreditLedger() {
  const [records, setRecords] = useState<CreditLedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CreditLedgerRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (appliedSearch.trim()) params.set('keyword', appliedSearch.trim());
      if (typeFilter) {
        params.set('type', typeFilter);
        params.set('status', typeFilter);
      }

      const res = await api.getPage<CreditLedgerRecord>(
        `/api/admin/credit-ledger?${params.toString()}`
      );
      const raw = res.data || [];
      const resolved = await resolveAdminUsers(raw, ['userId', 'actorUserId']);
      setRecords(resolved);
      setTotal(res.meta?.total ?? raw.length);
      setPages(Math.max(1, res.meta?.totalPages || 1));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, appliedSearch, typeFilter]);

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

  const grantCount = records.filter((r) => (r.availableDelta || 0) > 0).length;
  const consumeCount = records.filter((r) => (r.availableDelta || 0) < 0).length;

  const displayedRecords = useMemo(() => {
    return records.filter((r) => {
      if (typeFilter) {
        const t = r.type || '';
        const match =
          t === typeFilter ||
          (typeFilter === 'TOPUP' && (t === 'GRANT' || t === 'TOPUP')) ||
          (typeFilter === 'SETTLE' && (t === 'CONSUME' || t === 'SETTLE')) ||
          (typeFilter === 'RELEASE' && (t === 'REFUND' || t === 'RELEASE'));
        if (!match) return false;
      }
      if (appliedSearch.trim()) {
        const q = appliedSearch.trim().toLowerCase();
        const u = getUserParty(r.userId);
        const name = (u.fullName || '').toLowerCase();
        const user = (u.username || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const refId = (r.referenceId || '').toLowerCase();
        if (
          !name.includes(q) &&
          !user.includes(q) &&
          !phone.includes(q) &&
          !reason.includes(q) &&
          !refId.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [records, typeFilter, appliedSearch]);

  return (
    <View style={styles.container}>
      {/* 1. STATS BANNER */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Pressable
            style={styles.statItem}
            onPress={() => {
              setTypeFilter('');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="book" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{total}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng bút toán
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="add-circle" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{grantCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Lượt cộng (+)
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="remove-circle" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{consumeCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Lượt trừ (-)
            </Text>
          </View>
        </View>
      </View>

      {/* 2. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tài khoản, lý do…"
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
          { value: 'TOPUP', label: 'Cộng credit' },
          { value: 'SETTLE', label: 'Dùng AI' },
          { value: 'ADJUSTMENT', label: 'Điều chỉnh' },
          { value: 'RELEASE', label: 'Hoàn trả' },
        ].map((pill) => (
          <Pressable
            key={pill.value}
            onPress={() => {
              setTypeFilter(pill.value);
              setPage(1);
            }}
            style={[
              styles.filterPill,
              typeFilter === pill.value && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                typeFilter === pill.value && styles.filterPillTextActive,
              ]}
            >
              {pill.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 4. LEDGER LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải dữ liệu sổ cái giao dịch…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : displayedRecords.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="book-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>
              {appliedSearch || typeFilter
                ? 'Không tìm thấy bút toán phù hợp.'
                : 'Chưa có bút toán giao dịch nào.'}
            </Text>
          </View>
        ) : (
          displayedRecords.map((record, index) => {
            const delta = record.availableDelta || 0;
            const isPositive = delta > 0;
            const tm = typeMap[record.type || ''] || {
              label: record.type || 'Giao dịch',
              color: isPositive ? '#16A34A' : '#EF4444',
              bg: isPositive ? '#DCFCE7' : '#FEE2E2',
              icon: 'receipt',
            };
            const userParty = getUserParty(record.userId);
            const displayName = formatUserDisplay(record.userId);
            const userSub = formatUserSubtext(record.userId);
            const initials = getUserInitials(userParty.fullName || userParty.username);

            return (
              <Pressable
                key={record._id || record.id || `ledger-${index}`}
                onPress={() => setSelectedRecord(record)}
                style={({ pressed }) => [
                  styles.ledgerCard,
                  pressed && { opacity: 0.92 },
                ]}
              >
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  {/* Delta Box */}
                  <View
                    style={[
                      styles.deltaBadge,
                      { backgroundColor: isPositive ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deltaBadgeText,
                        { color: isPositive ? '#16A34A' : '#EF4444' },
                      ]}
                    >
                      {isPositive ? `+${delta}` : delta}
                    </Text>
                  </View>

                  {/* User Avatar */}
                  <View style={styles.userAvatarBox}>
                    <Text style={styles.userAvatarText}>{initials}</Text>
                  </View>

                  <View style={styles.headerInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={styles.reasonText} numberOfLines={1}>
                      {userSub ? `${userSub} · ` : ''}{record.reason || tm.label}
                    </Text>
                  </View>

                  {/* Type chip */}
                  <View style={[styles.typeChip, { backgroundColor: tm.bg }]}>
                    <Ionicons name={tm.icon} size={13} color={tm.color} />
                    <Text style={[styles.typeChipText, { color: tm.color }]}>
                      {tm.label}
                    </Text>
                  </View>
                </View>

                {/* Footer details */}
                <View style={styles.cardFooterRow}>
                  {record.availableAfter !== undefined ? (
                    <Text style={styles.balanceAfterText}>
                      Số dư sau GD: <Text style={{ fontWeight: '700', color: colors.text }}>{record.availableAfter} Credit</Text>
                    </Text>
                  ) : null}

                  <View style={{ flex: 1 }} />

                  <Text style={styles.dateText}>
                    {record.createdAt
                      ? new Date(record.createdAt).toLocaleString('vi-VN')
                      : '—'}
                  </Text>
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
        <LedgerDetailSheet
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
  ledgerCard: {
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
  deltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  userAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  reasonText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  balanceAfterText: {
    fontSize: 11.5,
    color: '#64748B',
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
  detailDeltaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  detailDeltaLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailDeltaValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  detailAfterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  detailUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 12,
  },
  detailAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  detailUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  detailUserSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  detailUserEmail: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 1,
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
