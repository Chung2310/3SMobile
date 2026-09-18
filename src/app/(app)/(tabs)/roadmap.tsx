import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { CustomerSelectModal } from '@/components/CustomerSelectModal';
import {
  RoadmapEditModal,
  RoadmapEmptyState,
  RoadmapMetricsGrid,
  RoadmapPhasesAccordion,
  RoadmapStrategyCard,
} from '@/components/roadmap';
import { useAuth } from '@/context/AuthContext';
import { useJourney } from '@/context/JourneyContext';
import { api } from '@/services/api/client';
import { fetchCustomersList } from '@/services/customerService';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile } from '@/types/domain';
import type { Roadmap, RoadmapPhase } from '@/types/roadmap';

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

export default function RoadmapScreen() {
  const { session } = useAuth();
  const role = session?.user?.role;
  const isStaff = role === 'PT' || role === 'ADMIN';

  // Customer context from global provider
  const {
    journey: customerJourney,
    loading: customerLoading,
    refreshing: customerRefreshing,
    refresh: refreshCustomerJourney,
  } = useJourney();

  // Roadmaps list & active selection
  const [staffRoadmaps, setStaffRoadmaps] = useState<Roadmap[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null);

  // Edit modal state
  const [editingRoadmap, setEditingRoadmap] = useState<Roadmap | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [deletingRoadmap, setDeletingRoadmap] = useState<Roadmap | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [filterCustomerId, setFilterCustomerId] = useState<string>('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);

  // Loading & Error states
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffRefreshing, setStaffRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Map customer ID to profile for lookup
  const customerMap = useMemo(() => {
    const map: Record<string, CustomerProfile> = {};
    customers.forEach((c) => {
      if (c._id) map[c._id] = c;
    });
    return map;
  }, [customers]);

  // Load data for Staff (PT / Admin)
  const loadStaffData = useCallback(async (isPullRefresh = false) => {
    if (!isStaff) return;
    if (isPullRefresh) {
      setStaffRefreshing(true);
    } else {
      setStaffLoading(true);
    }
    setFetchError(null);

    try {
      const [roadmapsData, customersData] = await Promise.all([
        api.get<Roadmap[]>('/api/roadmaps?limit=50'),
        fetchCustomersList({ limit: 100 }),
      ]);

      const items = Array.isArray(roadmapsData) ? roadmapsData : [];
      setStaffRoadmaps(items);

      if (Array.isArray(customersData)) {
        setCustomers(customersData);
      }
    } catch (cause) {
      setFetchError(cause instanceof Error ? cause.message : 'Không thể tải danh sách lộ trình.');
    } finally {
      setStaffLoading(false);
      setStaffRefreshing(false);
    }
  }, [isStaff]);

  useEffect(() => {
    if (isStaff) {
      void loadStaffData();
    }
  }, [isStaff, loadStaffData]);

  // All roadmaps for current user:
  // - If staff: staffRoadmaps
  // - If customer: customerJourney?.roadmaps
  const allRoadmaps: Roadmap[] = useMemo(() => {
    if (isStaff) return staffRoadmaps;
    return (customerJourney?.roadmaps as Roadmap[]) || [];
  }, [customerJourney?.roadmaps, isStaff, staffRoadmaps]);

  // Filter roadmaps by status and customer
  const filteredRoadmaps = useMemo(() => {
    return allRoadmaps.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (filterCustomerId && r.customerId !== filterCustomerId) return false;
      return true;
    });
  }, [allRoadmaps, filterCustomerId, statusFilter]);

  const loading = isStaff ? staffLoading : customerLoading;
  const refreshing = isStaff ? staffRefreshing : customerRefreshing;

  const handleRefresh = async () => {
    if (isStaff) {
      await loadStaffData(true);
    } else {
      await refreshCustomerJourney();
    }
  };

  // Helper to clean duplicate customer name from title
  const cleanTitle = (title: string, customerId?: string) => {
    if (!title) return '';
    const cust = customerId ? customerMap[customerId] : undefined;
    if (!cust?.fullName) return title;
    const regex = new RegExp(`\\s*-\\s*${cust.fullName.trim()}$`, 'i');
    return title.replace(regex, '').trim();
  };

  // Action: Save Edit
  const handleSaveEdit = async (payload: {
    title: string;
    strategy?: Record<string, unknown>;
    baseline?: Record<string, unknown>;
    phases?: RoadmapPhase[];
  }) => {
    if (!editingRoadmap) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await api.patch<Roadmap>(`/api/roadmaps/${editingRoadmap._id}`, payload);
      setShowEditModal(false);
      setEditingRoadmap(null);
      // Update selectedRoadmap if currently open
      if (selectedRoadmap?._id === editingRoadmap._id && updated) {
        setSelectedRoadmap(updated);
      }
      await handleRefresh();
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : 'Không thể lưu thay đổi.');
    } finally {
      setEditLoading(false);
    }
  };

  // Action: Toggle Publish / Unpublish
  const handleTogglePublish = async (roadmap: Roadmap) => {
    try {
      const action = roadmap.status === 'PUBLISHED' ? 'unpublish' : 'publish';
      const updated = await api.patch<Roadmap>(`/api/roadmaps/${roadmap._id}/${action}`);
      if (selectedRoadmap?._id === roadmap._id && updated) {
        setSelectedRoadmap(updated);
      }
      await handleRefresh();
    } catch (cause) {
      setFetchError(cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái.');
    }
  };

  // Action: Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingRoadmap) return;
    setDeleteLoading(true);
    setDeleteError(undefined);
    try {
      if (deletingRoadmap.status === 'PUBLISHED') {
        // Unpublish first per backend business rule
        await api.patch(`/api/roadmaps/${deletingRoadmap._id}/unpublish`);
      }
      await api.delete(`/api/roadmaps/${deletingRoadmap._id}`);
      setDeletingRoadmap(null);
      if (selectedRoadmap?._id === deletingRoadmap._id) {
        setSelectedRoadmap(null);
      }
      await handleRefresh();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Không thể xóa lộ trình.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ==========================================
  // VIEW 1: ROADMAP DETAIL VIEW (when selected)
  // ==========================================
  if (selectedRoadmap) {
    const cust = selectedRoadmap.customerId ? customerMap[selectedRoadmap.customerId] : undefined;
    const custName = cust?.fullName || '';
    const displayTitle = cleanTitle(selectedRoadmap.title, selectedRoadmap.customerId);
    const isPublished = selectedRoadmap.status === 'PUBLISHED';

    return (
      <Screen
        title="Chi tiết lộ trình"
        onBack={() => setSelectedRoadmap(null)}
      >
        <View style={styles.detailContainer}>
          {/* Top Detail Header Card: Status, Actions, Full Title, Customer */}
          <View style={styles.detailHeaderCard}>
            {/* Top row: Status/Version on Left, PT Actions on Right */}
            <View style={styles.detailCardTopRow}>
              <View style={styles.detailBadgeGroup}>
                <View
                  style={[
                    styles.statusBadge,
                    isPublished ? styles.statusBadgePub : styles.statusBadgeDraft,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isPublished ? styles.statusTextPub : styles.statusTextDraft,
                    ]}
                  >
                    {isPublished ? 'Đã công bố' : 'Bản nháp'}
                  </Text>
                </View>
                <Text style={styles.detailVersionText}>v{selectedRoadmap.version || 1}</Text>
              </View>

              {/* Actions for PT on Detail view: Sửa | Gỡ công bố / Công bố | Xóa */}
              {isStaff && (
                <View style={styles.detailTopActions}>
                  <Pressable
                    onPress={() => {
                      setEditingRoadmap(selectedRoadmap);
                      setShowEditModal(true);
                    }}
                    style={[styles.detailMiniBtn, styles.detailMiniBtnSecondary]}
                  >
                    <Text style={styles.detailMiniBtnText}>Sửa</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void handleTogglePublish(selectedRoadmap)}
                    style={[
                      styles.detailMiniBtn,
                      isPublished ? styles.detailMiniBtnAmber : styles.detailMiniBtnGreen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailMiniBtnText,
                        isPublished ? { color: '#B45309' } : { color: '#15803D' },
                      ]}
                    >
                      {isPublished ? 'Gỡ công bố' : 'Công bố'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setDeletingRoadmap(selectedRoadmap)}
                    style={[styles.detailMiniBtn, styles.detailMiniBtnRed]}
                  >
                    <Text style={[styles.detailMiniBtnText, { color: '#DC2626' }]}>Xóa</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Full Roadmap Title: wraps gracefully without any overflow */}
            <Text style={styles.detailFullTitle}>
              {displayTitle}
            </Text>

            {/* Customer name if available */}
            {custName ? (
              <View style={styles.detailCustRow}>
                <Text style={styles.detailCustLabel}>Học viên:</Text>
                <Text style={styles.detailCustName}>{custName}</Text>
              </View>
            ) : null}
          </View>

          {/* 1. 4 Key Metrics in Single Compact Card */}
          <RoadmapMetricsGrid
            strategy={selectedRoadmap.strategy}
            baseline={selectedRoadmap.baseline}
          />

          {/* 2. Strategy & Checkpoints Card */}
          <RoadmapStrategyCard strategy={selectedRoadmap.strategy} />

          {/* 3. Phases & Weeks Breakdown Accordion */}
          <RoadmapPhasesAccordion phases={selectedRoadmap.phases} />
        </View>

        {/* Edit Modal */}
        <RoadmapEditModal
          visible={showEditModal}
          roadmap={editingRoadmap}
          loading={editLoading}
          error={editError}
          onSave={handleSaveEdit}
          onClose={() => {
            setShowEditModal(false);
            setEditingRoadmap(null);
            setEditError(null);
          }}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          visible={Boolean(deletingRoadmap)}
          title="Xóa lộ trình này?"
          message={
            deletingRoadmap?.status === 'PUBLISHED'
              ? `Lộ trình "${deletingRoadmap.title}" đang công bố. Hệ thống sẽ tự động thu hồi và xóa vĩnh viễn.`
              : `Bạn có chắc chắn muốn xóa lộ trình "${deletingRoadmap?.title}"? Hành động này không thể hoàn tác.`
          }
          loading={deleteLoading}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeletingRoadmap(null);
            setDeleteError(undefined);
          }}
        />
      </Screen>
    );
  }

  // ==========================================
  // VIEW 2: ROADMAPS LIST VIEW (Default)
  // ==========================================
  return (
    <Screen
      title="Lộ trình huấn luyện"
      onBack={null}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Staff Toolbar: Customer & Status Filters */}
      {isStaff && (
        <View style={styles.toolbar}>
          {/* Customer Filter */}
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setShowCustomerPicker(true)}
              style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.filterBtnText} numberOfLines={1}>
                {filterCustomerId && customerMap[filterCustomerId]
                  ? `Học viên: ${customerMap[filterCustomerId].fullName}`
                  : 'Tất cả học viên'}
              </Text>
              <Feather name="chevron-down" size={13} color={colors.textMuted} />
            </Pressable>

            {filterCustomerId ? (
              <Pressable
                onPress={() => setFilterCustomerId('')}
                hitSlop={8}
                style={styles.clearFilterBtn}
              >
                <Text style={styles.clearFilterText}>Xóa lọc</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Status Filter Tabs */}
          <View style={styles.statusTabsRow}>
            <Pressable
              onPress={() => setStatusFilter('ALL')}
              style={[styles.statusTab, statusFilter === 'ALL' && styles.statusTabActive]}
            >
              <Text style={[styles.statusTabText, statusFilter === 'ALL' && styles.statusTabTextActive]}>
                Tất cả ({allRoadmaps.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStatusFilter('PUBLISHED')}
              style={[styles.statusTab, statusFilter === 'PUBLISHED' && styles.statusTabActive]}
            >
              <Text style={[styles.statusTabText, statusFilter === 'PUBLISHED' && styles.statusTabTextActive]}>
                Đã công bố ({allRoadmaps.filter((r) => r.status === 'PUBLISHED').length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStatusFilter('DRAFT')}
              style={[styles.statusTab, statusFilter === 'DRAFT' && styles.statusTabActive]}
            >
              <Text style={[styles.statusTabText, statusFilter === 'DRAFT' && styles.statusTabTextActive]}>
                Bản nháp ({allRoadmaps.filter((r) => r.status === 'DRAFT').length})
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Error state */}
      {fetchError && !loading ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <Pressable onPress={() => void handleRefresh()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Loading state */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách lộ trình...</Text>
        </View>
      ) : filteredRoadmaps.length > 0 ? (
        /* List of Roadmap Cards */
        <View style={styles.listContainer}>
          {filteredRoadmaps.map((item) => {
            const isPublished = item.status === 'PUBLISHED';
            const cust = item.customerId ? customerMap[item.customerId] : undefined;
            const custName = cust?.fullName || '';
            const displayTitle = cleanTitle(item.title, item.customerId);

            const weeks = item.strategy?.estimatedWeeks || item.strategy?.durationWeeks || 12;
            const sessions = item.strategy?.sessionsPerWeek || 3;
            const calories = item.strategy?.nutrition?.targetCalories;
            const phasesCount = item.phases?.length || 0;

            return (
              <View key={item._id} style={styles.cardItem}>
                {/* Card Top Meta */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTopLeft}>
                    <View
                      style={[
                        styles.statusBadge,
                        isPublished ? styles.statusBadgePub : styles.statusBadgeDraft,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isPublished ? styles.statusTextPub : styles.statusTextDraft,
                        ]}
                      >
                        {isPublished ? 'Đã công bố' : 'Bản nháp'}
                      </Text>
                    </View>

                    {custName ? (
                      <Text style={styles.cardCustomerName} numberOfLines={1}>
                        {custName}
                      </Text>
                    ) : null}
                  </View>

                  <Text style={styles.cardVersion}>v{item.version || 1}</Text>
                </View>

                {/* Title (Tappable to view details) */}
                <Pressable onPress={() => setSelectedRoadmap(item)}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {displayTitle}
                  </Text>
                </Pressable>

                {/* Quick Summary Row */}
                <View style={styles.cardSummaryRow}>
                  <Text style={styles.cardSummaryText}>{weeks} tuần</Text>
                  <Text style={styles.cardSummaryDot}>·</Text>
                  <Text style={styles.cardSummaryText}>{sessions} buổi/tuần</Text>
                  {calories ? (
                    <>
                      <Text style={styles.cardSummaryDot}>·</Text>
                      <Text style={[styles.cardSummaryText, { color: '#16A34A', fontWeight: '700' }]}>
                        {calories} kcal
                      </Text>
                    </>
                  ) : null}
                  <Text style={styles.cardSummaryDot}>·</Text>
                  <Text style={styles.cardSummaryText}>{phasesCount} giai đoạn</Text>
                </View>

                {/* Card Action Buttons: Xem chi tiết | Sửa | Công bố/Gỡ công bố | Xóa */}
                <View style={styles.cardActionsRow}>
                  {/* Left: Công bố / Gỡ công bố (Staff only) */}
                  {isStaff ? (
                    <Pressable
                      onPress={() => void handleTogglePublish(item)}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        isPublished ? styles.actionBtnAmber : styles.actionBtnGreen,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          isPublished ? { color: '#B45309' } : { color: '#15803D' },
                        ]}
                      >
                        {isPublished ? 'Gỡ công bố' : 'Công bố'}
                      </Text>
                    </Pressable>
                  ) : <View />}

                  {/* Right Actions: Xem chi tiết | Sửa | Xóa */}
                  <View style={styles.cardActionsRight}>
                    {/* Xem chi tiết */}
                    <Pressable
                      onPress={() => setSelectedRoadmap(item)}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.actionBtnView,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text style={styles.actionBtnViewText}>Xem chi tiết</Text>
                    </Pressable>

                    {/* Sửa */}
                    {isStaff && (
                      <Pressable
                        onPress={() => {
                          setEditingRoadmap(item);
                          setShowEditModal(true);
                        }}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          styles.actionBtnSecondary,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={styles.actionBtnSecondaryText}>Sửa</Text>
                      </Pressable>
                    )}

                    {/* Xóa */}
                    {isStaff && (
                      <Pressable
                        onPress={() => setDeletingRoadmap(item)}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          styles.actionBtnRed,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={styles.actionBtnRedText}>Xóa</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        /* Empty State */
        <RoadmapEmptyState onRefresh={handleRefresh} isStaff={isStaff} />
      )}

      {/* Staff Customer Select Modal */}
      {isStaff && (
        <CustomerSelectModal
          visible={showCustomerPicker}
          customers={customers}
          selectedId={filterCustomerId}
          allowClear
          clearLabel="Tất cả học viên"
          title="Lọc theo học viên"
          onClose={() => setShowCustomerPicker(false)}
          onSelect={(id) => setFilterCustomerId(id)}
        />
      )}

      {/* Edit Roadmap Modal */}
      <RoadmapEditModal
        visible={showEditModal}
        roadmap={editingRoadmap}
        loading={editLoading}
        error={editError}
        onSave={handleSaveEdit}
        onClose={() => {
          setShowEditModal(false);
          setEditingRoadmap(null);
          setEditError(null);
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        visible={Boolean(deletingRoadmap)}
        title="Xóa lộ trình?"
        message={
          deletingRoadmap?.status === 'PUBLISHED'
            ? `Lộ trình "${deletingRoadmap.title}" đang công bố. Hệ thống sẽ tự động thu hồi và xóa.`
            : `Bạn có chắc chắn muốn xóa lộ trình "${deletingRoadmap?.title}"?`
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeletingRoadmap(null);
          setDeleteError(undefined);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    marginBottom: 8,
    gap: 6,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  clearFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  statusTabText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusTabTextActive: {
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 8,
    paddingBottom: 24,
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardCustomerName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    flex: 1,
  },
  cardVersion: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryNavy,
    lineHeight: 19,
  },
  cardSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardSummaryText: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  cardSummaryDot: {
    color: colors.textMuted,
    fontSize: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 2,
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnView: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  actionBtnViewText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  actionBtnSecondary: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  actionBtnGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  actionBtnAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  actionBtnRedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  detailContainer: {
    gap: 8,
  },
  detailHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
    marginBottom: 4,
  },
  detailCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailFullTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryNavy,
    lineHeight: 21,
  },
  detailCustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailCustLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailCustName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
  detailVersionText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
  },
  detailTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailMiniBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  detailMiniBtnSecondary: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  detailMiniBtnGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  detailMiniBtnAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  detailMiniBtnRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  detailMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgePub: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusTextPub: {
    color: '#15803D',
  },
  statusTextDraft: {
    color: '#B45309',
  },
});
