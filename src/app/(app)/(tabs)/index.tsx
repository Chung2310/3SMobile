import { useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressPieChart } from '@/components/ProgressPieChart';
import { TopPerformersPodium } from '@/components/TopPerformersPodium';
import { Card } from '@/components/UI';
import { useAuth } from '@/context/AuthContext';
import { fetchPtDashboard } from '@/services/dashboardService';
import { colors, radius, spacing, typography } from '@/theme';
import type { ProgressCategory, PtCustomerSummary, PtDashboardData } from '@/types/domain';

type FilterType = 'ALL' | ProgressCategory;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [dashboard, setDashboard] = useState<PtDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');

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
      setLoading(true);
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
  const alerts = dashboard?.openAlerts || 0;
  const efficiency = total > 0 ? Math.round((good / total) * 100) : 0;

  // Lọc danh sách học viên
  const filteredCustomers = (dashboard?.customers || []).filter((c) => {
    if (filter === 'ALL') return true;
    return c.progressCategory === filter;
  });

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP HEADER GỌN GÀNG */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
        </View>
        <View style={styles.badgeWrap}>
          <View style={styles.onlineDot} />
          <Text style={styles.badgeText}>Trợ lý PT</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(insets.bottom, 48) + 110
                : Math.max(insets.bottom, 24) + 90,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
      >
        {/* 2. THẺ CHỈ SỐ NHANH (3 CỘT GỌN) */}
        <View style={styles.metricsRow}>
          {/* Hội viên */}
          <View style={styles.metricCard}>
            <Text style={styles.metricNum}>{total}</Text>
            <Text style={styles.metricLabel}>Hội viên</Text>
          </View>

          {/* Cảnh báo */}
          <View style={[styles.metricCard, alerts > 0 && styles.metricCardAlert]}>
            <Text style={[styles.metricNum, alerts > 0 && { color: '#EF4444' }]}>{alerts}</Text>
            <Text style={styles.metricLabel}>Cảnh báo</Text>
          </View>

          {/* Hiệu quả */}
          <View style={styles.metricCard}>
            <Text style={[styles.metricNum, { color: '#22C55E' }]}>{efficiency}%</Text>
            <Text style={styles.metricLabel}>Tiến bộ tốt</Text>
          </View>
        </View>

        {/* 3. BIỂU ĐỒ TRÒN TIẾN ĐỘ HỘI VIÊN */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TIẾN ĐỘ HỘI VIÊN</Text>
          <Text style={styles.sectionMeta}>{total} người</Text>
        </View>

        <Card>
          <ProgressPieChart good={good} slow={slow} poor={poor} />
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
        </View>

        {/* Customer Items */}
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="check-circle" size={28} color="#22C55E" />
            <Text style={styles.emptyText}>Không có học viên nào ở mục này</Text>
          </View>
        ) : (
          filteredCustomers.map((c) => {
            const isGood = c.progressCategory === 'GOOD';
            const isSlow = c.progressCategory === 'SLOW';
            const isPoor = c.progressCategory === 'POOR';

            const tagColor = isGood ? '#22C55E' : isSlow ? '#F59E0B' : '#EF4444';
            const tagBg = isGood
              ? 'rgba(34, 197, 94, 0.12)'
              : isSlow
              ? 'rgba(245, 158, 11, 0.12)'
              : 'rgba(239, 68, 68, 0.12)';
            const tagLabel = isGood ? 'Tốt' : isSlow ? 'Chậm' : 'Kém';

            return (
              <View key={c.customerId} style={styles.customerCard}>
                <View style={styles.customerTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {c.fullName}
                    </Text>
                    <Text style={styles.customerGoal} numberOfLines={1}>
                      {c.initialGoal || 'Cải thiện thể lực'}
                    </Text>
                  </View>

                  <View style={[styles.statusTag, { backgroundColor: tagBg }]}>
                    <Text style={[styles.statusTagText, { color: tagColor }]}>{tagLabel}</Text>
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
              </View>
            );
          })
        )}
      </ScrollView>
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
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
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
});
