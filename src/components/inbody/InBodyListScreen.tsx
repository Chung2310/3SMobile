import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile } from '@/types/domain';
import type { InBodyRecordData } from '@/types/inbody';
import { fetchCustomersList } from '@/services/customerService';
import { inbodyService } from '@/services/inbodyService';
import { analyzeInBody } from '@/services/inbodyAnalytics';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { AppAlertModal, useAppAlert } from '../AppAlertModal';
import { CustomerSelectModal } from '../CustomerSelectModal';
import { InBodySummaryBanner } from './InBodySummaryBanner';
import { InBodyEvolutionChart } from './InBodyEvolutionChart';
import { InBodyDetailSheet } from './InBodyDetailSheet';
import { InBodyManualForm } from './InBodyManualForm';
import { InBodyOcrFlow } from './InBodyOcrFlow';
import { InBodyCard } from './InBodyCard';
import { PaginationBar } from '../PaginationBar';

const STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PUBLISHED', label: 'Đã công bố' },
  { id: 'DRAFT', label: 'Bản nháp' },
] as const;

const formatDateDisplay = (isoStr?: string): string => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function InBodyListScreen() {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { alertConfig, showError } = useAppAlert();

  const [records, setRecords] = useState<InBodyRecordData[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [openManualModal, setOpenManualModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InBodyRecordData | null>(null);
  const [openOcrModal, setOpenOcrModal] = useState(false);
  const [detailRecord, setDetailRecord] = useState<InBodyRecordData | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<InBodyRecordData | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Load customers list for filter & forms
  const loadCustomers = async () => {
    try {
      const list = await fetchCustomersList({ limit: 100 });
      setCustomers(list);
    } catch {
      // Ignore
    }
  };

  // Load InBody records
  const loadRecords = useCallback(
    async (pageToLoad = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const response = await inbodyService.getRecords({
          page: pageToLoad,
          limit: selectedCustomerId ? 50 : 10,
          customerId: selectedCustomerId || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        });

        let newRecords: InBodyRecordData[] = [];
        let meta = { page: 1, limit: 10, total: 0, totalPages: 1 };

        if (response && Array.isArray((response as any).data)) {
          newRecords = (response as any).data;
          if (response.meta) meta = response.meta;
        } else if (Array.isArray(response)) {
          newRecords = response;
          meta.total = response.length;
        }

        setRecords(newRecords);
        setPage(meta.page);
        setTotalPages(meta.totalPages);
        setTotalCount(meta.total);
      } catch (err) {
        console.error('[InBodyListScreen] Failed to load InBody records:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCustomerId, statusFilter]
  );

  useEffect(() => {
    void loadCustomers();
  }, []);

  useEffect(() => {
    void loadRecords(1);
  }, [loadRecords]);

  const handleRefresh = () => {
    void loadRecords(1, true);
  };

  // Find previous record for delta comparison
  const previousRecordForDetail = useMemo(() => {
    if (!detailRecord) return null;
    const cId =
      typeof detailRecord.customerId === 'object' && detailRecord.customerId !== null
        ? detailRecord.customerId._id
        : String(detailRecord.customerId || '');
    if (!cId) return null;

    const customerRecords = records
      .filter((r) => {
        const itemCId =
          typeof r.customerId === 'object' && r.customerId !== null
            ? r.customerId._id
            : String(r.customerId || '');
        return itemCId === cId;
      })
      .sort(
        (a, b) =>
          new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
      );

    const currentIndex = customerRecords.findIndex((r) => r._id === detailRecord._id);
    if (currentIndex >= 0 && currentIndex + 1 < customerRecords.length) {
      return customerRecords[currentIndex + 1];
    }
    return null;
  }, [detailRecord, records]);

  // Find all records for the active customer in detail modal
  const historyRecordsForDetail = useMemo(() => {
    if (!detailRecord) return [];
    const cId =
      typeof detailRecord.customerId === 'object' && detailRecord.customerId !== null
        ? detailRecord.customerId._id
        : String(detailRecord.customerId || '');
    if (!cId) return [];
    return records.filter((r) => {
      const itemCId =
        typeof r.customerId === 'object' && r.customerId !== null
          ? r.customerId._id
          : String(r.customerId || '');
      return itemCId === cId;
    });
  }, [detailRecord, records]);

  // Overall comparison banner when single customer is selected
  const singleCustomerComparison = useMemo(() => {
    if (!selectedCustomerId || records.length < 2) return null;
    const sorted = [...records].sort(
      (a, b) =>
        new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
    const latest = sorted[0];
    const previous = sorted[1];
    return {
      ...analyzeInBody(latest, previous),
      latest,
      previous,
    };
  }, [selectedCustomerId, records]);

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      setDeletingLoading(true);
      await inbodyService.deleteRecord(deletingRecord._id);
      setRecords((prev) => prev.filter((r) => r._id !== deletingRecord._id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setDeletingRecord(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa phiếu.';
      showError(msg);
    } finally {
      setDeletingLoading(false);
    }
  };

  // Handle Saved (Created or Updated)
  const handleRecordSaved = () => {
    void loadRecords(1);
  };

  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => c._id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Bar Header */}
      <View style={styles.topHeader}>
        <View style={styles.titleRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.screenTitle}>Theo Dõi InBody</Text>
            <Text style={styles.screenSubtitle}>
              {totalCount} phiếu đo đã ghi nhận
            </Text>
          </View>

          <Pressable
            hitSlop={10}
            onPress={() => void loadRecords(1, true)}
            style={styles.refreshIconBtn}
            accessibilityLabel="Tải lại danh sách"
          >
            <Ionicons name="reload-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* 2 Equal-Width Quick Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            style={[styles.headerBtn, styles.headerBtnSecondary]}
            onPress={() => {
              setEditingRecord(null);
              setOpenManualModal(true);
            }}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.headerBtnTextSecondary}>Nhập tay</Text>
          </Pressable>

          <Pressable
            style={[styles.headerBtn, styles.headerBtnPrimary]}
            onPress={() => setOpenOcrModal(true)}
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnTextPrimary}>Quét phiếu AI</Text>
          </Pressable>
        </View>
      </View>

      {/* Filters Bar */}
      <View style={styles.filtersCard}>
        {/* Customer Select Filter */}
        <Pressable
          style={styles.customerFilterBtn}
          onPress={() => setShowCustomerPicker(true)}
        >
          <View style={styles.filterBtnLeft}>
            <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.filterBtnText} numberOfLines={1}>
              {selectedCustomerObj
                ? selectedCustomerObj.fullName
                : 'Tất cả học viên'}
            </Text>
          </View>
          {selectedCustomerId ? (
            <Pressable
              hitSlop={8}
              onPress={() => setSelectedCustomerId('')}
            >
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          )}
        </Pressable>

        {/* Status Horizontal Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusTabsScroll}
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.statusTabPill, active && styles.statusTabPillActive]}
                onPress={() => setStatusFilter(tab.id)}
              >
                <Text
                  style={[
                    styles.statusTabText,
                    active && styles.statusTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List / Content */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải phiếu InBody...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={({ item }) => (
            <InBodyCard
              record={item}
              onPress={setDetailRecord}
              onEdit={(rec) => {
                setEditingRecord(rec);
                setOpenManualModal(true);
              }}
              onDelete={setDeletingRecord}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            selectedCustomerId && records.length > 0 ? (
              <View style={styles.headerSectionGroup}>
                {singleCustomerComparison?.comparison && (
                  <InBodySummaryBanner
                    comparison={singleCustomerComparison.comparison}
                    customerName={selectedCustomerObj?.fullName}
                    totalRecordsCount={records.length}
                  />
                )}
                {records.length >= 2 && (
                  <InBodyEvolutionChart records={records} />
                )}
              </View>
            ) : null
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalItems={totalCount}
                loading={loading}
                onPageChange={(newPage) => void loadRecords(newPage)}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="fitness-outline" size={42} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {selectedCustomerId ? 'Học viên chưa có phiếu InBody nào' : 'Chưa có phiếu InBody nào'}
              </Text>
              <Text style={styles.emptySub}>
                {selectedCustomerId
                  ? 'Hãy tạo phiếu mới hoặc quét phiếu InBody bằng AI cho học viên này.'
                  : 'Bắt đầu theo dõi thể trạng học viên bằng cách quét phiếu InBody với AI hoặc nhập tay.'}
              </Text>

              <View style={styles.emptyActionRow}>
                <Pressable
                  style={styles.emptyScanBtn}
                  onPress={() => setOpenOcrModal(true)}
                >
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyScanBtnText}>Quét với AI</Text>
                </Pressable>

                <Pressable
                  style={styles.emptyManualBtn}
                  onPress={() => {
                    setEditingRecord(null);
                    setOpenManualModal(true);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primaryNavy} />
                  <Text style={styles.emptyManualBtnText}>Nhập tay</Text>
                </Pressable>
              </View>
            </View>
          }
        />
      )}

      {/* Detail Bottom Sheet Modal */}
      <InBodyDetailSheet
        visible={!!detailRecord}
        record={detailRecord}
        previousRecord={previousRecordForDetail}
        historyRecords={historyRecordsForDetail}
        onClose={() => setDetailRecord(null)}
        onEdit={(rec) => {
          setDetailRecord(null);
          setEditingRecord(rec);
          setOpenManualModal(true);
        }}
        onDelete={(rec) => {
          setDetailRecord(null);
          setDeletingRecord(rec);
        }}
        onStatusChanged={(updated: InBodyRecordData) => {
          setDetailRecord(updated);
          setRecords((prev) =>
            prev.map((r) => (r._id === updated._id ? updated : r))
          );
        }}
      />

      {/* Manual Entry / Edit Form Modal */}
      <InBodyManualForm
        visible={openManualModal}
        editingRecord={editingRecord}
        defaultCustomerId={selectedCustomerId}
        customers={customers}
        onClose={() => {
          setOpenManualModal(false);
          setEditingRecord(null);
        }}
        onSaved={handleRecordSaved}
        onCustomerCreated={(newCustomer) => {
          setCustomers((prev) => [newCustomer, ...prev]);
        }}
      />

      {/* AI OCR Scanner Flow Modal */}
      <InBodyOcrFlow
        visible={openOcrModal}
        customers={customers}
        defaultCustomerId={selectedCustomerId}
        onClose={() => setOpenOcrModal(false)}
        onConfirmed={handleRecordSaved}
        onCustomerCreated={(newCustomer) => {
          setCustomers((prev) => [newCustomer, ...prev]);
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        visible={!!deletingRecord}
        title="Xóa phiếu InBody"
        message={`Bạn có chắc muốn xóa phiếu InBody ngày ${formatDateDisplay(
          deletingRecord?.measurementDate
        )} không? Hành động này không thể hoàn tác.`}
        loading={deletingLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingRecord(null)}
      />

      {/* Reusable Customer Filter Modal */}
      <CustomerSelectModal
        visible={showCustomerPicker}
        customers={customers}
        selectedId={selectedCustomerId}
        title="Lọc theo học viên"
        allowClear
        clearLabel="Tất cả học viên"
        onClose={() => setShowCustomerPicker(false)}
        onSelect={(id) => setSelectedCustomerId(id)}
      />

      <AppAlertModal {...alertConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flex: 1,
  },
  screenTitle: {
    fontWeight: '800',
    fontSize: 18,
    color: colors.primaryNavy,
  },
  screenSubtitle: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  headerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  headerBtnPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  headerBtnSecondary: {
    backgroundColor: colors.surfaceIce,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  headerBtnTextPrimary: {
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
  headerBtnTextSecondary: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.primary,
  },
  filtersCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  customerFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  filterBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterBtnText: {
    fontWeight: '500',
    fontSize: 12.5,
    color: colors.text,
  },
  statusTabsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  statusTabPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  statusTabPillActive: {
    backgroundColor: colors.primaryNavy,
  },
  statusTabText: {
    fontWeight: '500',
    fontSize: 12,
    color: colors.textMuted,
  },
  statusTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
  },
  headerSectionGroup: {
    gap: 12,
    marginBottom: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceIce,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.primaryNavy,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyScanBtnText: {
    fontWeight: '700',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  emptyManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceIce,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.md,
  },
  emptyManualBtnText: {
    fontWeight: '600',
    fontSize: 13.5,
    color: colors.primary,
  },
});
