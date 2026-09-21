import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

interface RoadmapEmptyStateProps {
  onRefresh?: () => void;
  onCreatePress?: () => void;
  isStaff?: boolean;
}

export function RoadmapEmptyState({ onRefresh, onCreatePress, isStaff }: RoadmapEmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Feather name="map" size={32} color={colors.primary} />
      </View>

      <Text style={styles.title}>Chưa có lộ trình công bố</Text>

      <Text style={styles.message}>
        {isStaff
          ? 'Chưa có lộ trình nào trong danh sách. Bạn có thể tạo mới lộ trình cho học viên bằng Trợ lý AI hoặc Khoa học Thể thao ngay tại đây.'
          : 'Huấn luyện viên đang xây dựng lộ trình chi tiết theo từng giai đoạn và mốc đánh giá cho bạn. Vui lòng kiểm tra lại sau!'}
      </Text>

      <View style={styles.actionsRow}>
        {isStaff && onCreatePress && (
          <Pressable
            onPress={onCreatePress}
            style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Tạo lộ trình ngay</Text>
          </Pressable>
        )}

        {onRefresh && (
          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.8 }]}
          >
            <Feather name="refresh-cw" size={14} color={isStaff && onCreatePress ? colors.primary : '#FFFFFF'} />
            <Text
              style={[
                styles.refreshBtnText,
                isStaff && onCreatePress ? { color: colors.primary } : { color: '#FFFFFF' },
              ]}
            >
              Kiểm tra lại
            </Text>
          </Pressable>
        )}
      </View>
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
