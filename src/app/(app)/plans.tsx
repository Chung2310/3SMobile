import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionHeader } from '@/components/UI';
import { colors, radius, spacing, typography } from '@/theme';

interface PlanItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  sessionsPerWeek: number;
  assignedCustomers: number;
  level: string;
  status: 'ACTIVE' | 'DRAFT';
}

const PLANS: PlanItem[] = [
  {
    id: 'p-1',
    title: 'Giáo án Tăng cơ Hypertrophy chuyên sâu',
    category: 'Tăng cơ bắp (Muscle Gain)',
    duration: '8 tuần',
    sessionsPerWeek: 4,
    assignedCustomers: 2,
    level: 'Nâng cao',
    status: 'ACTIVE',
  },
  {
    id: 'p-2',
    title: 'Giáo án Siết mỡ & Định hình eo mông',
    category: 'Siết mỡ (Fat Loss)',
    duration: '12 tuần',
    sessionsPerWeek: 4,
    assignedCustomers: 1,
    level: 'Trung cấp',
    status: 'ACTIVE',
  },
  {
    id: 'p-3',
    title: 'Giáo án Khởi động & Nền tảng thể lực',
    category: 'Thích nghi (Adaptation)',
    duration: '4 tuần',
    sessionsPerWeek: 3,
    assignedCustomers: 1,
    level: 'Cơ bản',
    status: 'ACTIVE',
  },
  {
    id: 'p-4',
    title: 'Giáo án Tăng sức mạnh Powerlifting 5x5',
    category: 'Sức mạnh (Strength)',
    duration: '6 tuần',
    sessionsPerWeek: 3,
    assignedCustomers: 0,
    level: 'Nâng cao',
    status: 'DRAFT',
  },
];

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const [plans] = useState<PlanItem[]>(PLANS);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header with Back Button */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Giáo án của tôi</Text>
          <Text style={styles.pageSubtitle}>{plans.length} giáo án huấn luyện</Text>
        </View>
        <Pressable
          hitSlop={12}
          style={styles.addBtn}
          onPress={() => {}}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
      >
        <SectionHeader title="Giáo án đang áp dụng" />

        {plans.map((item) => (
          <Card key={item.id}>
            <View style={styles.cardHeader}>
              <View style={styles.catBadge}>
                <Text style={styles.catText}>{item.category}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  item.status === 'ACTIVE' ? styles.statusActive : styles.statusDraft,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'ACTIVE' ? { color: '#16A34A' } : { color: colors.textMuted },
                  ]}
                >
                  {item.status === 'ACTIVE' ? 'Đang dạy' : 'Bản nháp'}
                </Text>
              </View>
            </View>

            <Text style={styles.planTitle}>{item.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="clock" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>{item.duration}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="calendar" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>{item.sessionsPerWeek} buổi/tuần</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="users" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>{item.assignedCustomers} học viên</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollContent: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  catBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  statusDraft: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  planTitle: {
    ...typography.heading,
    fontSize: 16,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
