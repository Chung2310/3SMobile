import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import {
  display,
  listPath,
  recordId,
  resources,
  type AdminRecord,
} from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

function formatCurrency(amount: unknown): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '0 đ';
  return `${num.toLocaleString('vi-VN')} đ`;
}

export function AdminPackagesManagement() {
  const resource = resources.packages;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<AdminRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number>();
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [form, setForm] = useState<AdminRecord | null | undefined>(undefined);
  const [selectedPackage, setSelectedPackage] = useState<AdminRecord | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<AdminRecord | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const actionLock = useRef(false);
  const version = useRef(0);

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
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const [counts, setCounts] = useState<{ total: number; active: number; inactive: number }>({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const loadCounts = useCallback(async () => {
    try {
      const [allRes, activeRes, inactiveRes] = await Promise.allSettled([
        api.getPage<AdminRecord>(listPath(resource, 1, '', '')),
        api.getPage<AdminRecord>(listPath(resource, 1, '', 'ACTIVE')),
        api.getPage<AdminRecord>(listPath(resource, 1, '', 'INACTIVE')),
      ]);
      const totalCount = allRes.status === 'fulfilled' ? (allRes.value.meta?.total ?? allRes.value.data?.length ?? 0) : 0;
      const activeCount = activeRes.status === 'fulfilled' ? (activeRes.value.meta?.total ?? activeRes.value.data?.length ?? 0) : 0;
      const inactiveCount = inactiveRes.status === 'fulfilled' ? (inactiveRes.value.meta?.total ?? inactiveRes.value.data?.length ?? 0) : 0;
      setCounts({ total: totalCount, active: activeCount, inactive: inactiveCount });
    } catch {
      // ignore
    }
  }, [resource]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCounts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCounts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
    void loadCounts();
  }, [load, loadCounts]);

  const afterSave = () => {
    setSuccess('Đã lưu thay đổi thành công.');
    setTimeout(() => setSuccess(''), 3500);
    setForm(undefined);
    void load();
    void loadCounts();
  };

  const runAction = async (action: () => Promise<unknown>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError('');
    try {
      await action();
      setDeletingPackage(null);
      setStatusTarget(null);
      setSelectedPackage(null);
      afterSave();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const handleSelectStatus = (target: 'ALL' | 'ACTIVE' | 'INACTIVE') => {
    setStatus((prev) => {
      if (target === 'ALL') return 'ALL';
      return prev === target ? 'ALL' : target;
    });
    setPage(1);
  };

  // Stats
  const hasLoadedCounts = counts.total > 0 || counts.active > 0 || counts.inactive > 0;
  const totalPackages = hasLoadedCounts ? counts.total : (total ?? items.length);
  const activePackages = hasLoadedCounts ? counts.active : items.filter((i) => i.status === 'ACTIVE').length;
  const inactivePackages = hasLoadedCounts ? counts.inactive : items.filter((i) => i.status === 'INACTIVE').length;

  return (
    <View style={styles.container}>
      {/* 1. STATS BANNER / QUICK STATUS FILTERS */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.statItem,
              status === 'ALL' && styles.statItemAllActive,
              pressed && styles.statItemPressed,
            ]}
            onPress={() => handleSelectStatus('ALL')}
          >
            <View
              style={[
                styles.statIconBox,
                status === 'ALL'
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: '#E0F2FE' },
              ]}
            >
              <Ionicons
                name="cube"
                size={16}
                color={status === 'ALL' ? '#FFFFFF' : colors.primary}
              />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalPackages}</Text>
            <Text
              style={[
                styles.statLabel,
                status === 'ALL' && styles.statLabelAllActive,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Tổng số gói
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.statItem,
              status === 'ACTIVE' && styles.statItemActiveActive,
              pressed && styles.statItemPressed,
            ]}
            onPress={() => handleSelectStatus('ACTIVE')}
          >
            <View
              style={[
                styles.statIconBox,
                status === 'ACTIVE'
                  ? { backgroundColor: '#16A34A' }
                  : { backgroundColor: '#DCFCE7' },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={status === 'ACTIVE' ? '#FFFFFF' : '#16A34A'}
              />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{activePackages}</Text>
            <Text
              style={[
                styles.statLabel,
                status === 'ACTIVE' && styles.statLabelActiveActive,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Đang áp dụng
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.statItem,
              status === 'INACTIVE' && styles.statItemInactiveActive,
              pressed && styles.statItemPressed,
            ]}
            onPress={() => handleSelectStatus('INACTIVE')}
          >
            <View
              style={[
                styles.statIconBox,
                status === 'INACTIVE'
                  ? { backgroundColor: '#EF4444' }
                  : { backgroundColor: '#FEE2E2' },
              ]}
            >
              <Ionicons
                name="pause-circle"
                size={16}
                color={status === 'INACTIVE' ? '#FFFFFF' : '#EF4444'}
              />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{inactivePackages}</Text>
            <Text
              style={[
                styles.statLabel,
                status === 'INACTIVE' && styles.statLabelInactiveActive,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Tạm ngừng
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. ACTIONS TOOLBAR */}
      <View style={styles.toolbarRow}>
        <Pressable
          onPress={() => setForm(null)}
          style={({ pressed }) => [
            styles.addPackageBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="plus" size={17} color="#FFFFFF" />
          <Text style={styles.addPackageBtnText}>Thêm gói tập</Text>
        </Pressable>

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

      {/* 3. SEARCH INPUT */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Tìm theo tên gói tập, mô tả…"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={keyword}
            onChangeText={setKeyword}
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
            >
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>



      {/* Success banner */}
      {success ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      {/* 5. PACKAGES LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải danh sách gói tập…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="cube-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>Chưa có gói tập mẫu nào phù hợp.</Text>
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
            const pId = recordId(item);
            const isActive = item.status === 'ACTIVE';

            return (
              <View key={pId} style={styles.packageCard}>
                {/* Clickable body area to view details */}
                <Pressable
                  onPress={() => setSelectedPackage(item)}
                  style={({ pressed }) => [
                    styles.cardMainPressable,
                    pressed && { opacity: 0.92 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Chi tiết gói tập ${display(item.name)}`}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.packageIconBox}>
                      <Ionicons name="flame" size={20} color={colors.primary} />
                    </View>

                    <View style={styles.headerInfo}>
                      <Text style={styles.packageName} numberOfLines={1} ellipsizeMode="tail">
                        {display(item.name)}
                      </Text>
                      <Text style={styles.packagePrice}>
                        {formatCurrency(item.price)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isActive ? '#16A34A' : '#EF4444' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isActive ? '#16A34A' : '#EF4444' },
                        ]}
                      >
                        {isActive ? 'Đang áp dụng' : 'Tạm ngừng'}
                      </Text>
                    </View>
                  </View>

                  {/* Metrics Badges */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricChip}>
                      <Feather name="check-circle" size={12} color="#0284C7" />
                      <Text style={styles.metricChipText}>
                        {String(item.totalSessions || 0)} buổi tập
                      </Text>
                    </View>

                    <View style={styles.metricChip}>
                      <Feather name="calendar" size={12} color="#475569" />
                      <Text style={styles.metricChipText}>
                        Thời hạn {String(item.durationDays || 0)} ngày
                      </Text>
                    </View>
                  </View>

                  {/* Description preview */}
                  {item.description ? (
                    <Text style={styles.packageDesc} numberOfLines={2} ellipsizeMode="tail">
                      {String(item.description)}
                    </Text>
                  ) : null}
                </Pressable>

                {/* Actions Row */}
                <View style={styles.cardActionsRow}>
                  {/* Sửa */}
                  <Pressable
                    onPress={() => setForm(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Feather name="edit-2" size={14} color="#334155" />
                    <Text style={styles.actionBtnText}>Sửa</Text>
                  </Pressable>

                  {/* Bật / Tắt trạng thái với popup xác nhận */}
                  <Pressable
                    onPress={() => {
                      setActionError('');
                      setStatusTarget(item);
                    }}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Feather
                      name={isActive ? 'pause' : 'play'}
                      size={14}
                      color={isActive ? '#D97706' : '#16A34A'}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: isActive ? '#D97706' : '#16A34A' },
                      ]}
                    >
                      {isActive ? 'Tạm ngừng' : 'Kích hoạt'}
                    </Text>
                  </Pressable>

                  {/* Xóa */}
                  <Pressable
                    onPress={() => {
                      setActionError('');
                      setDeletingPackage(item);
                    }}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Feather name="trash-2" size={14} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Xóa</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {/* Pagination */}
        {!loading && !error && pages > 1 && (
          <View style={styles.paginationRow}>
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            >
              <Feather name="chevron-left" size={16} color={colors.text} />
              <Text style={styles.pageBtnText}>Trước</Text>
            </Pressable>

            <Text style={styles.pageInfoText}>
              Trang {page} / {pages}
            </Text>

            <Pressable
              onPress={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              style={[styles.pageBtn, page >= pages && styles.pageBtnDisabled]}
            >
              <Text style={styles.pageBtnText}>Sau</Text>
              <Feather name="chevron-right" size={16} color={colors.text} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: FORM CREATE / EDIT */}
      {form !== undefined && (
        <PackageFormModal
          visible={form !== undefined}
          item={form}
          onClose={() => setForm(undefined)}
          onSuccess={afterSave}
        />
      )}

      {/* MODAL 2: BOTTOM SHEET DETAIL */}
      {selectedPackage && (
        <Modal
          visible={Boolean(selectedPackage)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedPackage(null)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedPackage(null)}
            />

            <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetHandle} />

              <View style={styles.detailHeader}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="flame" size={24} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{display(selectedPackage.name)}</Text>
                  <Text style={styles.detailPrice}>{formatCurrency(selectedPackage.price)}</Text>
                </View>

                <Pressable
                  onPress={() => setSelectedPackage(null)}
                  hitSlop={8}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetBody}
              >
                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Số buổi tập</Text>
                    <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>
                      {String(selectedPackage.totalSessions || 0)} buổi
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Thời hạn sử dụng</Text>
                    <Text style={styles.infoValue}>
                      {String(selectedPackage.durationDays || 0)} ngày
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Giá gói</Text>
                    <Text style={[styles.infoValue, { color: '#16A34A', fontWeight: '700' }]}>
                      {formatCurrency(selectedPackage.price)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Trạng thái</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color: selectedPackage.status === 'ACTIVE' ? '#16A34A' : '#EF4444',
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {selectedPackage.status === 'ACTIVE' ? 'Đang áp dụng' : 'Tạm ngừng'}
                    </Text>
                  </View>
                </View>

                {selectedPackage.description ? (
                  <View style={[styles.infoSection, { marginTop: 12 }]}>
                    <Text style={styles.infoSectionTitle}>Mô tả gói tập</Text>
                    <Text style={styles.infoSectionBody}>
                      {String(selectedPackage.description)}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              {/* Detail Sheet Actions */}
              <View style={styles.detailActions}>
                <Pressable
                  onPress={() => {
                    const p = selectedPackage;
                    setSelectedPackage(null);
                    setForm(p);
                  }}
                  style={styles.detailEditBtn}
                >
                  <Feather name="edit-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.detailEditText}>Chỉnh sửa gói tập</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const p = selectedPackage;
                    setSelectedPackage(null);
                    setActionError('');
                    setStatusTarget(p);
                  }}
                  style={[
                    styles.detailStatusBtn,
                    {
                      backgroundColor:
                        selectedPackage.status === 'ACTIVE' ? '#FEF3C7' : '#DCFCE7',
                      borderColor:
                        selectedPackage.status === 'ACTIVE' ? '#FDE68A' : '#86EFAC',
                    },
                  ]}
                >
                  <Feather
                    name={selectedPackage.status === 'ACTIVE' ? 'pause' : 'play'}
                    size={16}
                    color={selectedPackage.status === 'ACTIVE' ? '#D97706' : '#16A34A'}
                  />
                </Pressable>

                <Pressable
                  onPress={() => {
                    const p = selectedPackage;
                    setSelectedPackage(null);
                    setActionError('');
                    setDeletingPackage(p);
                  }}
                  style={styles.detailDeleteBtn}
                >
                  <Feather name="trash-2" size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 3: CONFIRM STATUS TOGGLE */}
      {statusTarget && (
        <Modal
          visible={Boolean(statusTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setStatusTarget(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View
                style={[
                  styles.modalIconBox,
                  {
                    backgroundColor:
                      statusTarget.status === 'ACTIVE' ? '#FEF3C7' : '#DCFCE7',
                  },
                ]}
              >
                <Feather
                  name={statusTarget.status === 'ACTIVE' ? 'pause' : 'play'}
                  size={26}
                  color={statusTarget.status === 'ACTIVE' ? '#D97706' : '#16A34A'}
                />
              </View>

              <Text style={styles.modalTitle}>
                {statusTarget.status === 'ACTIVE'
                  ? 'Tạm ngừng gói tập'
                  : 'Kích hoạt gói tập'}
              </Text>

              <Text style={styles.modalDesc}>
                {statusTarget.status === 'ACTIVE'
                  ? `Bạn có chắc chắn muốn tạm ngừng gói tập “${display(statusTarget.name)}”? Gói tập này sẽ không thể chọn khi tạo hợp đồng mới.`
                  : `Bạn có chắc chắn muốn kích hoạt gói tập “${display(statusTarget.name)}”? Gói tập này sẽ sẵn sàng để áp dụng cho học viên.`}
              </Text>

              {actionError ? (
                <View style={styles.errorNotice}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorNoticeText}>{actionError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => setStatusTarget(null)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() =>
                      api.patch(`${resource.path}/${recordId(statusTarget)}`, {
                        status: statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                      })
                    )
                  }
                  style={[
                    styles.modalConfirmBtn,
                    {
                      backgroundColor:
                        statusTarget.status === 'ACTIVE' ? '#D97706' : '#16A34A',
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>
                      {statusTarget.status === 'ACTIVE' ? 'Tạm ngừng' : 'Kích hoạt'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 4: CONFIRM DELETE */}
      {deletingPackage && (
        <Modal
          visible={Boolean(deletingPackage)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeletingPackage(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.deleteIconBox}>
                <Feather name="trash-2" size={26} color="#EF4444" />
              </View>

              <Text style={styles.modalTitle}>Xóa gói tập mẫu</Text>

              <Text style={styles.modalDesc}>
                Bạn có chắc chắn muốn xóa gói tập &ldquo;{display(deletingPackage.name)}&rdquo;? Thao tác này không thể hoàn tác.
              </Text>

              {actionError ? (
                <View style={styles.errorNotice}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorNoticeText}>{actionError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => setDeletingPackage(null)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() =>
                      api.delete(`${resource.path}/${recordId(deletingPackage)}`)
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

// Dedicated Package Form Modal
function PackageFormModal({
  visible,
  item,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  item?: AdminRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const resource = resources.packages;
  const insets = useSafeAreaInsets();
  const editing = Boolean(item);

  const [name, setName] = useState(String(item?.name || ''));
  const [totalSessions, setTotalSessions] = useState(String(item?.totalSessions || '12'));
  const [durationDays, setDurationDays] = useState(String(item?.durationDays || '30'));
  const [price, setPrice] = useState(String(item?.price ?? '0'));
  const [description, setDescription] = useState(String(item?.description || ''));
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(
    (item?.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE'
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const handleSubmit = async () => {
    if (lock.current || busy) return;
    setError('');

    if (!name.trim()) {
      setError('Vui lòng nhập tên gói tập.');
      return;
    }

    const sessionsNum = Number(totalSessions);
    if (!Number.isFinite(sessionsNum) || !Number.isInteger(sessionsNum) || sessionsNum < 1) {
      setError('Số buổi tập phải là số nguyên dương lớn hơn 0.');
      return;
    }

    const daysNum = Number(durationDays);
    if (!Number.isFinite(daysNum) || !Number.isInteger(daysNum) || daysNum < 1) {
      setError('Thời hạn phải là số nguyên dương lớn hơn 0.');
      return;
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('Giá gói tập phải là số không âm.');
      return;
    }

    try {
      lock.current = true;
      setBusy(true);

      const payload = {
        name: name.trim(),
        totalSessions: sessionsNum,
        durationDays: daysNum,
        price: priceNum,
        description: description.trim(),
        status,
      };

      if (editing && item) {
        await api.patch(`${resource.path}/${recordId(item)}`, payload);
      } else {
        await api.post(resource.path, payload);
      }

      onSuccess();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ maxHeight: '92%' }}
        >
          <View style={[styles.formSheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {editing ? 'Chỉnh sửa gói tập' : 'Thêm gói tập mẫu mới'}
                </Text>
                <Text style={styles.sheetSub}>
                  {editing ? display(item?.name) : 'Cấu hình gói tập chuẩn cho hệ thống'}
                </Text>
              </View>

              <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 16, gap: 14 }}
            >
              {error ? (
                <View style={styles.errorNotice}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorNoticeText}>{error}</Text>
                </View>
              ) : null}

              {/* Package Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Tên gói tập <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: Gói PT 12 buổi / 1 tháng"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Sessions & Duration */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>
                    Số buổi <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="12"
                    placeholderTextColor="#94A3B8"
                    value={totalSessions}
                    onChangeText={setTotalSessions}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>
                    Thời hạn (ngày) <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="30"
                    placeholderTextColor="#94A3B8"
                    value={durationDays}
                    onChangeText={setDurationDays}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Price */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Giá bán (VNĐ) <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="5000000"
                  placeholderTextColor="#94A3B8"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mô tả gói tập</Text>
                <TextInput
                  style={[styles.formInput, { height: 80, paddingTop: 10, textAlignVertical: 'top' }]}
                  placeholder="Mô tả quyền lợi, đối tượng học viên phù hợp…"
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              {/* Status */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Trạng thái gói tập</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(
                    [
                      { key: 'ACTIVE', label: 'Đang áp dụng', color: '#16A34A', bg: '#DCFCE7' },
                      { key: 'INACTIVE', label: 'Tạm ngừng', color: '#EF4444', bg: '#FEE2E2' },
                    ] as const
                  ).map((st) => (
                    <Pressable
                      key={st.key}
                      onPress={() => setStatus(st.key)}
                      style={[
                        styles.statusSelectPill,
                        status === st.key && { borderColor: st.color, backgroundColor: st.bg },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                      <Text
                        style={[
                          styles.statusSelectText,
                          status === st.key && { color: st.color, fontWeight: '700' },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable
                onPress={onClose}
                disabled={busy}
                style={styles.formCancelBtn}
              >
                <Text style={styles.formCancelText}>Hủy</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleSubmit()}
                disabled={busy}
                style={styles.formSubmitBtn}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.formSubmitText}>
                    {editing ? 'Lưu thay đổi' : 'Tạo gói tập'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
  },
  statItemPressed: {
    opacity: 0.75,
  },
  statItemAllActive: {
    backgroundColor: '#F0F9FF',
    borderColor: colors.primary,
  },
  statItemActiveActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  statItemInactiveActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
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
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  statLabelAllActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  statLabelActiveActive: {
    color: '#16A34A',
    fontWeight: '700',
  },
  statLabelInactiveActive: {
    color: '#EF4444',
    fontWeight: '700',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  addPackageBtn: {
    flex: 1,
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
  addPackageBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
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
  clearFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '600',
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  cardMainPressable: {
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  packageName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  packagePrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
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
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricChipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  packageDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
  },
  actionBtnPressed: {
    opacity: 0.7,
    backgroundColor: '#F1F5F9',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  detailPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
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
  sheetBody: {
    paddingVertical: 14,
  },
  infoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  infoSectionBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailEditBtn: {
    flex: 1,
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailStatusBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDeleteBtn: {
    width: 46,
    height: 46,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
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
  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  // Form Sheet
  formSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
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
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  formInput: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
  },
  statusSelectPill: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  formCancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  formSubmitBtn: {
    flex: 2,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
});
