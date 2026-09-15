import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressPieChart } from '@/components/ProgressPieChart';
import { TopPerformersPodium } from '@/components/TopPerformersPodium';
import { Card } from '@/components/UI';
import { useAuth } from '@/context/AuthContext';
import { fetchPtDashboard } from '@/services/dashboardService';
import { colors, radius, spacing, typography } from '@/theme';
import type { ProgressCategory, PtCustomerSummary, PtDashboardData } from '@/types/domain';

type FilterType = 'ALL' | ProgressCategory;

const MASCOT_HAPPY = require('../../../../assets/public/3s-happy.png');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [dashboard, setDashboard] = useState<PtDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [progressSectionY, setProgressSectionY] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchPtDashboard();
      setDashboard(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void fetchPtDashboard().then((data) => {
        if (active) {
          setDashboard(data);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [])
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

  // Lọc danh sách khách hàng
  const filteredCustomers = (dashboard?.customers || []).filter((c) => {
    if (filter === 'ALL') return true;
    if (filter === 'INSUFFICIENT_DATA') {
      return c.progressCategory === 'INSUFFICIENT_DATA' || !c.progressCategory;
    }
    return c.progressCategory === filter;
  });

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
        </View>

        {/* Ảnh đại diện PT (Bấm để xem hồ sơ) */}
        <Pressable
          onPress={() => router.push('/(app)/profile')}
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.avatarPressed]}
          hitSlop={8}
        >
          {dashboard?.ptAvatarUrl || session?.user?.avatarUrl ? (
            <Image
              source={{ uri: dashboard?.ptAvatarUrl || session?.user?.avatarUrl }}
              style={styles.avatarImg}
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
        {/* 2. THANH LỐI TẮT NHANH (CÓ TEXT + ICON RÕ RÀNG, DẠNG THANH GỌN GÀNG) */}
        <View style={styles.quickToolstrip}>
          {/* 1. Tiến độ */}
          <Pressable
            onPress={() => router.push('/(app)/progress-workspace')}
            style={({ pressed }) => [
              styles.quickToolItem,
              pressed && styles.quickToolItemTienDoPressed,
            ]}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.quickToolIconWrap,
                    { backgroundColor: pressed ? '#BAE6FD' : '#EFF6FF' },
                    pressed && { transform: [{ scale: 1.12 }] },
                  ]}
                >
                  <Ionicons name="trending-up" size={15} color="#0284C7" />
                </View>
                <Text
                  style={[
                    styles.quickToolText,
                    pressed && { color: '#0284C7', fontWeight: '800' },
                  ]}
                >
                  Tiến độ
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.quickToolDivider} />

          {/* 2. Giáo án */}
          <Pressable
            onPress={() => router.push('/(app)/plans')}
            style={({ pressed }) => [
              styles.quickToolItem,
              pressed && styles.quickToolItemGiaoAnPressed,
            ]}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.quickToolIconWrap,
                    { backgroundColor: pressed ? '#DDD6FE' : '#F5F3FF' },
                    pressed && { transform: [{ scale: 1.12 }] },
                  ]}
                >
                  <Ionicons name="clipboard" size={15} color="#7C3AED" />
                </View>
                <Text
                  style={[
                    styles.quickToolText,
                    pressed && { color: '#7C3AED', fontWeight: '800' },
                  ]}
                >
                  Giáo án
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.quickToolDivider} />

          {/* 3. Ví */}
          <Pressable
            onPress={() => setShowComingSoon(true)}
            style={({ pressed }) => [
              styles.quickToolItem,
              pressed && styles.quickToolItemViPressed,
            ]}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.quickToolIconWrap,
                    { backgroundColor: pressed ? '#BBF7D0' : '#F0FDF4' },
                    pressed && { transform: [{ scale: 1.12 }] },
                  ]}
                >
                  <Ionicons name="wallet" size={15} color="#16A34A" />
                </View>
                <Text
                  style={[
                    styles.quickToolText,
                    pressed && { color: '#16A34A', fontWeight: '800' },
                  ]}
                >
                  Ví
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* 3. THẺ CHỈ SỐ NHANH */}
        <View style={styles.metricsRow}>
          {/* Hội viên */}
          <Pressable
            onPress={() => router.push('/(app)/customers')}
            style={({ pressed }) => [
              styles.metricCard,
              pressed && styles.metricCardPressed,
            ]}
          >
            <View style={styles.metricCardTop}>
              <Text style={styles.metricNum}>{total}</Text>
              <Feather name="chevron-right" size={14} color={colors.textMuted} />
            </View>
            <Text style={styles.metricLabel}>Khách hàng</Text>
          </Pressable>

          {/* Cảnh báo */}
          <Pressable
            onPress={() => {
              if (alerts > 0) setFilter('POOR');
            }}
            style={({ pressed }) => [
              styles.metricCard,
              alerts > 0 && styles.metricCardAlert,
              pressed && styles.metricCardPressed,
            ]}
          >
            <View style={styles.metricCardTop}>
              <Text style={[styles.metricNum, alerts > 0 && { color: '#EF4444' }]}>{alerts}</Text>
              {alerts > 0 ? (
                <Feather name="alert-triangle" size={13} color="#EF4444" />
              ) : null}
            </View>
            <Text style={styles.metricLabel}>Cảnh báo</Text>
          </Pressable>

          {/* Hiệu quả */}
          <View style={styles.metricCard}>
            <Text style={[styles.metricNum, { color: '#22C55E' }]}>{efficiency}%</Text>
            <Text style={styles.metricLabel}>Tiến bộ tốt</Text>
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

        {/* Filter Pills ngắn */}
        <View style={styles.filterRow}>
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
        </View>

        {/* Customer Items */}
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="check-circle" size={28} color="#22C55E" />
            <Text style={styles.emptyText}>Không có khách hàng nào ở mục này</Text>
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
                  <View style={{ flex: 1 }}>
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

                {/* Dòng tóm tắt chỉ số ngắn */}
                {c.changes ? (
                  <View style={styles.deltaRow}>
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

                    {c.openAlerts > 0 ? (
                      <View style={styles.alertMiniBadge}>
                        <Feather name="bell" size={11} color="#EF4444" />
                        <Text style={styles.alertMiniText}>{c.openAlerts}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 74,
  },
  metricCardAlert: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  metricNum: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricCardPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
  },
  quickToolstrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickToolItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quickToolItemPressed: {
    backgroundColor: '#F3F4F6',
    transform: [{ scale: 0.98 }],
  },
  quickToolItemTienDoPressed: {
    backgroundColor: '#F0F9FF',
    transform: [{ scale: 0.96 }],
  },
  quickToolItemGiaoAnPressed: {
    backgroundColor: '#FAF5FF',
    transform: [{ scale: 0.96 }],
  },
  quickToolItemViPressed: {
    backgroundColor: '#F0FDF4',
    transform: [{ scale: 0.96 }],
  },
  quickToolIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickToolText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  quickToolDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.8,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
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
    borderColor: '#E5E7EB',
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
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  deltaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  deltaDot: {
    marginHorizontal: 6,
    color: '#D1D5DB',
  },
  alertMiniBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  alertMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
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
