import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { api } from '@/services/api/client';
import { resolveImageUrl } from '@/services/imageUtils';
import { colors } from '@/theme';

interface AdminSectionItem {
  key: string;
  title: string;
  desc: string;
  iconName: keyof typeof Ionicons.glyphMap;
  badge?: string;
  superOnly?: boolean;
}

const SECTION_CATEGORIES: { title: string; items: AdminSectionItem[] }[] = [
  {
    title: 'NHÂN SỰ & HỘI VIÊN',
    items: [
      {
        key: 'pts',
        title: 'Huấn luyện viên',
        desc: 'Quản lý HLV, hồ sơ chuyên môn',
        iconName: 'people-outline',
      },
      {
        key: 'customers',
        title: 'Khách hàng',
        desc: 'Danh sách và thông tin học viên',
        iconName: 'person-add-outline',
      },
      {
        key: 'transfers',
        title: 'Lịch sử chuyển giao',
        desc: 'Hồ sơ chuyển giao giữa các HLV',
        iconName: 'swap-horizontal-outline',
      },
      {
        key: 'batchTransfers',
        title: 'Chuyển giao hàng loạt',
        desc: 'Điều chuyển học viên số lượng lớn',
        iconName: 'git-branch-outline',
      },
      {
        key: 'accounts',
        title: 'Tài khoản Quản trị',
        desc: 'Phân quyền tài khoản quản trị viên',
        iconName: 'shield-checkmark-outline',
        superOnly: true,
      },
    ],
  },
  {
    title: 'GÓI TẬP & KHO TRI THỨC',
    items: [
      {
        key: 'packages',
        title: 'Gói tập mẫu',
        desc: 'Thiết lập số buổi, thời hạn, giá',
        iconName: 'barbell-outline',
      },
      {
        key: 'knowledge',
        title: 'Tri thức AI',
        desc: 'Bài viết và tài liệu huấn luyện AI',
        iconName: 'book-outline',
      },
      {
        key: 'images',
        title: 'Kho ảnh món ăn',
        desc: 'Thư viện hình ảnh thực đơn dinh dưỡng',
        iconName: 'images-outline',
      },
      {
        key: 'features',
        title: 'Tính năng hệ thống',
        desc: 'Bật/tắt các module tính năng',
        iconName: 'toggle-outline',
      },
    ],
  },
  {
    title: 'TÀI CHÍNH & TÍN DỤNG AI',
    items: [
      {
        key: 'creditPackages',
        title: 'Gói nạp Credit',
        desc: 'Bảng giá và các gói nạp điểm AI',
        iconName: 'card-outline',
      },
      {
        key: 'credits',
        title: 'Điều chỉnh Credit',
        desc: 'Cộng/trừ credit thủ công cho tài khoản',
        iconName: 'wallet-outline',
      },
      {
        key: 'pricing',
        title: 'Bảng giá tác vụ AI',
        desc: 'Cấu hình chi phí xử lý từng tác vụ',
        iconName: 'pricetags-outline',
      },
      {
        key: 'orders',
        title: 'Đơn thanh toán',
        desc: 'Lịch sử nạp credit qua cổng thanh toán',
        iconName: 'receipt-outline',
      },
      {
        key: 'ledger',
        title: 'Sổ cái giao dịch',
        desc: 'Biến động số dư credit toàn hệ thống',
        iconName: 'file-tray-full-outline',
      },
      {
        key: 'usage',
        title: 'Nhật ký dùng AI',
        desc: 'Thống kê lưu lượng và chi phí AI',
        iconName: 'stats-chart-outline',
      },
      {
        key: 'shortfalls',
        title: 'Cảnh báo thiếu hụt',
        desc: 'Các tác vụ bị thiếu credit giữ chỗ',
        iconName: 'alert-circle-outline',
      },
    ],
  },
];

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const [avatarErrorUrl, setAvatarErrorUrl] = useState<string | null>(null);
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const activeTab = tab === 'modules' ? 'modules' : 'dashboard';
  const setActiveTab = (value: 'dashboard' | 'modules') => router.setParams({ tab: value });
  const [searchQuery, setSearchQuery] = useState('');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const userName = session?.user?.fullName || session?.user?.username || 'Admin 3S';
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  const fetchCreditBalance = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/credits/me');
      const payload = res?.data || res;
      if (payload && typeof payload.availableCredits === 'number') {
        setCreditBalance(payload.availableCredits);
      }
    } catch {
      // Bỏ qua lỗi ngầm nếu chưa có quyền
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchCreditBalance();
    }, [fetchCreditBalance])
  );

  const navigateToSection = (section: string) => {
    router.push({ pathname: '/(app)/admin/[section]', params: { section } });
  };

  // Danh sách phân hệ lọc theo quyền và từ khóa tìm kiếm
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SECTION_CATEGORIES.map((cat) => {
      const filteredItems = cat.items.filter((item) => {
        if (item.superOnly && !isSuperAdmin) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.key.toLowerCase().includes(q)
        );
      });
      return { ...cat, items: filteredItems };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery, isSuperAdmin]);

  const totalSections = useMemo(() => {
    return SECTION_CATEGORIES.reduce((acc, cat) => {
      return acc + cat.items.filter((i) => !i.superOnly || isSuperAdmin).length;
    }, 0);
  }, [isSuperAdmin]);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP HEADER HIỆN ĐẠI */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.roleTag}>
            <Ionicons
              name={isSuperAdmin ? 'shield-checkmark' : 'shield'}
              size={12}
              color={colors.primary}
            />
            <Text style={styles.roleTagText}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'QUẢN TRỊ VIÊN'}
            </Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          {/* Nút Số dư Credit AI */}
          <Pressable
            onPress={() => router.push('/(app)/wallet')}
            style={({ pressed }) => [
              styles.headerCreditBadge,
              pressed && styles.headerBadgePressed,
            ]}
            hitSlop={8}
            accessibilityLabel="Số dư Credit AI"
          >
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={styles.headerCreditValue}>
              {creditBalance !== null ? creditBalance.toLocaleString('vi-VN') : '---'}
            </Text>
          </Pressable>

          {/* Nút Chuyển sang Không gian Huấn luyện */}
          <Pressable
            onPress={() => router.push('/(app)/(tabs)')}
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]}
            hitSlop={8}
            accessibilityLabel="Không gian huấn luyện"
          >
            <Ionicons name="fitness-outline" size={19} color={colors.primary} />
          </Pressable>

          {/* Avatar Profile */}
          <Pressable
            onPress={() => router.push('/(app)/profile')}
            style={({ pressed }) => [
              styles.avatarWrap,
              pressed && styles.avatarPressed,
            ]}
            hitSlop={8}
            accessibilityLabel="Hồ sơ quản trị"
          >
            {session?.user?.avatarUrl && session.user.avatarUrl !== avatarErrorUrl ? (
              <Image
                source={{ uri: resolveImageUrl(session.user.avatarUrl) || '' }}
                style={styles.avatarImg}
                onError={() => setAvatarErrorUrl(session.user?.avatarUrl || '')}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(userName || 'AD').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.onlineBadge} />
          </Pressable>
        </View>
      </View>

      {/* 2. CHỌN CHẾ ĐỘ XEM: DASHBOARD TỔNG QUAN / TẤT CẢ PHÂN HỆ */}
      <View style={styles.segmentedControl}>
        <Pressable
          onPress={() => setActiveTab('dashboard')}
          style={[
            styles.segmentBtn,
            activeTab === 'dashboard' && styles.segmentBtnActive,
          ]}
        >
          <Ionicons
            name={activeTab === 'dashboard' ? 'grid' : 'grid-outline'}
            size={16}
            color={activeTab === 'dashboard' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === 'dashboard' && styles.segmentTextActive,
            ]}
          >
            Dashboard Thống kê
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('modules')}
          style={[
            styles.segmentBtn,
            activeTab === 'modules' && styles.segmentBtnActive,
          ]}
        >
          <Ionicons
            name={activeTab === 'modules' ? 'layers' : 'layers-outline'}
            size={16}
            color={activeTab === 'modules' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === 'modules' && styles.segmentTextActive,
            ]}
          >
            Phân hệ Quản trị ({totalSections})
          </Text>
        </Pressable>
      </View>

      {/* 3. NỘI DUNG CHÍNH */}
      {activeTab === 'dashboard' ? (
        <View style={styles.viewContent}>
          <AdminDashboardView
            key={refreshKey}
            onRefreshParent={() => {
              void fetchCreditBalance();
              setRefreshKey((k) => k + 1);
            }}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.modulesScroll}
          contentContainerStyle={[
            styles.modulesScrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Thanh tìm kiếm nhanh chức năng */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search-outline" size={17} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm kiếm phân hệ, HLV, gói tập, credit..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                style={styles.clearSearchBtn}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Quick Actions Banners */}
          <View style={styles.quickAccessRow}>
            <Pressable
              onPress={() => router.push('/(app)/(tabs)')}
              style={({ pressed }) => [
                styles.quickAccessCard,
                pressed && styles.quickAccessCardPressed,
              ]}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#F0F9FF' }]}>
                <Ionicons name="fitness" size={20} color={colors.primary} />
              </View>
              <View style={styles.quickAccessMeta}>
                <Text style={styles.quickAccessTitle}>K/gian Huấn luyện</Text>
                <Text style={styles.quickAccessSub}>Lịch & giáo án HLV</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(app)/wallet')}
              style={({ pressed }) => [
                styles.quickAccessCard,
                pressed && styles.quickAccessCardPressed,
              ]}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="wallet" size={20} color="#16A34A" />
              </View>
              <View style={styles.quickAccessMeta}>
                <Text style={styles.quickAccessTitle}>Ví Credit AI</Text>
                <Text style={styles.quickAccessSub}>Số dư & giao dịch</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Danh mục phân hệ quản trị */}
          {filteredCategories.length === 0 ? (
            <View style={styles.emptyModulesWrap}>
              <Ionicons name="search" size={32} color={colors.textMuted} />
              <Text style={styles.emptyModulesText}>
                {`Không tìm thấy phân hệ khớp với "${searchQuery}"`}
              </Text>
            </View>
          ) : (
            filteredCategories.map((category) => (
              <View key={category.title} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryCount}>
                    {category.items.length} mục
                  </Text>
                </View>

                <View style={styles.categoryCard}>
                  {category.items.map((item, index) => {
                    const isLast = index === category.items.length - 1;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => navigateToSection(item.key)}
                        style={({ pressed }) => [
                          styles.moduleRow,
                          pressed && styles.moduleRowPressed,
                          !isLast && styles.moduleRowBorder,
                        ]}
                      >
                        <View style={styles.moduleIconBox}>
                          <Ionicons
                            name={item.iconName}
                            size={20}
                            color={colors.primary}
                          />
                        </View>

                        <View style={styles.moduleInfo}>
                          <View style={styles.moduleTitleRow}>
                            <Text style={styles.moduleTitle}>{item.title}</Text>
                            {item.superOnly && (
                              <View style={styles.superBadge}>
                                <Text style={styles.superBadgeText}>SUPER</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.moduleDesc} numberOfLines={1}>
                            {item.desc}
                          </Text>
                        </View>

                        <Feather
                          name="chevron-right"
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {/* Nút Đăng xuất an toàn */}
          <View style={styles.footerSection}>
            <Pressable
              onPress={() => setShowLogoutModal(true)}
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && styles.logoutBtnPressed,
              ]}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutBtnText}>Đăng xuất quản trị</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.modalMessage}>
              Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc quản trị?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowLogoutModal(false)}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowLogoutModal(false);
                  void signOut();
                }}
                style={({ pressed }) => [
                  styles.modalConfirmBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.modalConfirmText}>Đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  /* Top Header */
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  roleTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCreditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 18,
    paddingHorizontal: 10,
    height: 36,
  },
  headerBadgePressed: {
    opacity: 0.7,
  },
  headerCreditValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnPressed: {
    backgroundColor: '#E0F2FE',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.8,
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  /* Segmented Navigation */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  segmentBtnActive: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* Dashboard View Container */
  viewContent: {
    flex: 1,
  },

  /* Modules Scroll */
  modulesScroll: {
    flex: 1,
  },
  modulesScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },

  /* Search Bar */
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },

  /* Quick Access Row */
  quickAccessRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAccessCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  quickAccessCardPressed: {
    backgroundColor: '#F8FAFC',
  },
  quickAccessIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessMeta: {
    flex: 1,
  },
  quickAccessTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickAccessSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* Category Sections */
  categorySection: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  categoryCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 56,
  },
  moduleRowPressed: {
    backgroundColor: '#F0F9FF',
  },
  moduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  moduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  superBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  superBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
  },
  moduleDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  emptyModulesWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyModulesText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },

  /* Footer Actions */
  footerSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutBtnPressed: {
    backgroundColor: '#FEE2E2',
  },
  logoutBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EF4444',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
