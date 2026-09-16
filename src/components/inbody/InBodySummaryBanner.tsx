import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';
import type { InBodyComparison } from '@/types/inbody';

interface InBodySummaryBannerProps {
  comparison: InBodyComparison;
  customerName?: string;
  totalRecordsCount?: number;
}

export function InBodySummaryBanner({
  comparison,
  customerName,
  totalRecordsCount,
}: InBodySummaryBannerProps) {
  const isExcellent = comparison.trendType === 'EXCELLENT';
  const isGood = comparison.trendType === 'GOOD';
  const isNeedsAdjustment = comparison.trendType === 'NEEDS_ADJUSTMENT';

  const themeConfig = isExcellent
    ? {
        bg: '#F0FDF4',
        border: '#BBF7D0',
        badgeBg: '#DCFCE7',
        badgeText: '#15803D',
        badgeLabel: 'XUẤT SẮC',
        iconName: 'flame' as const,
        iconColor: '#16A34A',
      }
    : isGood
    ? {
        bg: '#F0F9FF',
        border: '#BAE6FD',
        badgeBg: '#E0F2FE',
        badgeText: '#0369A1',
        badgeLabel: 'TIẾN BỘ TỐT',
        iconName: 'trending-up' as const,
        iconColor: '#0284C7',
      }
    : isNeedsAdjustment
    ? {
        bg: '#FEF2F2',
        border: '#FECACA',
        badgeBg: '#FEE2E2',
        badgeText: '#B91C1C',
        badgeLabel: 'CẦN ĐIỀU CHỈNH',
        iconName: 'alert-circle' as const,
        iconColor: '#EF4444',
      }
    : {
        bg: '#F8FAFC',
        border: '#E2E8F0',
        badgeBg: '#F1F5F9',
        badgeText: '#475569',
        badgeLabel: 'ỔN ĐỊNH',
        iconName: 'swap-horizontal' as const,
        iconColor: '#64748B',
      };

  const renderDeltaPill = (
    label: string,
    deltaVal: number,
    unit: string,
    invertColor = false // e.g. for fat, negative is good
  ) => {
    const isZero = deltaVal === 0;
    const isPositive = deltaVal > 0;
    const sign = isPositive ? '+' : '';

    let color: string = colors.textMuted;
    if (!isZero) {
      if (invertColor) {
        color = deltaVal < 0 ? colors.success : colors.danger;
      } else {
        color = deltaVal > 0 ? colors.success : colors.danger;
      }
    }

    return (
      <View style={styles.deltaPill}>
        <Text style={styles.deltaLabel}>{label}</Text>
        <Text style={[styles.deltaVal, { color }]}>
          {isZero ? '0' : `${sign}${deltaVal}`}
          <Text style={styles.deltaUnit}> {unit}</Text>
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeConfig.bg, borderColor: themeConfig.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: themeConfig.badgeBg }]}>
            <Ionicons name={themeConfig.iconName} size={18} color={themeConfig.iconColor} />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>
              {customerName ? `Tiến độ: ${customerName}` : 'So sánh với lần đo trước'}
            </Text>
            <Text style={styles.subtitle}>
              Cách đây {comparison.daysBetween} ngày
              {totalRecordsCount ? ` • Lần đo thứ ${totalRecordsCount}` : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: themeConfig.badgeBg }]}>
          <Text style={[styles.badgeText, { color: themeConfig.badgeText }]}>
            {themeConfig.badgeLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.summaryText}>{comparison.trendSummary}</Text>

      <View style={styles.deltaRow}>
        {renderDeltaPill('Cân nặng', comparison.deltaWeight, 'kg', true)}
        {renderDeltaPill('% Mỡ', comparison.deltaFatPercentage, '%', true)}
        {renderDeltaPill('Cơ bắp', comparison.deltaMuscleMass, 'kg', false)}
        {renderDeltaPill('Điểm', comparison.deltaScore, 'đ', false)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.primaryNavy,
  },
  subtitle: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  summaryText: {
    fontWeight: '500',
    fontSize: 12.5,
    color: colors.text,
    lineHeight: 18,
    marginVertical: spacing.xs,
  },
  deltaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
  },
  deltaPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  deltaLabel: {
    fontWeight: '400',
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  deltaVal: {
    fontWeight: '700',
    fontSize: 12,
  },
  deltaUnit: {
    fontWeight: '400',
    fontSize: 9,
    color: colors.textMuted,
  },
});
