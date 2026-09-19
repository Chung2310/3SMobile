import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { canDeleteAccount, canEditAccount } from '@/services/adminAccess';
import {
  display,
  listPath,
  recordId,
  resources,
  type AdminRecord,
} from '@/services/adminResources';
import { fetchAdminDashboard, type AdminDashboardData } from '@/services/dashboardService';
import { resolveImageUrl } from '@/services/imageUtils';
import { colors, radius, spacing } from '@/theme';
import { messageOf } from '@/utils/error';
import { PtFormModal } from './PtFormModal';

function PtAvatar({
  avatarUrl,
  name,
  isLocked,
  size = 44,
}: {
  avatarUrl?: unknown;
  name: string;
  isLocked?: boolean;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const rawUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  const resolved = useMemo(() => resolveImageUrl(rawUrl), [rawUrl]);
  const hasError = Boolean(resolved && failedUrl === resolved);

  const initial = (name || 'PT').trim().slice(0, 1).toUpperCase() || 'P';
  const borderRadius = Math.round(size / 2);
  const fontSize = Math.round(size * 0.4);

  if (resolved && !hasError) {
    return (
      <Image
        key={resolved}
        source={{ uri: resolved }}
        style={[
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: '#E2E8F0',
          },
          isLocked && { opacity: 0.6 },
        ]}
        resizeMode="cover"
        onError={() => setFailedUrl(resolved)}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarBox,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: isLocked ? '#64748B' : colors.primary,
        },
      ]}
    >
      <Text style={[styles.avatarInitial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

export function AdminPtsManagement() {
  const resource = resources.pts;
  const { session } = useAuth();

  const [items, setItems] = useState<AdminRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState<(number | undefined)[]>([]);
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard workload data to show live metrics per PT
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);

  // Modals state
  const [form, setForm] = useState<AdminRecord | null | undefined>(undefined);
  const [selectedPt, setSelectedPt] = useState<AdminRecord | null>(null);
  const [deletingPt, setDeletingPt] = useState<AdminRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const actionLock = useRef(false);
  const version = useRef(0);
  const countsVersion = useRef(0);

  useEffect(() => {
    const nextKeyword = keyword.trim();
    if (nextKeyword === applied) return;
    const timer = setTimeout(() => {
      setPage(1);
      setApplied(nextKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, applied]);

  const loadCounts = useCallback(async () => {
    const request = ++countsVersion.current;
    setCounts([]);
    const results = await Promise.allSettled(
      ['', 'ACTIVE', 'LOCKED'].map((filter) =>
        api.getPage<AdminRecord>(listPath(resource, 1, applied, filter)),
      ),
    );
    if (countsVersion.current !== request) return;
    setCounts(results.map((result) =>
      result.status === 'fulfilled' ? result.value.meta?.total : undefined,
    ));
  }, [resource, applied]);

  useEffect(() => {
    const timer = setTimeout(() => void loadCounts(), 0);
    return () => {
      clearTimeout(timer);
      countsVersion.current += 1;
    };
  }, [loadCounts]);

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
    const timer = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(timer);
      version.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => void loadDashboard(), 0);
    return () => clearTimeout(timer);
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
    void loadDashboard();
    void loadCounts();
  }, [load, loadDashboard, loadCounts]);

  const afterSave = () => {
    setSuccess('Đã lưu thay đổi thành công.');
    setTimeout(() => setSuccess(''), 3500);
    void loadCounts();
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
      setDeletingPt(null);
      setSelectedPt(null);
      afterSave();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const editable = (item: AdminRecord) => canEditAccount(session!.user, item);
  const removable = (item: AdminRecord) => canDeleteAccount(session!.user, item);

  // Map ptId to workload
  const workloadMap = useMemo(() => {
    const map = new Map<string, { activeCustomers: number; totalCustomers: number; activePackages: number }>();
    if (dashboardData?.ptWorkload) {
      for (const pt of dashboardData.ptWorkload) {
        map.set(pt.ptId, {
          activeCustomers: pt.activeCustomers || 0,
          totalCustomers: pt.totalCustomers || 0,
          activePackages: pt.activePackages || 0,
        });
      }
    }
    return map;
  }, [dashboardData]);

  const statusFilters = [
    { value: 'ALL', label: 'Tất cả', icon: 'people' as const, color: colors.primary },
    { value: 'ACTIVE', label: 'Hoạt động', icon: 'checkmark-circle' as const, color: colors.success },
    { value: 'LOCKED', label: 'Đã khóa', icon: 'lock-closed' as const, color: colors.danger },
  ];

  const handleCall = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone) Linking.openURL(`tel:${cleanPhone}`).catch(() => { });
  };

  return (
    <View style={styles.container}>
      {/* 1. THẺ THỐNG KÊ TỔNG HỢP HLV */}
      <View style={styles.statsCard}>
        {statusFilters.map((filter, index) => (
          <Pressable
            key={filter.value}
            accessibilityRole="button"
            accessibilityLabel={filter.label + ', ' + (counts[index] ?? 'chưa có số liệu') + ' huấn luyện viên'}
            accessibilityState={{ selected: status === filter.value }}
            onPress={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            style={({ pressed }) => [
              styles.statCol,
              status === filter.value && styles.statColSelected,
              pressed && styles.statColPressed,
            ]}
          >
            <View style={styles.statValueRow}>
              <Ionicons name={filter.icon} size={16} color={filter.color} />
              <Text style={styles.statVal} numberOfLines={1} ellipsizeMode="tail">
                {counts[index] ?? '—'}
              </Text>
              {status === filter.value && <Feather name="check" size={12} color={colors.primary} />}
            </View>
            <Text style={[styles.statLbl, status === filter.value && styles.statLabelSelected]} numberOfLines={1} ellipsizeMode="tail">
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 2. THANH TÌM KIẾM & NÚT THÊM HLV */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên HLV, SĐT..."
            placeholderTextColor={colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            onSubmitEditing={() => {
              setApplied(keyword.trim());
              setPage(1);
            }}
          />
          {keyword.length > 0 && (
            <Pressable
              onPress={() => {
                setKeyword('');
                setApplied('');
                setPage(1);
              }}
              hitSlop={8}
            >
              <Feather name="x-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setForm(null)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          hitSlop={8}
          accessibilityLabel="Thêm HLV mới"
        >
          <Feather name="user-plus" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Thêm</Text>
        </Pressable>
      </View>

      {/* Thông báo thành công */}
      {success ? (
        <View style={styles.toastCard}>
          <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
          <Text style={styles.toastText}>{success}</Text>
        </View>
      ) : null}

      {/* 4. DANH SÁCH THẺ HLV */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.ptListScroll}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách Huấn luyện viên...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
            <Text style={styles.errorTitle}>Không thể tải danh sách</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có Huấn luyện viên nào</Text>
            <Text style={styles.emptyDesc}>
              {applied ? `Không tìm thấy kết quả phù hợp với "${applied}"` : 'Thêm mới HLV để phân bổ quản lý học viên'}
            </Text>
            <Pressable onPress={() => setForm(null)} style={styles.emptyAddBtn}>
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Thêm Huấn luyện viên mới</Text>
            </Pressable>
          </View>
        ) : (
          items.map((pt) => {
            const ptId = recordId(pt);
            const workload = workloadMap.get(ptId);
            const isLocked = pt.status === 'LOCKED';
            const fullName = String(pt.fullName || pt.username || 'HLV 3S');
            const ptAvatar = (pt.avatarUrl || (pt as any).avatar || (pt as any).photoUrl) as string | undefined;

            return (
              <Pressable
                key={ptId}
                onPress={() => setSelectedPt(pt)}
                style={({ pressed }) => [
                  styles.ptCard,
                  pressed && styles.ptCardPressed,
                  isLocked && styles.ptCardLocked,
                ]}
              >
                {/* Header Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatarWrap}>
                    <PtAvatar
                      avatarUrl={ptAvatar}
                      name={fullName}
                      isLocked={isLocked}
                      size={44}
                    />
                    <View
                      style={[
                        styles.onlineDot,
                        { backgroundColor: isLocked ? '#EF4444' : '#22C55E' },
                      ]}
                    />
                  </View>

                  <View style={styles.cardHeaderInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.ptName} numberOfLines={1} ellipsizeMode="tail">
                        {fullName}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isLocked
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(34, 197, 94, 0.1)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isLocked ? '#EF4444' : '#16A34A' },
                          ]}
                        >
                          {isLocked ? 'Đã khóa' : 'Hoạt động'}
                        </Text>
                      </View>
                    </View>

                    {pt.phone ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={'Gọi ' + String(pt.phone)}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleCall(String(pt.phone));
                        }}
                        hitSlop={{ top: 12, bottom: 12 }}
                        style={({ pressed }) => [styles.phoneRow, pressed && { opacity: 0.7 }]}
                      >
                        <Feather name="phone" size={12} color={colors.textMuted} />
                        <Text style={styles.ptPhone} numberOfLines={1} ellipsizeMode="tail">
                          {String(pt.phone)}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.ptPhone} numberOfLines={1} ellipsizeMode="tail">Chưa có SĐT</Text>
                    )}
                    {pt.specialization ? (
                      <Text style={styles.specializationText} numberOfLines={1}>
                        {String(pt.specialization)}
                        {pt.yearsOfExperience ? ` · ${String(pt.yearsOfExperience)} năm KN` : ''}
                      </Text>
                    ) : null}
                  </View>


                  {editable(pt) && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={'Chỉnh sửa HLV ' + fullName}
                      onPress={(event) => {
                        event.stopPropagation();
                        setForm(pt);
                      }}
                      style={({ pressed }) => [styles.editIconBtn, pressed && styles.editIconBtnPressed]}
                    >
                      <Feather name="edit-2" size={18} color={colors.primary} />
                    </Pressable>
                  )}
                </View>

                {/* Workload Metric Pills */}
                <View style={styles.metricRow}>
                  <View style={styles.metricBox}>
                    <Ionicons name="person" size={13} color={colors.primary} />
                    <Text style={styles.metricLabel}>Đang tập:</Text>
                    <Text style={styles.metricValue}>
                      {workload?.activeCustomers ?? 0}
                    </Text>
                  </View>

                  <View style={styles.metricBox}>
                    <Ionicons name="barbell-outline" size={13} color="#16A34A" />
                    <Text style={styles.metricLabel}>Gói hoạt động:</Text>
                    <Text style={[styles.metricValue, { color: '#16A34A' }]}>
                      {workload?.activePackages ?? 0}
                    </Text>
                  </View>
                </View>

              </Pressable>
            );
          })
        )}

        {/* Phân trang */}
        {pages > 1 && !loading && (
          <View style={styles.paginationRow}>
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage((p) => p - 1)}
              style={({ pressed }) => [
                styles.pageBtn,
                page <= 1 && styles.pageBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="chevron-left" size={18} color={page <= 1 ? '#94A3B8' : colors.text} />
              <Text style={[styles.pageBtnText, page <= 1 && { color: '#94A3B8' }]}>Trước</Text>
            </Pressable>

            <Text style={styles.pageInfo}>
              Trang {page} / {pages}
            </Text>

            <Pressable
              disabled={page >= pages}
              onPress={() => setPage((p) => p + 1)}
              style={({ pressed }) => [
                styles.pageBtn,
                page >= pages && styles.pageBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.pageBtnText, page >= pages && { color: '#94A3B8' }]}>Sau</Text>
              <Feather name="chevron-right" size={18} color={page >= pages ? '#94A3B8' : colors.text} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 5. FORM THÊM / SỬA HLV */}
      <PtFormModal
        visible={form !== undefined}
        item={form || null}
        onClose={() => setForm(undefined)}
        onSave={async (payload) => {
          if (form) {
            if (!editable(form)) throw new Error('Bạn không có quyền chỉnh sửa tài khoản HLV này.');
            await api.patch(`${resource.path}/${recordId(form)}`, payload);
          } else {
            await api.post(resource.path, { ...payload, ...resource.query });
          }
          afterSave();
        }}
      />

      {/* 6. BOTTOM SHEET CHI TIẾT HLV */}
      {selectedPt && (
        <Modal
          visible={Boolean(selectedPt)}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!busy) setSelectedPt(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (!busy) setSelectedPt(null);
              }}
            />

            <View style={styles.sheetContent}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <PtAvatar
                  avatarUrl={(selectedPt.avatarUrl || (selectedPt as any).avatar || (selectedPt as any).photoUrl) as string | undefined}
                  name={String(selectedPt.fullName || selectedPt.username || 'PT')}
                  isLocked={selectedPt.status === 'LOCKED'}
                  size={48}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{display(selectedPt)}</Text>
                  <Text style={styles.sheetSub}>@{String(selectedPt.username || '')}</Text>
                </View>

                <Pressable
                  onPress={() => setSelectedPt(null)}
                  hitSlop={8}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetBody}>
                {actionError ? (
                  <View style={styles.errorNotice}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorNoticeText}>{actionError}</Text>
                  </View>
                ) : null}

                <View style={styles.sheetInfoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Trạng thái</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            selectedPt.status === 'LOCKED'
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(34, 197, 94, 0.1)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: selectedPt.status === 'LOCKED' ? '#EF4444' : '#16A34A',
                          },
                        ]}
                      >
                        {selectedPt.status === 'LOCKED' ? 'Đã khóa' : 'Đang hoạt động'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Số điện thoại</Text>
                    <Text style={styles.infoVal}>{display(selectedPt.phone)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoVal}>{display(selectedPt.email)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chuyên môn</Text>
                    <Text style={styles.infoVal}>{display(selectedPt.specialization)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Kinh nghiệm</Text>
                    <Text style={styles.infoVal}>
                      {selectedPt.yearsOfExperience ? `${selectedPt.yearsOfExperience} năm` : '—'}
                    </Text>
                  </View>

                  {selectedPt.bio ? (
                    <View style={styles.bioBox}>
                      <Text style={styles.bioLabel}>Giới thiệu:</Text>
                      <Text style={styles.bioText}>{String(selectedPt.bio)}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Các nút thao tác */}
                <View style={styles.sheetActions}>
                  {editable(selectedPt) && (
                    <Pressable
                      disabled={busy}
                      onPress={() => {
                        const pt = selectedPt;
                        setSelectedPt(null);
                        setForm(pt);
                      }}
                      style={({ pressed }) => [
                        styles.primaryActionBtn,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Feather name="edit-3" size={16} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Chỉnh sửa thông tin HLV</Text>
                    </Pressable>
                  )}

                  {removable(selectedPt) && (
                    <Pressable
                      disabled={busy}
                      onPress={() => {
                        setDeletingPt(selectedPt);
                        setSelectedPt(null);
                      }}
                      style={({ pressed }) => [
                        styles.dangerActionBtn,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                      <Text style={styles.dangerActionBtnText}>Xóa tài khoản HLV</Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* 7. MODAL XÁC NHẬN XÓA HLV */}
      {deletingPt && (
        <Modal
          visible={Boolean(deletingPt)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeletingPt(null);
          }}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.dangerIconWrap}>
                <Ionicons name="trash-outline" size={28} color="#EF4444" />
              </View>

              <Text style={styles.confirmTitle}>Xóa huấn luyện viên?</Text>
              <Text style={styles.confirmMessage}>
                {`Bạn có chắc chắn muốn xóa tài khoản của HLV "${display(deletingPt)}"?\nThao tác này không thể hoàn tác. Các học viên phụ trách cần được điều chuyển trước khi xóa.`}
              </Text>

              {actionError ? (
                <View style={styles.errorNotice}>
                  <Text style={styles.errorNoticeText}>{actionError}</Text>
                </View>
              ) : null}

              <View style={styles.confirmBtnRow}>
                <Pressable
                  disabled={busy}
                  onPress={() => setDeletingPt(null)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() => {
                      if (!removable(deletingPt)) {
                        throw new Error('Bạn không có quyền xóa tài khoản HLV này.');
                      }
                      return api.delete(`${resource.path}/${recordId(deletingPt)}`);
                    })
                  }
                  style={styles.confirmDeleteBtn}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>Xóa vĩnh viễn</Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  ptListScroll: {
    flex: 1,
  },
  /* Statistics also serve as status filters. */
  statsCard: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCol: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statColSelected: { backgroundColor: colors.surfaceIce, borderColor: colors.primary },
  statColPressed: { opacity: 0.8 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statVal: { fontSize: 16, lineHeight: 20, fontWeight: '700', color: colors.text, flexShrink: 1 },
  statLbl: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: colors.textMuted },
  statLabelSelected: { color: colors.primaryDark, fontWeight: '700' },

  /* Search Row */
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    gap: 6,
  },
  addBtnPressed: {
    backgroundColor: '#0369A1',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Toast */
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toastText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#16A34A',
  },

  /* Scroll Content */
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },

  /* PT Card */
  ptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  ptCardPressed: {
    backgroundColor: '#F8FAFC',
  },
  ptCardLocked: {
    opacity: 0.8,
    backgroundColor: '#F8FAFC',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ptName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 20,
    gap: 4,
  },
  ptPhone: {
    fontSize: 12,
    lineHeight: 20,
    color: colors.textMuted,
    flexShrink: 1,
  },
  specializationText: {
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Metrics Row */
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
  },
  metricBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  editIconBtn: {
    width: 44,
    height: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceIce,
  },
  editIconBtnPressed: { opacity: 0.7 },

  /* Pagination */
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pageInfo: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },

  /* States */
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorDesc: {
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyDesc: {
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Bottom Sheet Detail */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    gap: 14,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSub: {
    fontSize: 12,
    color: '#64748B',
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    maxHeight: 380,
  },
  sheetInfoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  bioBox: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 4,
  },
  bioLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  bioText: {
    fontSize: 12.5,
    color: '#0F172A',
    lineHeight: 18,
  },
  sheetActions: {
    marginTop: 16,
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 46,
  },
  primaryActionBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    height: 46,
  },
  dangerActionBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  errorNoticeText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },

  /* Confirm Delete Modal */
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  dangerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  confirmMessage: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
