import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';
import type { RoadmapBaseline, RoadmapStrategy } from '@/types/roadmap';

interface RoadmapMetricsGridProps {
  strategy?: RoadmapStrategy;
  baseline?: RoadmapBaseline;
}

export function RoadmapMetricsGrid({ strategy, baseline }: RoadmapMetricsGridProps) {
  if (!strategy && !baseline) return null;

  const estimatedWeeks = strategy?.estimatedWeeks || strategy?.durationWeeks;
  const sessionsPerWeek = strategy?.sessionsPerWeek;
  const targetCalories = strategy?.nutrition?.targetCalories;
  const protein = strategy?.nutrition?.proteinGrams;
  const carbs = strategy?.nutrition?.carbsGrams;
  const fat = strategy?.nutrition?.fatGrams;
  const waterLiters = strategy?.nutrition?.waterLiters;

  const initialWeight = baseline?.initialWeight;
  const initialBodyFat = baseline?.initialBodyFat;
  const initialMuscleMass = baseline?.initialMuscleMass;

  const macroText =
    protein !== undefined || carbs !== undefined || fat !== undefined
      ? `P:${protein || 0}g · C:${carbs || 0}g · F:${fat || 0}g`
      : 'Chuẩn theo thể trạng';

  const bodyCompText =
    initialBodyFat || initialMuscleMass
      ? `${initialBodyFat ? `Mỡ ${initialBodyFat}%` : ''}${initialBodyFat && initialMuscleMass ? ' · ' : ''}${initialMuscleMass ? `Cơ ${initialMuscleMass}kg` : ''}`
      : 'Theo mốc InBody';

  return (
    <View style={styles.card}>
      {/* Row 1: Thời lượng & Calo */}
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.label}>THỜI LƯỢNG</Text>
          <Text style={styles.value}>
            {estimatedWeeks ? `${estimatedWeeks} Tuần` : '12 Tuần'}
          </Text>
          <Text style={styles.sub}>
            {sessionsPerWeek ? `${sessionsPerWeek} buổi / tuần` : 'Lịch tập chuẩn'}
          </Text>
        </View>

        <View style={[styles.cell, styles.cellBorderLeft]}>
          <Text style={styles.label}>CALO MỤC TIÊU</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>
            {targetCalories ? `${targetCalories} kcal` : '—'}
          </Text>
          <Text style={styles.sub} numberOfLines={1} ellipsizeMode="tail">
            {macroText}
          </Text>
        </View>
      </View>

      {/* Row 2: Chỉ số ban đầu & Lượng nước */}
      <View style={[styles.row, styles.rowBorderTop]}>
        <View style={styles.cell}>
          <Text style={styles.label}>CHỈ SỐ BAN ĐẦU</Text>
          <Text style={styles.value}>
            {initialWeight ? `${initialWeight} kg` : '—'}
          </Text>
          <Text style={styles.sub} numberOfLines={1} ellipsizeMode="tail">
            {bodyCompText}
          </Text>
        </View>

        <View style={[styles.cell, styles.cellBorderLeft]}>
          <Text style={styles.label}>NƯỚC MỖI NGÀY</Text>
          <Text style={[styles.value, { color: '#0284C7' }]}>
            {waterLiters ? `${waterLiters} Lít` : '2 - 3 Lít'}
          </Text>
          <Text style={styles.sub}>Mục tiêu ngày</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  cellBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryNavy,
    lineHeight: 20,
    marginBottom: 1,
  },
  sub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
