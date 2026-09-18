import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
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
import { router, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InBodyOcrFlow } from '@/components/inbody/InBodyOcrFlow';
import { ProgressPieChart } from '@/components/ProgressPieChart';
import { TopPerformersPodium } from '@/components/TopPerformersPodium';
import { Card } from '@/components/UI';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { canAccessAdmin } from '@/services/adminAccess';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { fetchCustomersList } from '@/services/customerService';
import { fetchPtDashboard } from '@/services/dashboardService';
import { resolveImageUrl } from '@/services/imageUtils';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile, ProgressCategory, PtCustomerSummary, PtDashboardData } from '@/types/domain';
import type { InBodyRecordData } from '@/types/inbody';

type FilterType = 'ALL' | ProgressCategory;

const MASCOT_HAPPY = require('../../../../assets/public/3s-happy.png');

interface QuickFeature {
  id: string;
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  route: string;
}

const QUICK_FEATURES: QuickFeature[] = [
  {
    id: 'customers',
    title: 'Khách hàng',
    iconName: 'people-outline',
    route: '/(app)/customers',
  },
  {
    id: 'schedule',
    title: 'Lịch tập',
    iconName: 'calendar-outline',
    route: '/(app)/(tabs)/schedule',
  },
  {
    id: 'workouts',
    title: 'Giáo án',
    iconName: 'fitness-outline',
    route: '/(app)/(tabs)/workouts',
  },
  {
    id: 'progress',
    title: 'Ghi tiến độ',
    iconName: 'stats-chart-outline',
    route: '/(app)/progress-workspace',
  },
  {
    id: 'exercises',
    title: 'Bài tập',
    iconName: 'barbell-outline',
    route: '/(app)/exercises',
  },
  {
    id: 'nutrition',
    title: 'Dinh dưỡng',
    iconName: 'restaurant-outline',
    route: '/(app)/(tabs)/nutrition',
  },
  {
    id: 'assistant',
    title: 'Trợ lý AI',
    iconName: 'sparkles-outline',
    route: '/(app)/(tabs)/assistant',
  },
  {
    id: 'wallet',
    title: 'Ví Credit',
    iconName: 'wallet-outline',
    route: '/(app)/wallet',
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [avatarErrorUrl, setAvatarErrorUrl] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [dashboard, setDashboard] = useState<PtDashboardData | null>(null);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [, setProgressSectionY] = useState(0);

  // Thanh tìm kiếm học viên ở Dashboard
  const [searchQuery, setSearchQuery] = useState('');

  // Quét nhanh phiếu InBody AI
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrCustomer, setOcrCustomer] = useState<PtCustomerSummary | null>(null);
  const [ocrSessionKey, setOcrSessionKey] = useState(0);
  const [customersList, setCustomersList] = useState<CustomerProfile[]>([]);

  useEffect(() => {
    void fetchCustomersList({ limit: 100 })
      .then((list) => {
        if (Array.isArray(list)) setCustomersList(list);
      })
      .catch(() => {});
  }, []);

  const ocrCustomers = useMemo(() => {
    const list = [...customersList];
    if (ocrCustomer && !list.some((item) => item._id === ocrCustomer.customerId)) {
      list.unshift({
        _id: ocrCustomer.customerId,
        fullName: ocrCustomer.fullName,
        phone: ocrCustomer.phone || '',
        status: 'ACTIVE',
      });
    }
    return list;
  }, [customersList, ocrCustomer]);

  const handleOpenQuickOcr = (customer: PtCustomerSummary) => {
    setOcrCustomer(customer);
    setOcrSessionKey((prev) => prev + 1);
    setShowOcrModal(true);
  };

  const handleOcrRecordSaved = (_savedRecord: InBodyRecordData) => {
    setShowOcrModal(false);
    void loadData();
  };

  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  const fetchCreditBalance = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/credits/me');
      const payload = res?.data || res;
      if (payload && typeof payload.availableCredits === 'number') {
        setCreditBalance(payload.availableCredits);
      }
    } catch {
      // Silently ignore if fails
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchPtDashboard();
      setDashboard(data);
      void fetchCreditBalance();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchCreditBalance]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void fetchPtDashboard().then((data) => {
        if (active) {
          setDashboard(data);
          setLoading(false);
        }
      });
      void fetchCreditBalance();
      return () => {
        active = false;
      };
    }, [fetchCreditBalance])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const userName = session?.user?.fullName || session?.user?.username || 'HLV 3S';
  const total = dashboard?.totalCustomers || 0;
  const good = dashboard?.goodProgressCount || 0;
  const slow = dashboard?.slowProgressCount || 0;
  const poor = dashboard?.poorProgressCount || 0;
  const insufficientCount = (dashboard?.customers || []).filter(
    (c) => c.progressCategory === 'INSUFFICIENT_DATA' || !c.progressCategory
  ).length;
  const insufficient = Math.max(insufficientCount, Math.max(0, total - (good + slow + poor)));
  const alerts = dashboard?.openAlerts || 0;
  const efficiency = total > 0 ? Math.round((good / total) * 100) : 0;

  // Lọc danh sách khách hàng theo trạng thái & từ khóa tìm kiếm
  const filteredCustomers = (dashboard?.customers || []).filter((c) => {
    let matchFilter = true;
    if (filter === 'ALL') {
      matchFilter = true;
    } else if (filter === 'INSUFFICIENT_DATA') {
      matchFilter = c.progressCategory === 'INSUFFICIENT_DATA' || !c.progressCategory;
    } else {
      matchFilter = c.progressCategory === filter;
    }
    if (!matchFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = c.fullName?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      const matchGoal = c.initialGoal?.toLowerCase().includes(q);
      return Boolean(matchName || matchPhone || matchGoal);
    }

    return true;
  });

  const role = session?.user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN';
  const hasAdminPermission = canAccessAdmin(session?.user);

  if (isAdmin) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* TOP HEADER */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {userName} (Admin)
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            {hasAdminPermission && (
              <Pressable
                onPress={() => router.push('/(app)/admin')}
                style={({ pressed }) => [styles.headerAdminBtn, pressed && styles.headerAdminBtnPressed]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Chuyển sang trang Quản trị"
              >
                <Ionicons name="shield-checkmark" size={15} color="#0284C7" />
                <Text style={styles.headerAdminBtnText}>Quản trị</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => router.push('/(app)/wallet')}
              style={({ pressed }) => [styles.headerCreditBadge, pressed && styles.headerCreditBadgePressed]}
              hitSlop={8}
              accessibilityLabel="Số dư Credit AI"
            >
              <Ionicons name="sparkles" size={14} color="#0284C7" />
              <Text style={styles.headerCreditValue}>
                {creditBalance !== null ? creditBalance.toLocaleString('vi-VN') : '---'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(app)/profile')}
              style={({ pressed }) => [styles.avatarWrap, pressed && styles.avatarPressed]}
              hitSlop={8}
              accessibilityLabel="Hồ sơ cá nhân"
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

        {/* ADMIN DASHBOARD VIEW */}
        <AdminDashboardView onRefreshParent={loadData} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          {hasAdminPermission && (
            <Pressable
              onPress={() => router.push('/(app)/admin')}
              style={({ pressed }) => [styles.headerAdminBtn, pressed && styles.headerAdminBtnPressed]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Chuyển sang trang Quản trị"
            >
              <Ionicons name="shield-checkmark" size={15} color="#0284C7" />
              <Text style={styles.headerAdminBtnText}>Quản trị</Text>
            </Pressable>
          )}

          {/* Nút Số dư Credit với icon ngôi sao AI (Bấm để mở Ví Credit) */}
          <Pressable
            onPress={() => router.push('/(app)/wallet')}
            style={({ pressed }) => [styles.headerCreditBadge, pressed && styles.headerCreditBadgePressed]}
            hitSlop={8}
            accessibilityLabel="Số dư Credit AI"
          >
            <Ionicons name="sparkles" size={14} color="#0284C7" />
            <Text style={styles.headerCreditValue}>
              {creditBalance !== null ? creditBalance.toLocaleString('vi-VN') : '---'}
            </Text>
          </Pressable>

          {/* Ảnh đại diện PT (Bấm để xem hồ sơ) */}
          <Pressable
            onPress={() => router.push('/(app)/profile')}
            style={({ pressed }) => [styles.avatarWrap, pressed && styles.avatarPressed]}
            hitSlop={8}
            accessibilityLabel="Hồ sơ cá nhân"
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
                  {(userName || 'PT').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.onlineBadge} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(insets.bottom, 16) + 24
                : Math.max(insets.bottom, 16) + 16,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* 2. THẺ CHỈ SỐ TỔNG HỢP */}
        <View style={styles.quickStatsCard}>
          {/* Khách hàng */}
          <Pressable
            onPress={() => router.push('/(app)/customers')}
            style={({ pressed }) => [
              styles.quickStatCol,
              pressed && styles.quickStatColPressed,
            ]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#F0F9FF' }]}>
              <Feather name="users" size={15} color={colors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{total}</Text>
              <Text style={styles.statLabel}>Khách hàng</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          {/* Cảnh báo */}
          <Pressable
            onPress={() => {
              if (alerts > 0) setFilter('POOR');
            }}
            style={({ pressed }) => [
              styles.quickStatCol,
              pressed && styles.quickStatColPressed,
            ]}
          >
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: alerts > 0 ? '#FEF2F2' : '#F4F8FB' },
              ]}
            >
              <Feather
                name={alerts > 0 ? 'alert-triangle' : 'shield'}
                size={15}
                color={alerts > 0 ? colors.danger : colors.textMuted}
              />
            </View>
            <View style={styles.statInfo}>
              <Text
                style={[
                  styles.statValue,
                  alerts > 0 && { color: colors.danger },
                ]}
              >
                {alerts}
              </Text>
              <Text style={styles.statLabel}>Cảnh báo</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          {/* Hiệu quả */}
          <View style={styles.quickStatCol}>
            <View style={[styles.statIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="trending-up" size={15} color={colors.success} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.success }]}>{efficiency}%</Text>
              <Text style={styles.statLabel}>Tiến bộ tốt</Text>
            </View>
          </View>
        </View>

        {/* 3. LƯỚI TÍNH NĂNG CHUYÊN SÂU */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TÍNH NĂNG CHUYÊN SÂU</Text>
          <Text style={styles.sectionMeta}>8 phân hệ</Text>
        </View>

        <View style={styles.featuresCard}>
          <View style={styles.featuresGrid}>
            {QUICK_FEATURES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.featureItem,
                  pressed && styles.featureItemPressed,
                ]}
              >
                <View style={styles.featureIconWrap}>
                  <Ionicons name={item.iconName} size={20} color={colors.primary} />
                </View>
                <Text style={styles.featureTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 3. BIỂU ĐỒ TRÒN TIẾN ĐỘ HỘI VIÊN */}
        <View
          style={styles.sectionHeader}
          onLayout={(e) => setProgressSectionY(e.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>TIẾN ĐỘ KHÁCH HÀNG</Text>
          <Text style={styles.sectionMeta}>{total} người</Text>
        </View>

        <Card>
          <ProgressPieChart
            good={good}
            slow={slow}
            poor={poor}
            insufficient={insufficient}
            totalCustomers={total}
          />
        </Card>

        {/* 4. KẾT QUẢ NỔI BẬT (BỤC 3 CỘT + MASCOT 3S CỔ VŨ) */}
        <TopPerformersPodium customers={dashboard?.customers || []} />

        {/* 5. DANH SÁCH HỘI VIÊN CẦN THEO DÕI */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DANH SÁCH THEO DÕI</Text>
          <Text style={styles.sectionMeta}>{filteredCustomers.length} người</Text>
        </View>

        {/* Thanh tìm kiếm học viên ở Dashboard */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo tên học viên, SĐT, mục tiêu..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.searchClearBtn}
              hitSlop={8}
              accessibilityLabel="Xóa tìm kiếm"
            >
              <Feather name="x-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filter Pills ngắn */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setFilter('ALL')}
            style={[styles.filterPill, filter === 'ALL' && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
              Tất cả ({total})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('GOOD')}
            style={[styles.filterPill, filter === 'GOOD' && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === 'GOOD' && styles.filterTextActive]}>
              Tốt ({good})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('SLOW')}
            style={[styles.filterPill, filter === 'SLOW' && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === 'SLOW' && styles.filterTextActive]}>
              Chậm ({slow})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('POOR')}
            style={[styles.filterPill, filter === 'POOR' && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === 'POOR' && styles.filterTextActive]}>
              Kém ({poor})
            </Text>
          </Pressable>

          {insufficient > 0 && (
            <Pressable
              onPress={() => setFilter('INSUFFICIENT_DATA')}
              style={[
                styles.filterPill,
                filter === 'INSUFFICIENT_DATA' && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'INSUFFICIENT_DATA' && styles.filterTextActive,
                ]}
              >
                Thiếu Inbody ({insufficient})
              </Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Customer Items */}
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather
              name={searchQuery.trim() ? 'search' : 'check-circle'}
              size={28}
              color={searchQuery.trim() ? colors.textMuted : '#22C55E'}
            />
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? `Không tìm thấy học viên "${searchQuery}"`
                : 'Không có khách hàng nào ở mục này'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map((c) => {
            const isGood = c.progressCategory === 'GOOD';
            const isSlow = c.progressCategory === 'SLOW';
            const isPoor = c.progressCategory === 'POOR';

            const tagColor = isGood
              ? '#22C55E'
              : isSlow
              ? '#F59E0B'
              : isPoor
              ? '#EF4444'
              : '#64748B';
            const tagBg = isGood
              ? 'rgba(34, 197, 94, 0.12)'
              : isSlow
              ? 'rgba(245, 158, 11, 0.12)'
              : isPoor
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(100, 116, 139, 0.12)';
            const tagLabel = isGood
              ? 'Tốt'
              : isSlow
              ? 'Chậm'
              : isPoor
              ? 'Kém'
              : 'Thiếu Inbody';

            return (
              <Pressable
                key={c.customerId}
                onPress={() => router.push('/(app)/customers')}
                style={({ pressed }) => [
                  styles.customerCard,
                  pressed && styles.customerCardPressed,
                ]}
              >
                <View style={styles.customerTop}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {c.fullName}
                    </Text>
                    <Text style={styles.customerGoal} numberOfLines={1}>
                      {c.initialGoal || 'Cải thiện thể lực'}
                    </Text>
                  </View>

                  <View style={styles.statusTagWrap}>
                    <View style={[styles.statusTag, { backgroundColor: tagBg }]}>
                      <Text style={[styles.statusTagText, { color: tagColor }]}>{tagLabel}</Text>
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
                  </View>
                </View>

                {/* Dòng tóm tắt chỉ số & nút Quét InBody cùng hàng */}
                <View style={styles.deltaRow}>
                  <View style={styles.deltaLeftInfo}>
                    {c.changes ? (
                      <>
                        <Text style={styles.deltaText}>
                          {c.changes.muscleChange >= 0
                            ? `+${c.changes.muscleChange}kg cơ`
                            : `${c.changes.muscleChange}kg cơ`}
                        </Text>
                        <Text style={styles.deltaDot}>·</Text>
                        <Text style={styles.deltaText}>
                          {c.changes.bodyFatChange > 0
                            ? `-${c.changes.bodyFatChange}% mỡ`
                            : `+${Math.abs(c.changes.bodyFatChange)}% mỡ`}
                        </Text>
                        <Text style={styles.deltaDot}>·</Text>
                        <Text style={styles.deltaText}>{c.measurementCount} lần đo</Text>
                      </>
                    ) : (
                      <Text style={styles.deltaText}>
                        {c.measurementCount > 0 ? `${c.measurementCount} lần đo` : 'Chưa có phiếu đo'}
                      </Text>
                    )}

                    {c.openAlerts > 0 ? (
                      <View style={styles.alertMiniBadge}>
                        <Feather name="bell" size={11} color="#EF4444" />
                        <Text style={styles.alertMiniText}>{c.openAlerts}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Nút icon mở nhanh Quét phiếu InBody AI cùng hàng */}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleOpenQuickOcr(c);
                    }}
                    style={({ pressed }) => [
                      styles.quickScanRowBtn,
                      pressed && styles.quickScanRowBtnPressed,
                    ]}
                    hitSlop={8}
                    accessibilityLabel={`Quét phiếu InBody cho ${c.fullName}`}
                  >
                    <Ionicons name="scan-outline" size={14} color={colors.primary} />
                    <Text style={styles.quickScanRowText}>Quét</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}

        {/* Hết nội dung - Mascot 3S & thông báo */}
        <View style={styles.endOfContentWrap}>
          <Image source={MASCOT_HAPPY} style={styles.endOfContentImg} resizeMode="contain" />
          <Text style={styles.endOfContentText}>Bạn đã đi hết nội dung ... !</Text>
          <Text style={styles.endOfContentQuote}>
            Đội ngũ HLV 3S Wellness{'\n'}Chuyên môn vững – Tận tâm đồng hành
          </Text>
        </View>
      </ScrollView>

      {/* Modal bo góc - Tính năng sắp ra mắt */}
      <Modal
        visible={showComingSoon}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComingSoon(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowComingSoon(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Feather name="clock" size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Thông báo</Text>
            <Text style={styles.modalMessage}>Tính năng sắp ra mắt !</Text>
            <Pressable
              onPress={() => setShowComingSoon(false)}
              style={({ pressed }) => [
                styles.modalBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.modalBtnText}>Đã hiểu</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      {/* Modal Quét phiếu InBody AI */}
      {showOcrModal && ocrCustomer && (
        <InBodyOcrFlow
          key={`${ocrCustomer.customerId}-${ocrSessionKey}`}
          visible={showOcrModal}
          customers={ocrCustomers}
          defaultCustomerId={ocrCustomer.customerId}
          onClose={() => setShowOcrModal(false)}
          onConfirmed={handleOcrRecordSaved}
          onCustomerCreated={(newCust) => {
            setCustomersList((prev) => [newCust, ...prev]);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 18,
    paddingHorizontal: 11,
    height: 36,
  },
  headerAdminBtnPressed: {
    backgroundColor: '#BAE6FD',
    transform: [{ scale: 0.95 }],
  },
  headerAdminBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  headerCreditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 18,
    paddingHorizontal: 11,
    height: 36,
  },
  headerCreditBadgePressed: {
    backgroundColor: '#E0F2FE',
    transform: [{ scale: 0.95 }],
  },
  headerCreditValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  quickStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickStatCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  quickStatColPressed: {
    opacity: 0.7,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    lineHeight: 12,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  featureItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceIce,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  featureTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    maxWidth: '92%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.6,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 4,
    marginBottom: 6,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  filterScrollView: {
    marginHorizontal: -spacing.lg,
    marginVertical: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingVertical: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerCardPressed: {
    backgroundColor: '#F8FAFC',
    borderColor: '#94A3B8',
    transform: [{ scale: 0.985 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  customerGoal: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginLeft: spacing.sm,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  deltaLeftInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingRight: 6,
  },
  deltaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  deltaDot: {
    marginHorizontal: 5,
    color: '#D1D5DB',
  },
  alertMiniBadge: {
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  alertMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  quickScanRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.22)',
    gap: 3,
    marginLeft: 8,
  },
  quickScanRowBtnPressed: {
    backgroundColor: '#BAE6FD',
    transform: [{ scale: 0.94 }],
  },
  quickScanRowText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyWrap: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  endOfContentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginTop: 8,
    gap: 8,
  },
  endOfContentImg: {
    width: 132,
    height: 132,
  },
  endOfContentText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
  },
  endOfContentQuote: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginTop: 6,
  },
});
