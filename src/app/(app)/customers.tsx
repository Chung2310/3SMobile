import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { CustomerDetailModal } from '@/components/CustomerDetailModal';
import { PtPackageModal } from '@/components/PtPackageModal';
import { PaginationBar } from '@/components/PaginationBar';
import { SectionHeader } from '@/components/UI';
import {
  CustomerCard,
  CustomerFormModal,
  CustomerListItem,
  CustomerStatusFilter,
  CustomerStatusFilterSheet,
  getStatusFilterLabel,
} from '@/components/customers/index';
import { deleteCustomer, fetchCustomersList } from '@/services/customerService';
import { fetchPtDashboard } from '@/services/dashboardService';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile, PtCustomerSummary } from '@/types/domain';

const MASCOT_SEARCH = require('../../../assets/public/3s-search.png');

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();

  const [customers, setCustomers] = useState<PtCustomerSummary[]>([]);
  const [profileCustomers, setProfileCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>('ALL');
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detail Modal
  const [detailCustomer, setDetailCustomer] = useState<CustomerListItem | null>(null);

  // PT Package Modal
  const [packageCustomer, setPackageCustomer] = useState<{ id: string; fullName: string } | null>(null);

  // Delete Modal
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [dashData, listData] = await Promise.all([
        fetchPtDashboard().catch(() => null),
        fetchCustomersList().catch(() => []),
      ]);

      if (dashData?.customers?.length) {
        setCustomers(dashData.customers);
      }
      setProfileCustomers(listData || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // Combine profile and dashboard metrics
  const allList: CustomerListItem[] = profileCustomers.length
    ? profileCustomers.map((p) => {
        const dash = customers.find((c) => c.customerId === p._id);
        return {
          id: p._id,
          fullName: p.fullName,
          phone: p.phone || dash?.phone || '',
          email: p.email || '',
          initialGoal: p.initialGoal || dash?.initialGoal || '',
          score: dash?.score ?? null,
          measurementCount: dash?.measurementCount ?? 0,
          progressCategory: dash?.progressCategory ?? 'GOOD',
          status: (p.status || 'ACTIVE') as any,
          rawProfile: p,
        };
      })
    : customers.map((c) => ({
        id: c.customerId,
        fullName: c.fullName,
        phone: c.phone || '',
        email: '',
        initialGoal: c.initialGoal || '',
        score: c.score ?? null,
        measurementCount: c.measurementCount,
        progressCategory: c.progressCategory,
        status: 'ACTIVE' as const,
        rawProfile: null,
      }));

  const filtered = allList.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.initialGoal && c.initialGoal.toLowerCase().includes(q))
    );
  });

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedCustomers = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const activeCount = allList.filter((c) => c.status === 'ACTIVE').length;
  const leadCount = allList.filter((c) => c.status === 'LEAD').length;
  const inactiveCount = allList.filter((c) => c.status === 'INACTIVE').length;

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setShowAddModal(true);
  };

  const handleEdit = (item: CustomerListItem) => {
    setEditingCustomer(item);
    setShowAddModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    try {
      setDeleteLoading(true);
      await deleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
      showToast('Đã xóa khách hàng thành công!');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Không thể xóa khách hàng. Vui lòng thử lại.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP BAR */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.navigate('/(app)/(tabs)')}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityLabel="Quay lại"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Khách hàng của tôi</Text>
          <Text style={styles.pageSubtitle}>
            {allList.length} khách hàng đang quản lý
          </Text>
        </View>

        <Pressable
          onPress={handleOpenAdd}
          style={({ pressed }) => [styles.addHeaderBtn, pressed && styles.addHeaderBtnPressed]}
          hitSlop={8}
          accessibilityLabel="Thêm khách hàng"
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Toast Notification */}
      {toastMessage ? (
        <View style={styles.toastWrap}>
          <Feather name="check-circle" size={16} color="#22C55E" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* 2. SEARCH BOX */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#00C2FF" style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm theo tên, số điện thoại, mục tiêu..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          {search ? (
            <Feather
              name="x"
              size={18}
              color={colors.textMuted}
              onPress={() => setSearch('')}
            />
          ) : null}
        </View>

        {/* 3. FILTER TRIGGER BUTTON */}
        <View style={styles.filterTriggerRow}>
          <Pressable
            style={({ pressed }) => [
              styles.filterTriggerBtn,
              statusFilter !== 'ALL' && styles.filterTriggerBtnActive,
              pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => setShowStatusSheet(true)}
            hitSlop={6}
          >
            <Feather
              name="filter"
              size={14}
              color={statusFilter !== 'ALL' ? '#0098CC' : '#4B5563'}
            />
            <Text
              style={[
                styles.filterTriggerText,
                statusFilter !== 'ALL' && styles.filterTriggerTextActive,
              ]}
            >
              {getStatusFilterLabel(statusFilter)} ({filtered.length})
            </Text>
            <Feather
              name="chevron-down"
              size={14}
              color={statusFilter !== 'ALL' ? '#0098CC' : '#9CA3AF'}
            />
          </Pressable>
        </View>

        <SectionHeader title={`Danh sách (${filtered.length})`} />

        {/* 4. CUSTOMER CARDS LIST */}
        {filtered.length ? (
          <>
            {paginatedCustomers.map((item) => (
              <CustomerCard
                key={item.id}
                item={item}
                onPress={(cust) => setDetailCustomer(cust)}
                onManagePackages={(cust) =>
                  setPackageCustomer({ id: cust.id, fullName: cust.fullName })
                }
                onEdit={handleEdit}
                onDelete={(cust) => setDeletingCustomer(cust)}
              />
            ))}

            {totalPages > 1 && (
              <PaginationBar
                page={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPageChange={(p) => setCurrentPage(p)}
              />
            )}
          </>
        ) : (
          <View style={styles.emptySearchWrap}>
            <Image
              source={MASCOT_SEARCH}
              style={styles.emptySearchImg}
              resizeMode="contain"
            />
            <Text style={styles.emptySearchText}>
              Không tìm thấy khách hàng mà bạn cần tìm
            </Text>
          </View>
        )}
      </ScrollView>

      {/* MODALS */}
      {/* 1. Form Add / Edit */}
      <CustomerFormModal
        visible={showAddModal}
        editingCustomer={editingCustomer}
        profileCustomers={profileCustomers}
        onClose={() => {
          setShowAddModal(false);
          setEditingCustomer(null);
        }}
        onSuccess={(msg) => {
          showToast(msg);
          void loadData();
        }}
      />

      {/* 2. Customer Detail Modal */}
      <CustomerDetailModal
        visible={Boolean(detailCustomer)}
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
        onEdit={() => {
          if (detailCustomer) handleEdit(detailCustomer);
        }}
        onManagePackages={() => {
          if (detailCustomer) {
            setPackageCustomer({ id: detailCustomer.id, fullName: detailCustomer.fullName });
          }
        }}
      />

      {/* 3. PT Package Modal */}
      <PtPackageModal
        visible={Boolean(packageCustomer)}
        customer={packageCustomer}
        onClose={() => setPackageCustomer(null)}
      />

      {/* 4. Confirm Delete Modal */}
      <ConfirmDeleteModal
        visible={Boolean(deletingCustomer)}
        title="Xóa khách hàng?"
        message={`Bạn có chắc chắn muốn xóa khách hàng "${deletingCustomer?.fullName}"? Toàn bộ dữ liệu hồ sơ sẽ bị xóa vĩnh viễn và không thể khôi phục.`}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCustomer(null)}
      />

      {/* 5. Status Filter Bottom Sheet */}
      <CustomerStatusFilterSheet
        visible={showStatusSheet}
        statusFilter={statusFilter}
        totalCount={allList.length}
        activeCount={activeCount}
        leadCount={leadCount}
        inactiveCount={inactiveCount}
        onSelect={(st) => setStatusFilter(st)}
        onClose={() => setShowStatusSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: '#E5E7EB',
  },
  titleWrap: {
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  addHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00C2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C2FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  addHeaderBtnPressed: {
    backgroundColor: '#0098CC',
    transform: [{ scale: 0.92 }],
  },
  toastWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 8,
  },
  toastText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  filterTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTriggerBtnActive: {
    backgroundColor: '#E0F7FE',
    borderColor: '#BAE6FD',
  },
  filterTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterTriggerTextActive: {
    color: '#0098CC',
    fontWeight: '700',
  },
  emptySearchWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptySearchImg: {
    width: 140,
    height: 140,
  },
  emptySearchText: {
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
});
