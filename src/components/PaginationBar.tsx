import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  loading?: boolean;
  onPageChange: (newPage: number) => void;
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  loading = false,
  onPageChange,
}: PaginationBarProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const canGoPrev = page > 1 && !loading;
  const canGoNext = page < safeTotalPages && !loading;

  if (safeTotalPages <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Previous Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Trang trước"
        disabled={!canGoPrev}
        onPress={() => onPageChange(page - 1)}
        style={({ pressed }) => [
          styles.navBtn,
          !canGoPrev && styles.navBtnDisabled,
          pressed && canGoPrev && styles.navBtnPressed,
        ]}
      >
        <Feather
          name="chevron-left"
          size={16}
          color={!canGoPrev ? colors.textMuted : colors.text}
        />
        <Text style={[styles.navBtnText, !canGoPrev && styles.navBtnTextDisabled]}>
          Trước
        </Text>
      </Pressable>

      {/* Page Indicator */}
      <View style={styles.pageIndicator}>
        <Text style={styles.pageText}>
          Trang <Text style={styles.pageCurrent}>{page}</Text> / {safeTotalPages}
        </Text>
      </View>

      {/* Next Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Trang sau"
        disabled={!canGoNext}
        onPress={() => onPageChange(page + 1)}
        style={({ pressed }) => [
          styles.navBtn,
          !canGoNext && styles.navBtnDisabled,
          pressed && canGoNext && styles.navBtnPressed,
        ]}
      >
        <Text style={[styles.navBtnText, !canGoNext && styles.navBtnTextDisabled]}>
          Sau
        </Text>
        <Feather
          name="chevron-right"
          size={16}
          color={!canGoNext ? colors.textMuted : colors.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnDisabled: {
    opacity: 0.35,
    backgroundColor: 'transparent',
    borderColor: colors.borderSoft,
  },
  navBtnPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.97 }],
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  navBtnTextDisabled: {
    color: colors.textMuted,
  },
  pageIndicator: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  pageCurrent: {
    fontWeight: '700',
    color: colors.primary,
  },
});
