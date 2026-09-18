import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

interface RoadmapEmptyStateProps {
  onRefresh?: () => void;
  isStaff?: boolean;
}

export function RoadmapEmptyState({ onRefresh, isStaff }: RoadmapEmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Feather name="map" size={32} color={colors.primary} />
      </View>

      <Text style={styles.title}>Chưa có lộ trình công bố</Text>

      <Text style={styles.message}>
        {isStaff
          ? 'Học viên này chưa có lộ trình nào được xuất bản. Bạn có thể tạo và xuất bản lộ trình cho học viên qua hệ thống Web PT.'
          : 'Huấn luyện viên đang xây dựng lộ trình chi tiết theo từng giai đoạn và mốc đánh giá cho bạn. Vui lòng kiểm tra lại sau!'}
      </Text>

      {onRefresh && (
        <Pressable
          onPress={onRefresh}
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.8 }]}
        >
          <Feather name="refresh-cw" size={14} color="#FFFFFF" />
          <Text style={styles.refreshBtnText}>Kiểm tra lại</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryNavy,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
