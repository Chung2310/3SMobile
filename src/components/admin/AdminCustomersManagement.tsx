import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

import { api } from '@/services/api/client';
import {
  display,
  listPath,
  recordId,
  resources,
  type AdminRecord,
} from '@/services/adminResources';
import { fetchAdminDashboard, type AdminDashboardData } from '@/services/dashboardService';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { CustomerAdminFormModal } from './CustomerAdminFormModal';
import { AdminForceTransferModal } from './AdminForceTransferModal';

export function AdminCustomersManagement() {
  const insets = useSafeAreaInsets();
  const resource = resources.customers;

  const [items, setItems] = useState<AdminRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number>();
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard summary stats
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);

  // Modals state
  const [form, setForm] = useState<AdminRecord | null | undefined>(undefined);
  const [transferCustomer, setTransferCustomer] = useState<AdminRecord | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<AdminRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const actionLock = useRef(false);
  const version = useRef(0);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchAdminDashboard();
      if (data) setDashboardData(data);
    } catch {
      // Bỏ qua lỗi ngầm
    }
  }, []);

  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError('');
    try {
      const statusParam = status === 'ALL' ? '' : status;
      const path = listPath(resource, page, applied, statusParam);
      const result = await api.getPage<AdminRecord>(path);
      if (version.current !== request) return;
      setItems(result.data || []);
      setTotal(result.meta?.total ?? result.data?.length ?? 0);
      setPages(Math.max(1, result.meta?.totalPages || 1));
      if (result.meta && page > Math.max(1, result.meta.totalPages)) {
        setPage(Math.max(1, result.meta.totalPages));
      }
    } catch (e) {
      if (version.current === request) setError(messageOf(e));
    } finally {
      if (version.current === request) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [resource, page, applied, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
      void loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, [load, loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
    void loadDashboard();
  }, [load, loadDashboard]);

  const afterSave = () => {
    setSuccess('Đã lưu thay đổi thành công.');
    setTimeout(() => setSuccess(''), 3500);
    void load();
    void loadDashboard();
  };

  const runAction = async (action: () => Promise<unknown>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError('');
    try {
      await action();
      setDeletingCustomer(null);
      afterSave();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  // Contacts
  const handleCall = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean) void Linking.openURL(`tel:${clean}`);
  };

  const handleZalo = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean) void Linking.openURL(`https://zalo.me/${clean}`);
  };

  const getBmiData = (height: unknown, weight: unknown) => {
    const h = Number(height);
    const w = Number(weight);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const bmi = Number((w / Math.pow(h / 100, 2)).toFixed(1));
    let label = 'Bình thường';
    let color = '#16A34A';
    let bg = '#DCFCE7';
    if (bmi < 18.5) {
      label = 'Gầy';
      color = '#D97706';
      bg = '#FEF3C7';
    } else if (bmi >= 23 && bmi < 25) {
      label = 'Tiền thừa cân';
      color = '#D97706';
      bg = '#FEF3C7';
    } else if (bmi >= 25 && bmi < 30) {
      label = 'Thừa cân độ 1';
      color = '#EA580C';
      bg = '#FFEDD5';
    } else if (bmi >= 30) {
      label = 'Béo phì';
      color = '#DC2626';
      bg = '#FEE2E2';
    }
    return { bmi, label, color, bg };
  };

  const formatDate = (val: unknown) => {
    if (!val) return '—';
    try {
      const d = new Date(String(val));
      if (isNaN(d.getTime())) return String(val);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(val);
    }
  };

  // Resolve PT name from customer record
  const getAssignedPtName = (item: AdminRecord) => {
    if (!item.assignedPtId) return 'Chưa phân công HLV';
    if (typeof item.assignedPtId === 'object') {
      const ptObj = item.assignedPtId as AdminRecord;
      return String(ptObj.fullName || ptObj.username || 'HLV');
    }
    const ptId = String(item.assignedPtId);
    if (dashboardData?.ptWorkload) {
      const found = dashboardData.ptWorkload.find((w) => w.ptId === ptId);
      if (found) return found.fullName || found.username;
    }
    return ptId;
  };

  // Stats calculation
  const totalCount = dashboardData?.totalCustomers ?? total ?? 0;
  const activeCount = dashboardData?.customerStats?.active ?? 0;
  const leadCount = dashboardData?.customerStats?.lead ?? 0;
  const inactiveCount = dashboardData?.customerStats?.inactive ?? 0;

  // Status mapping
  const getStatusBadge = (st?: string) => {
    switch (st) {
      case 'ACTIVE':
        return { label: 'Đang tập', color: '#16A34A', bg: '#DCFCE7' };
      case 'LEAD':
        return { label: 'Tiềm năng', color: '#D97706', bg: '#FEF3C7' };
      case 'INACTIVE':
        return { label: 'Ngừng tập', color: '#64748B', bg: '#F1F5F9' };
      default:
        return { label: st || 'Chưa rõ', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. SLIM SEARCH BAR */}
      <View style={styles.searchBarWrapper}>
        <Search size={14} color="#94A3B8" style={{ marginRight: 6 }} />
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="Tìm theo tên, SĐT, email học viên…"
          placeholderTextColor="#94A3B8"
          style={styles.searchInputCompact}
          returnKeyType="search"
          onSubmitEditing={() => {
            setApplied(keyword);
            setPage(1);
          }}
        />
        {keyword ? (
          <Pressable
            onPress={() => {
              setKeyword('');
              setApplied('');
              setPage(1);
            }}
            hitSlop={8}
            style={styles.searchClearBtn}
          >
            <X size={14} color="#94A3B8" />
          </Pressable>
        ) : null}
        {keyword !== applied ? (
          <Pressable
            onPress={() => {
              setApplied(keyword);
              setPage(1);
            }}
            style={styles.searchSubmitBtn}
          >
            <Text style={styles.searchSubmitBtnText}>Tìm</Text>
          </Pressable>
        ) : null}
      </View>

      {/* 2. INTEGRATED STATUS SEGMENTS (STATS + FILTERS) */}
      <View style={styles.segmentContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
          {[
            { key: 'ALL', label: 'Tất cả', count: totalCount },
            { key: 'ACTIVE', label: 'Đang tập', count: activeCount },
            { key: 'LEAD', label: 'Tiềm năng', count: leadCount },
            { key: 'INACTIVE', label: 'Ngừng tập', count: inactiveCount },
          ].map((tab) => {
            const isActive = status === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setStatus(tab.key);
                  setPage(1);
                }}
                style={[styles.segmentTab, isActive && styles.segmentTabActive]}
              >
                <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.segmentCountBadge, isActive && styles.segmentCountBadgeActive]}>
                  <Text style={[styles.segmentCountText, isActive && styles.segmentCountTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* TOAST SUCCESS */}
      {success ? (
        <View style={styles.toastCard}>
          <Text style={styles.toastText}>{success}</Text>
        </View>
      ) : null}

      {/* 3. CUSTOMER LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải dữ liệu học viên…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable
              onPress={() => void load()}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusBoxText}>
              Không tìm thấy học viên phù hợp.
            </Text>
            <Pressable
              onPress={() => {
                setKeyword('');
                setApplied('');
                setStatus('ALL');
                setPage(1);
              }}
              style={styles.clearFilterBtn}
            >
              <Text style={styles.clearFilterText}>Xóa bộ lọc tìm kiếm</Text>
            </Pressable>
          </View>
        ) : (
          items.map((item) => {
            const cId = recordId(item);
            const badge = getStatusBadge(String(item.status || ''));
            const ptName = getAssignedPtName(item);
            const userAcc = typeof item.userId === 'object' && item.userId !== null ? (item.userId as any) : null;
            const bmiData = getBmiData(item.height, item.initialWeight);

            const metricParts = [
              item.initialWeight ? `${item.initialWeight}kg` : null,
              item.height ? `${item.height}cm` : null,
              bmiData ? `BMI ${bmiData.bmi}` : null,
            ].filter(Boolean);

            return (
              <View
                key={cId}
                style={styles.compactCard}
              >
                {/* Row 1: Avatar + Name & Status + Phone & Contact + Actions (Sửa, Xóa) */}
                <View style={styles.compactCardTopRow}>
                  {/* Avatar Initials */}
                  <View style={styles.compactAvatar}>
                    <Text style={styles.compactAvatarText}>
                      {String(item.fullName || 'H').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Info Column */}
                  <View style={styles.compactInfoCol}>
                    <View style={styles.compactNameRow}>
                      <Text style={styles.compactNameText} numberOfLines={1}>
                        {display(item.fullName || item.name || 'Học viên')}
                      </Text>
                      {item.gender ? (
                        <View style={styles.compactGenderTag}>
                          <Text style={styles.compactGenderTagText}>
                            {item.gender === 'MALE' ? 'Nam' : item.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                          </Text>
                        </View>
                      ) : null}
                      <View style={[styles.compactStatusPill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.compactStatusPillText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Account username if linked */}
                    {userAcc?.username ? (
                      <View style={styles.compactAccountRow}>
                        <Text style={styles.compactAccountText} numberOfLines={1}>
                          Tài khoản: @{userAcc.username}
                        </Text>
                      </View>
                    ) : null}

                    {/* Contact Row: Phone with Call/Zalo buttons */}
                    <View style={styles.compactContactRow}>
                      {Boolean(item.phone) && (
                        <View style={styles.compactContactGroup}>
                          <Text style={styles.compactPhoneText}>
                            {String(item.phone)}
                          </Text>
                          <Pressable
                            onPress={() => handleCall(String(item.phone))}
                            hitSlop={6}
                            style={styles.compactCallBtn}
                            accessibilityLabel="Gọi điện"
                          >
                            <Phone size={12} color="#16A34A" />
                          </Pressable>

                          <Pressable
                            onPress={() => handleZalo(String(item.phone))}
                            hitSlop={6}
                            style={styles.compactZaloBtn}
                            accessibilityLabel="Nhắn Zalo"
                          >
                            <MessageCircle size={12} color="#0068FF" />
                          </Pressable>
                        </View>
                      )}

                      {Boolean(item.email) && (
                        <View style={styles.compactEmailWrap}>
                          <Text style={styles.compactEmailText} numberOfLines={1}>
                            {String(item.email)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Right Actions: Sửa, Xóa */}
                  <View style={styles.compactActionGroup}>
                    <Pressable
                      onPress={() => setForm(item)}
                      hitSlop={6}
                      style={styles.compactActionBtn}
                      accessibilityLabel="Sửa"
                    >
                      <Pencil size={13} color="#475569" />
                    </Pressable>

                    <Pressable
                      onPress={() => setDeletingCustomer(item)}
                      hitSlop={6}
                      style={[styles.compactActionBtn, styles.compactActionBtnDanger]}
                      accessibilityLabel="Xóa"
                    >
                      <Trash2 size={13} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>

                {/* Subtle Divider */}
                <View style={styles.compactDivider} />

                {/* Row 2: Coach Assignment with "Đổi PT" action */}
                <View style={styles.compactCoachRow}>
                  <View style={styles.compactCoachInfo}>
                    <Text style={styles.compactCoachLabel}>HLV:</Text>
                    <Text style={styles.compactCoachName} numberOfLines={1}>
                      {ptName}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setTransferCustomer(item)}
                    hitSlop={6}
                    style={styles.compactChangePtBtn}
                    accessibilityLabel="Chuyển PT"
                  >
                    <ArrowLeftRight size={13} color="#7C3AED" />
                  </Pressable>
                </View>

                {/* Row 3: Metrics, Goal, Medical & Join Date */}
                {Boolean(metricParts.length > 0 || item.initialGoal || item.medicalNotes || item.createdAt) && (
                  <View style={styles.compactMetaRow}>
                    {metricParts.length > 0 ? (
                      <View style={styles.compactMetricChip}>
                        <Text style={styles.compactMetricChipText} numberOfLines={1}>
                          {metricParts.join(' · ')}
                        </Text>
                      </View>
                    ) : null}

                    {Boolean(item.initialGoal) && (
                      <View style={styles.compactGoalTag}>
                        <Text style={styles.compactGoalTagText} numberOfLines={1}>
                          Mục tiêu: {String(item.initialGoal)}
                        </Text>
                      </View>
                    )}

                    {Boolean(item.medicalNotes) && (
                      <View style={styles.compactMedicalTag}>
                        <Text style={styles.compactMedicalTagText} numberOfLines={1}>
                          Lưu ý: {String(item.medicalNotes)}
                        </Text>
                      </View>
                    )}

                    {Boolean(item.createdAt) && (
                      <View style={styles.compactDateTag}>
                        <Text style={styles.compactDateTagText} numberOfLines={1}>
                          Ngày tạo: {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* PAGINATION */}
        {!loading && !error && items.length > 0 && (
          <View style={styles.paginationRow}>
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={({ pressed }) => [
                styles.pageBtn,
                page <= 1 && styles.pageBtnDisabled,
                pressed && page > 1 && { opacity: 0.7 },
              ]}
              accessibilityLabel="Trang trước"
            >
              <ChevronLeft size={16} color={page <= 1 ? '#94A3B8' : colors.text} />
              <Text style={[styles.pageBtnText, page <= 1 && { color: '#94A3B8' }]}>Trước</Text>
            </Pressable>

            <View style={styles.pageInfoWrap}>
              <Text style={styles.pageInfoText}>
                Trang {page} / {pages}
              </Text>
              {total !== undefined && (
                <Text style={styles.pageTotalSubText}>
                  Tổng {total} học viên
                </Text>
              )}
            </View>

            <Pressable
              disabled={page >= pages}
              onPress={() => setPage((p) => p + 1)}
              style={({ pressed }) => [
                styles.pageBtn,
                page >= pages && styles.pageBtnDisabled,
                pressed && page < pages && { opacity: 0.7 },
              ]}
              accessibilityLabel="Trang sau"
            >
              <Text style={[styles.pageBtnText, page >= pages && { color: '#94A3B8' }]}>Sau</Text>
              <ChevronRight size={16} color={page >= pages ? '#94A3B8' : colors.text} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* FIXED BOTTOM ACTION BAR */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(app)/admin/[section]',
              params: { section: 'batchTransfers' },
            })
          }
          style={({ pressed }) => [styles.bottomSecondaryBtn, pressed && { opacity: 0.8 }]}
          accessibilityLabel="Chuyển giao hàng loạt"
        >
          <ArrowLeftRight size={15} color={colors.primary} />
          <Text style={styles.bottomSecondaryBtnText}>Chuyển giao</Text>
        </Pressable>

        <Pressable
          onPress={() => setForm(null)}
          style={({ pressed }) => [styles.bottomPrimaryBtn, pressed && { opacity: 0.88 }]}
          accessibilityLabel="Thêm khách hàng mới"
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.bottomPrimaryBtnText}>Thêm khách hàng</Text>
        </Pressable>
      </View>

      {/* MODAL 1: ADD / EDIT CUSTOMER */}
      <CustomerAdminFormModal
        visible={form !== undefined}
        item={form || null}
        onClose={() => setForm(undefined)}
        onSave={async (payload) => {
          if (form) {
            await api.patch(`${resource.path}/${recordId(form)}`, payload);
          } else {
            await api.post(resource.path, { ...payload, ...resource.query });
          }
          afterSave();
        }}
      />

      {/* MODAL 2: FORCE TRANSFER PT */}
      <AdminForceTransferModal
        visible={Boolean(transferCustomer)}
        customer={transferCustomer}
        onClose={() => setTransferCustomer(null)}
        onSuccess={() => {
          afterSave();
        }}
      />

      {/* MODAL 3: CONFIRM DELETE */}
      {deletingCustomer && (
        <Modal
          visible={Boolean(deletingCustomer)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeletingCustomer(null);
          }}
        >
          <View style={styles.deleteOverlay}>
            <View style={styles.deleteCard}>
              <Text style={styles.deleteTitle}>Xác nhận xóa khách hàng</Text>
              <Text style={styles.deleteDesc}>
                Bạn có chắc chắn muốn xóa hồ sơ học viên &quot;{display(deletingCustomer)}&quot;? Toàn bộ dữ liệu InBody, lịch tập và lịch sử liên quan sẽ bị xóa vĩnh viễn.
              </Text>
              {actionError ? (
                <View style={styles.deleteErrorBox}>
                  <Text style={styles.deleteErrorText}>{actionError}</Text>
                </View>
              ) : null}
              <View style={styles.deleteActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => setDeletingCustomer(null)}
                  style={styles.deleteCancelBtn}
                >
                  <Text style={styles.deleteCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() =>
                      api.delete(`${resource.path}/${recordId(deletingCustomer)}`)
                    )
                  }
                  style={styles.deleteConfirmBtn}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.deleteConfirmText}>Xóa vĩnh viễn</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInputCompact: {
    flex: 1,
    fontSize: 12.5,
    color: colors.text,
    paddingVertical: 0,
  },
  searchClearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  searchSubmitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  searchSubmitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  segmentContainer: {
    marginBottom: 8,
  },
  segmentScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  segmentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  segmentCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  segmentCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  segmentCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentCountTextActive: {
    color: '#FFFFFF',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  toastText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 8,
  },
  statusBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusBoxText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusBoxError: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearFilterBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  compactCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  compactInfoCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  compactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryNavy,
    flexShrink: 1,
  },
  compactGenderTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  compactGenderTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  compactStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  compactStatusPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  compactAccountRow: {
    marginTop: 2,
  },
  compactAccountText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  compactContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  compactContactGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactPhoneText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  compactCallBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactZaloBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactEmailWrap: {
    maxWidth: 150,
  },
  compactEmailText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  compactActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactActionBtnDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  compactDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 7,
  },
  compactCoachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactCoachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 6,
  },
  compactCoachLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  compactCoachName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryNavy,
    flexShrink: 1,
  },
  compactChangePtBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  compactMetricChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  compactMetricChipText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  compactGoalTag: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  compactGoalTagText: {
    fontSize: 10.5,
    color: '#0284C7',
    fontWeight: '600',
  },
  compactMedicalTag: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  compactMedicalTagText: {
    fontSize: 10.5,
    color: '#DC2626',
    fontWeight: '600',
  },
  compactDateTag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  compactDateTagText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
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
    paddingVertical: 7,
  },
  pageBtnDisabled: {
    opacity: 0.45,
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pageInfoWrap: {
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  pageTotalSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
  },
  bottomSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomPrimaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  deleteDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    width: '100%',
  },
  deleteErrorText: {
    fontSize: 13,
    color: '#EF4444',
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  deleteConfirmBtn: {
    flex: 1.2,
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
