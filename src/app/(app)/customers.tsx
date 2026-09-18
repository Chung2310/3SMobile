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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { canAccessAdmin } from '@/services/adminAccess';

import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { CustomerDetailModal } from '@/components/CustomerDetailModal';
import { CustomerGoalsModal } from '@/components/CustomerGoalsModal';
import { PtPackageModal } from '@/components/PtPackageModal';
import { PaginationBar } from '@/components/PaginationBar';
import { SectionHeader } from '@/components/UI';
import { AppBottomBar } from '@/components/navigation/AppBottomBar';
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
import { fetchAllGoals, fetchCustomerGoals, type GoalItem } from '@/services/goalService';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile, PtCustomerSummary } from '@/types/domain';

const MASCOT_SEARCH = require('../../../assets/public/3s-search.png');

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [customers, setCustomers] = useState<PtCustomerSummary[]>([]);
  const [profileCustomers, setProfileCustomers] = useState<CustomerProfile[]>([]);
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

  // Goal Modal
  const [goalCustomer, setGoalCustomer] = useState<{ id: string; fullName: string; phone?: string } | null>(null);

  // Delete Modal
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bản đồ mục tiêu mới nhất theo từng khách hàng
  const [customerGoalsMap, setCustomerGoalsMap] = useState<Record<string, GoalItem>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [dashData, listData, goalsData] = await Promise.all([
        fetchPtDashboard().catch(() => null),
        fetchCustomersList().catch(() => []),
        fetchAllGoals(100).catch(() => []),
      ]);

      if (dashData?.customers?.length) {
        // Chỉ lấy thông tin dashboard của khách hàng thật, không lấy mock data id bắt đầu bằng cust-
        setCustomers(dashData.customers.filter((c) => !c.customerId.startsWith('cust-')));
      } else {
        setCustomers([]);
      }
      setProfileCustomers(listData || []);

      // 1. Lập bản đồ mục tiêu từ fetchAllGoals
      const gMap: Record<string, GoalItem> = {};
      if (Array.isArray(goalsData)) {
        for (const g of goalsData) {
          const cId =
            typeof g.customerId === 'object' && g.customerId !== null
              ? (g.customerId as any)._id || (g.customerId as any).id
              : String(g.customerId);
          if (cId && !gMap[cId]) {
            gMap[cId] = g;
          }
        }
      }

      // 2. Gọi trực tiếp fetchCustomerGoals cho từng khách hàng để đảm bảo đầy đủ
      if (listData && listData.length > 0) {
        const goalFetches = listData.map(async (p) => {
          if (!gMap[p._id]) {
            const customerGoals = await fetchCustomerGoals(p._id).catch(() => []);
            if (customerGoals && customerGoals.length > 0) {
              gMap[p._id] = customerGoals[0];
            }
          }
        });
        await Promise.all(goalFetches);
      }

      setCustomerGoalsMap({ ...gMap });
    } finally {
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

  // Hiển thị danh sách khách hàng thực tế kèm mục tiêu thật từ /api/goals
  const allList: CustomerListItem[] = useMemo(() => {
    return profileCustomers.map((p) => {
      const dash = customers.find((c) => c.customerId === p._id);
      const latestGoal = customerGoalsMap[p._id];

      let displayGoal = '';
      if (latestGoal?.title) {
        if (latestGoal.targetValue != null) {
          displayGoal = `${latestGoal.title} (${latestGoal.targetValue} ${latestGoal.targetUnit || ''})`.trim();
        } else {
          displayGoal = latestGoal.title;
        }
      } else if (p.initialGoal) {
        displayGoal = p.initialGoal;
      }

      return {
        id: p._id,
        fullName: p.fullName,
        phone: p.phone || dash?.phone || '',
        email: p.email || '',
        initialGoal: displayGoal,
        score: dash?.score ?? null,
        measurementCount: dash?.measurementCount ?? 0,
        progressCategory: dash?.progressCategory ?? 'GOOD',
        status: (p.status || 'ACTIVE') as any,
        rawProfile: p,
      };
    });
  }, [profileCustomers, customers, customerGoalsMap]);

  const filtered = useMemo(() => {
    return allList.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.initialGoal && c.initialGoal.toLowerCase().includes(q))
      );
    });
  }, [allList, statusFilter, search]);

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedCustomers = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') {
      router.replace('/(app)/admin');
    } else {
      router.navigate('/(app)/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP BAR */}
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
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

        {canAccessAdmin(session?.user) && (
          <Pressable
            onPress={() => router.push({ pathname: '/(app)/admin/[section]', params: { section: 'customers' } })}
            style={({ pressed }) => [styles.adminHeaderBtn, pressed && styles.addHeaderBtnPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Quản lý khách hàng toàn hệ thống"
          >
            <Ionicons name="shield-checkmark" size={17} color="#0284C7" />
          </Pressable>
        )}

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
          { paddingBottom: 24 },
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
          <Feather name="search" size={18} color={colors.primary} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên, số điện thoại, mục tiêu..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          {search ? (
            <Feather
              name="x"
              size={18}
              color={colors.textMuted}
              onPress={() => {
                setSearch('');
                setCurrentPage(1);
              }}
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
              color={statusFilter !== 'ALL' ? colors.primary : '#4B5563'}
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
              color={statusFilter !== 'ALL' ? colors.primary : '#9CA3AF'}
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
                onGoals={(cust) =>
                  setGoalCustomer({
                    id: cust.id,
                    fullName: cust.fullName,
                    phone: cust.phone,
                  })
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

      {/* 4. Customer Goals Modal */}
      <CustomerGoalsModal
        visible={Boolean(goalCustomer)}
        customer={goalCustomer}
        onClose={() => {
          setGoalCustomer(null);
          void loadData();
        }}
      />

      {/* 5. Confirm Delete Modal */}
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

      {/* 6. Status Filter Bottom Sheet */}
      <CustomerStatusFilterSheet
        visible={showStatusSheet}
        statusFilter={statusFilter}
        totalCount={allList.length}
        activeCount={activeCount}
        leadCount={leadCount}
        inactiveCount={inactiveCount}
        onSelect={(st) => {
          setStatusFilter(st);
          setCurrentPage(1);
        }}
        onClose={() => setShowStatusSheet(false)}
      />

      {/* FOOTER TAB BAR */}
      <AppBottomBar />
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 1,
  },
  adminHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addHeaderBtnPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
  toastWrap: {
    position: 'absolute',
    top: 70,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.text,
    padding: 0,
  },
  filterTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
    marginTop: 4,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTriggerBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  filterTriggerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterTriggerTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
    paddingHorizontal: 24,
  },
});
