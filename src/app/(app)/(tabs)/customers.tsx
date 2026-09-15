import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Card, EmptyState, Row, SectionHeader } from '@/components/UI';
import { Screen } from '@/components/Screen';
import { fetchPtDashboard } from '@/services/dashboardService';
import { colors, radius, spacing, typography } from '@/theme';
import type { PtCustomerSummary } from '@/types/domain';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<PtCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await fetchPtDashboard();
      setCustomers(data?.customers || []);
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

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.initialGoal && c.initialGoal.toLowerCase().includes(q))
    );
  });

  function getBadgeColor(category?: string) {
    if (category === 'GOOD') return '#22C55E';
    if (category === 'SLOW') return '#F59E0B';
    if (category === 'POOR') return '#EF4444';
    return colors.textMuted;
  }

  function getCategoryText(category?: string) {
    if (category === 'GOOD') return 'Tiến bộ tốt';
    if (category === 'SLOW') return 'Tiến bộ chậm';
    if (category === 'POOR') return 'Cần cải thiện';
    return 'Chưa đánh giá';
  }

  return (
    <Screen
      title="Khách hàng"
      subtitle="Danh sách học viên và tình trạng luyện tập"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Ô tìm kiếm */}
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
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

      <SectionHeader title={`Danh sách (${filtered.length})`} />

      {filtered.length ? (
        filtered.map((item) => (
          <Card key={item.customerId}>
            <View style={styles.customerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{item.fullName}</Text>
                {item.phone ? <Text style={styles.phoneText}>{item.phone}</Text> : null}
              </View>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: `${getBadgeColor(item.progressCategory)}1A` },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: getBadgeColor(item.progressCategory) },
                  ]}
                >
                  {getCategoryText(item.progressCategory)}
                </Text>
              </View>
            </View>

            {item.initialGoal ? (
              <Text style={styles.goalText}>Mục tiêu: {item.initialGoal}</Text>
            ) : null}

            <Row
              label="Điểm phong độ"
              value={item.score ? `${item.score} / 100` : 'Đang cập nhật'}
              icon="◈"
            />
            <Row
              label="Số lần đo InBody"
              value={`${item.measurementCount || 0} lần`}
              icon="↻"
            />
          </Card>
        ))
      ) : (
        <Card>
          <EmptyState
            title="Không có học viên"
            message={
              search
                ? 'Không tìm thấy học viên phù hợp với từ khóa.'
                : 'Chưa có dữ liệu học viên được phân công.'
            }
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  customerName: {
    ...typography.heading,
    fontSize: 16,
    color: colors.text,
  },
  phoneText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
});
