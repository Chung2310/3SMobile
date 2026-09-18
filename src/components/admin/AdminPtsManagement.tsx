import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { PtFormModal } from './PtFormModal';

export function AdminPtsManagement() {
  const resource = resources.pts;
  const { session } = useAuth();

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

  const totalPtCount = total ?? items.length;
  const activePtCount = items.filter((pt) => pt.status === 'ACTIVE').length;
  const lockedPtCount = items.filter((pt) => pt.status === 'LOCKED').length;

  const handleCall = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone) Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* 1. THẺ THỐNG KÊ TỔNG HỢP HLV */}
      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <View style={[styles.statIconWrap, { backgroundColor: '#F0F9FF' }]}>
            <Ionicons name="people" size={15} color={colors.primary} />
          </View>
          <View style={styles.statInfo}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{totalPtCount}</Text>
            <Text style={styles.statLbl}>Tổng số HLV</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <Pressable
          onPress={() => setStatus((prev) => (prev === 'ACTIVE' ? 'ALL' : 'ACTIVE'))}
          style={({ pressed }) => [styles.statCol, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
          </View>
          <View style={styles.statInfo}>
            <Text style={[styles.statVal, { color: '#16A34A' }]}>{activePtCount}</Text>
            <Text style={styles.statLbl}>Đang hoạt động</Text>
          </View>
        </Pressable>

        <View style={styles.statDivider} />

        <Pressable
          onPress={() => setStatus((prev) => (prev === 'LOCKED' ? 'ALL' : 'LOCKED'))}
          style={({ pressed }) => [styles.statCol, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.statIconWrap, { backgroundColor: lockedPtCount > 0 ? '#FEF2F2' : '#F8FAFC' }]}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={lockedPtCount > 0 ? '#EF4444' : colors.textMuted}
            />
          </View>
          <View style={styles.statInfo}>
            <Text style={[styles.statVal, { color: lockedPtCount > 0 ? '#EF4444' : colors.textMuted }]}>
              {lockedPtCount}
            </Text>
            <Text style={styles.statLbl}>Đã khóa</Text>
          </View>
        </Pressable>
      </View>

      {/* 2. THANH TÌM KIẾM & NÚT THÊM HLV */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên HLV, SĐT, tài khoản..."
            placeholderTextColor={colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            onSubmitEditing={() => {
              setApplied(keyword);
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

      {/* 3. BỘ LỌC TRẠNG THÁI DẠNG PILLS */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => {
            setStatus('ALL');
            setPage(1);
          }}
          style={[styles.filterPill, status === 'ALL' && styles.filterPillActive]}
        >
          <Text style={[styles.filterText, status === 'ALL' && styles.filterTextActive]}>
            Tất cả ({totalPtCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setStatus('ACTIVE');
            setPage(1);
          }}
          style={[styles.filterPill, status === 'ACTIVE' && styles.filterPillActive]}
        >
          <Text style={[styles.filterText, status === 'ACTIVE' && styles.filterTextActive]}>
            Đang hoạt động ({activePtCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setStatus('LOCKED');
            setPage(1);
          }}
          style={[styles.filterPill, status === 'LOCKED' && styles.filterPillActive]}
        >
          <Text style={[styles.filterText, status === 'LOCKED' && styles.filterTextActive]}>
            Đã khóa ({lockedPtCount})
          </Text>
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
            const initial = fullName.slice(0, 1).toUpperCase();

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
                    <View style={[styles.avatarBox, isLocked && { backgroundColor: '#64748B' }]}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>
                    <View
                      style={[
                        styles.onlineDot,
                        { backgroundColor: isLocked ? '#EF4444' : '#22C55E' },
                      ]}
                    />
                  </View>

                  <View style={styles.cardHeaderInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.ptName} numberOfLines={1}>
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

                    <Text style={styles.ptUsername}>@{String(pt.username || '')}</Text>
                    {pt.specialization ? (
                      <Text style={styles.specializationText} numberOfLines={1}>
                        {String(pt.specialization)}
                        {pt.yearsOfExperience ? ` · ${String(pt.yearsOfExperience)} năm KN` : ''}
                      </Text>
                    ) : null}
                  </View>

                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
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

                {/* Contact & Actions Quick Row */}
                <View style={styles.cardActionsRow}>
                  <View style={styles.contactLeft}>
                    {pt.phone ? (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCall(String(pt.phone));
                        }}
                        style={({ pressed }) => [
                          styles.contactBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                        hitSlop={6}
                      >
                        <Feather name="phone" size={13} color={colors.primary} />
                        <Text style={styles.contactText}>{String(pt.phone)}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.noContactText}>Chưa có số điện thoại</Text>
                    )}
                  </View>

                  <View style={styles.actionsRight}>
                    {editable(pt) && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          setForm(pt);
                        }}
                        style={({ pressed }) => [
                          styles.actionSmallBtn,
                          pressed && styles.actionSmallBtnPressed,
                        ]}
                        hitSlop={8}
                        accessibilityLabel="Chỉnh sửa HLV"
                      >
                        <Feather name="edit-2" size={14} color={colors.primary} />
                        <Text style={styles.actionSmallBtnText}>Sửa</Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedPt(pt);
                      }}
                      style={({ pressed }) => [
                        styles.actionSmallBtn,
                        styles.detailBtn,
                        pressed && styles.actionSmallBtnPressed,
                      ]}
                      hitSlop={8}
                    >
                      <Text style={styles.detailBtnText}>Chi tiết</Text>
                    </Pressable>
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
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>
                    {String(selectedPt.fullName || selectedPt.username || 'PT').slice(0, 1).toUpperCase()}
                  </Text>
                </View>

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
    gap: 12,
  },
  /* Stats Card */
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  statCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 12,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

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

  /* Filters */
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
  ptUsername: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
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

  /* Card Actions Row */
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  contactLeft: {
    flex: 1,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  noContactText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionsRight: {
    flexDirection: 'row',
    gap: 6,
  },
  actionSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  actionSmallBtnPressed: {
    opacity: 0.7,
  },
  actionSmallBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primary,
  },
  detailBtn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  detailBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },

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
