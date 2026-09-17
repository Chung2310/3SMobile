import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  itemLabel?: string;
  loading?: boolean;
  onPageChange: (newPage: number) => void;
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = 'mục',
  loading = false,
  onPageChange,
}: PaginationBarProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const canGoPrev = page > 1 && !loading;
  const canGoNext = page < safeTotalPages && !loading;

  if (safeTotalPages <= 1) {
    if (totalItems !== undefined && totalItems > 0) {
      return (
        <View style={styles.singlePageWrap}>
          <Text style={styles.summaryText}>
            Hiển thị tất cả {totalItems} {itemLabel}
          </Text>
        </View>
      );
    }
    return null;
  }

  const start = pageSize ? (page - 1) * pageSize + 1 : undefined;
  const end = pageSize && totalItems !== undefined ? Math.min(page * pageSize, totalItems) : undefined;

  // Calculate up to 5 page numbers
  let pages: number[] = [];
  if (safeTotalPages <= 5) {
    for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
  } else {
    const startPage = Math.max(1, Math.min(page - 2, safeTotalPages - 4));
    for (let i = 0; i < 5; i++) pages.push(startPage + i);
  }

  return (
    <View style={styles.container}>
      {/* Top summary row if totalItems & pageSize are passed */}
      {start !== undefined && end !== undefined && totalItems !== undefined && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            Hiển thị <Text style={styles.boldText}>{start}–{end}</Text> trên{' '}
            <Text style={styles.boldText}>{totalItems}</Text> {itemLabel}
          </Text>
          <View style={styles.pageIndicatorChip}>
            <Text style={styles.pageIndicatorChipText}>
              Trang {page}/{safeTotalPages}
            </Text>
          </View>
        </View>
      )}

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        {/* Previous Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trang trước"
          disabled={!canGoPrev}
          onPress={() => onPageChange(page - 1)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.navBtn,
            !canGoPrev && styles.navBtnDisabled,
            pressed && canGoPrev && styles.navBtnPressed,
          ]}
        >
          <Feather
            name="chevron-left"
            size={14}
            color={!canGoPrev ? colors.textMuted : colors.primary}
          />
          <Text style={[styles.navBtnText, !canGoPrev && styles.navBtnTextDisabled]}>
            Trước
          </Text>
        </Pressable>

        {/* Page Pills or Simple Text */}
        {pageSize ? (
          <View style={styles.pillsGroup}>
            {pages.map((p) => {
              const isActive = p === page;
              return (
                <Pressable
                  key={p}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => onPageChange(p)}
                  hitSlop={6}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>
              Trang <Text style={styles.pageCurrent}>{page}</Text> / {safeTotalPages}
            </Text>
          </View>
        )}

        {/* Next Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trang sau"
          disabled={!canGoNext}
          onPress={() => onPageChange(page + 1)}
          hitSlop={8}
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
            size={14}
            color={!canGoNext ? colors.textMuted : colors.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  singlePageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  summaryText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  boldText: {
    fontWeight: '800',
    color: colors.text,
  },
  pageIndicatorChip: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pageIndicatorChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navBtnDisabled: {
    opacity: 0.45,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  navBtnPressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.97 }],
  },
  navBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  navBtnTextDisabled: {
    color: '#94A3B8',
  },
  pillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  pageIndicator: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  pageCurrent: {
    fontWeight: '700',
    color: colors.primary,
  },
});
