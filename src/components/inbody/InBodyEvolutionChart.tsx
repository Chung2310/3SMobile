import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { InBodyRecordData } from '@/types/inbody';

export type MetricTab = 'ALL' | 'WEIGHT' | 'MUSCLE' | 'FAT' | 'SCORE';

export interface InBodyEvolutionChartProps {
  records: InBodyRecordData[];
  title?: string;
}

const TAB_OPTIONS: { id: MetricTab; label: string; color: string }[] = [
  { id: 'ALL', label: 'Tất cả', color: colors.primary },
  { id: 'WEIGHT', label: 'Cân nặng', color: '#0284C7' },
  { id: 'MUSCLE', label: 'Cơ', color: '#16A34A' },
  { id: 'FAT', label: '% Mỡ', color: '#D97706' },
  { id: 'SCORE', label: 'Điểm', color: '#9333EA' },
];

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
};

const formatFullDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function InBodyEvolutionChart({ records, title }: InBodyEvolutionChartProps) {
  const [activeTab, setActiveTab] = useState<MetricTab>('ALL');
  const [containerWidth, setContainerWidth] = useState(340);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Filter & sort chronological (oldest to newest)
  const sorted = useMemo(() => {
    return [...records]
      .filter((r) => r.weight != null && r.weight > 0)
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime());
  }, [records]);

  // Overall summary deltas (latest vs first)
  const overallDelta = useMemo(() => {
    if (sorted.length < 2) return null;
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    return {
      deltaWeight: Number((latest.weight - first.weight).toFixed(1)),
      deltaMuscle:
        latest.muscleMass != null && first.muscleMass != null
          ? Number((latest.muscleMass - first.muscleMass).toFixed(1))
          : null,
      deltaFat:
        latest.bodyFatPercentage != null && first.bodyFatPercentage != null
          ? Number((latest.bodyFatPercentage - first.bodyFatPercentage).toFixed(1))
          : null,
      deltaScore:
        latest.inbodyScore != null && first.inbodyScore != null
          ? latest.inbodyScore - first.inbodyScore
          : null,
      firstDate: formatFullDate(first.measurementDate),
      latestDate: formatFullDate(latest.measurementDate),
    };
  }, [sorted]);

  const activeIndex = selectedIdx !== null ? selectedIdx : sorted.length - 1;
  const activeRecord = sorted[activeIndex] || sorted[sorted.length - 1];

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 50) {
      setContainerWidth(width);
    }
  };

  if (sorted.length < 2) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="stats-chart-outline" size={24} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Chưa đủ dữ liệu vẽ biểu đồ tiến trình</Text>
        <Text style={styles.emptySub}>
          Cần tối thiểu 2 lần đo InBody của học viên này để phân tích xu hướng thay đổi thể chất.
        </Text>
      </View>
    );
  }

  // Chart layout dimensions
  const svgWidth = Math.max(200, containerWidth - 32);
  const chartHeight = 190;
  const paddingLeft = 38;
  const paddingRight = 20;
  const paddingTop = 16;
  const paddingBottom = 30;
  const plotWidth = Math.max(100, svgWidth - paddingLeft - paddingRight);
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (idx: number) => {
    if (sorted.length <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (idx * plotWidth) / (sorted.length - 1);
  };

  // Helper bounds
  const getBounds = (values: (number | null | undefined)[]) => {
    const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
    if (valid.length === 0) return { min: 0, max: 100, span: 100 };
    const rawMin = Math.min(...valid);
    const rawMax = Math.max(...valid);
    if (rawMin === rawMax) {
      return { min: Math.max(0, rawMin - 2), max: rawMax + 2, span: 4 };
    }
    const margin = (rawMax - rawMin) * 0.18 || 1;
    return {
      min: Number((rawMin - margin).toFixed(1)),
      max: Number((rawMax + margin).toFixed(1)),
      span: rawMax - rawMin + margin * 2 || 1,
    };
  };

  const weightBounds = getBounds(sorted.map((s) => s.weight));
  const muscleBounds = getBounds(sorted.map((s) => s.muscleMass));
  const fatBounds = getBounds(sorted.map((s) => s.bodyFatPercentage));
  const scoreBounds = getBounds(sorted.map((s) => s.inbodyScore));

  const getYWeight = (w?: number | null) => {
    if (w == null) return chartHeight - paddingBottom;
    return chartHeight - paddingBottom - ((w - weightBounds.min) / weightBounds.span) * plotHeight;
  };

  const getYMuscle = (m?: number | null) => {
    if (m == null) return chartHeight - paddingBottom;
    return chartHeight - paddingBottom - ((m - muscleBounds.min) / muscleBounds.span) * plotHeight;
  };

  const getYFat = (f?: number | null) => {
    if (f == null) return chartHeight - paddingBottom;
    return chartHeight - paddingBottom - ((f - fatBounds.min) / fatBounds.span) * plotHeight;
  };

  const getYScore = (s?: number | null) => {
    if (s == null) return chartHeight - paddingBottom;
    return chartHeight - paddingBottom - ((s - scoreBounds.min) / scoreBounds.span) * plotHeight;
  };

  // Build SVG Path 'M x y L x y'
  const buildPathD = (getYFn: (val: any) => number, key: keyof InBodyRecordData) => {
    const pts = sorted
      .map((item, idx) => {
        const val = item[key];
        if (val == null) return null;
        return { x: getX(idx), y: getYFn(val) };
      })
      .filter(Boolean) as { x: number; y: number }[];

    if (pts.length === 0) return '';
    return pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  };

  const weightPath = buildPathD(getYWeight, 'weight');
  const musclePath = buildPathD(getYMuscle, 'muscleMass');
  const fatPath = buildPathD(getYFat, 'bodyFatPercentage');
  const scorePath = buildPathD(getYScore, 'inbodyScore');

  // Build Area Path for single metric
  const buildAreaD = (lineD: string) => {
    if (!lineD) return '';
    const firstX = getX(0);
    const lastX = getX(sorted.length - 1);
    const bottomY = chartHeight - paddingBottom;
    return `${lineD} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  };

  // Active single metric color & path
  let activeMetricColor = '#0284C7';
  let activeMetricPath = weightPath;
  let activeMetricBounds = weightBounds;
  let activeMetricUnit = 'kg';

  if (activeTab === 'MUSCLE') {
    activeMetricColor = '#16A34A';
    activeMetricPath = musclePath;
    activeMetricBounds = muscleBounds;
    activeMetricUnit = 'kg';
  } else if (activeTab === 'FAT') {
    activeMetricColor = '#D97706';
    activeMetricPath = fatPath;
    activeMetricBounds = fatBounds;
    activeMetricUnit = '%';
  } else if (activeTab === 'SCORE') {
    activeMetricColor = '#9333EA';
    activeMetricPath = scorePath;
    activeMetricBounds = scoreBounds;
    activeMetricUnit = 'đ';
  }

  // Y-axis grid lines (3 lines)
  const gridLevels = [0, 0.5, 1];

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* 1. Header & Title */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="trending-up" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {title || `Xu hướng thể chất (${sorted.length} lần đo)`}
            </Text>
            {overallDelta && (
              <Text style={styles.headerSub}>
                {overallDelta.firstDate} ➔ {overallDelta.latestDate}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 2. Quick Overall Delta Pills */}
      {overallDelta && (
        <View style={styles.deltaPillsRow}>
          {/* Cân nặng */}
          <View style={styles.deltaPill}>
            <Text style={styles.deltaLabel}>Cân nặng:</Text>
            <Text
              style={[
                styles.deltaVal,
                {
                  color:
                    overallDelta.deltaWeight > 0
                      ? colors.warning
                      : overallDelta.deltaWeight < 0
                      ? colors.success
                      : colors.textMuted,
                },
              ]}
            >
              {overallDelta.deltaWeight > 0
                ? `+${overallDelta.deltaWeight}`
                : `${overallDelta.deltaWeight}`}{' '}
              kg
            </Text>
          </View>

          {/* Cơ xương */}
          {overallDelta.deltaMuscle != null && (
            <View style={styles.deltaPill}>
              <Text style={styles.deltaLabel}>Cơ nạc:</Text>
              <Text
                style={[
                  styles.deltaVal,
                  {
                    color:
                      overallDelta.deltaMuscle > 0
                        ? colors.success
                        : overallDelta.deltaMuscle < 0
                        ? colors.danger
                        : colors.textMuted,
                  },
                ]}
              >
                {overallDelta.deltaMuscle > 0
                  ? `+${overallDelta.deltaMuscle}`
                  : `${overallDelta.deltaMuscle}`}{' '}
                kg
              </Text>
            </View>
          )}

          {/* Tỷ lệ mỡ */}
          {overallDelta.deltaFat != null && (
            <View style={styles.deltaPill}>
              <Text style={styles.deltaLabel}>% Mỡ:</Text>
              <Text
                style={[
                  styles.deltaVal,
                  {
                    color:
                      overallDelta.deltaFat < 0
                        ? colors.success
                        : overallDelta.deltaFat > 0
                        ? colors.danger
                        : colors.textMuted,
                  },
                ]}
              >
                {overallDelta.deltaFat > 0
                  ? `+${overallDelta.deltaFat}`
                  : `${overallDelta.deltaFat}`}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 3. Metric Tabs */}
      <View style={styles.tabsContainer}>
        {TAB_OPTIONS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 4. Legend Indicators */}
      <View style={styles.legendRow}>
        {(activeTab === 'ALL' || activeTab === 'WEIGHT') && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
            <Text style={styles.legendText}>Cân nặng (kg)</Text>
          </View>
        )}
        {(activeTab === 'ALL' || activeTab === 'MUSCLE') && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>Cơ (kg)</Text>
          </View>
        )}
        {(activeTab === 'ALL' || activeTab === 'FAT') && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.legendText}>% Mỡ</Text>
          </View>
        )}
        {(activeTab === 'ALL' || activeTab === 'SCORE') && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9333EA' }]} />
            <Text style={styles.legendText}>Điểm</Text>
          </View>
        )}
      </View>

      {/* 5. SVG Chart Area */}
      <View style={styles.chartWrapper}>
        <Svg width={svgWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={activeMetricColor} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={activeMetricColor} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines and Y axis values */}
          {gridLevels.map((lvl, idx) => {
            const y = paddingTop + lvl * plotHeight;
            const val =
              activeTab === 'ALL'
                ? ''
                : `${Math.round(
                    activeMetricBounds.max - lvl * activeMetricBounds.span
                  )}${activeMetricUnit}`;
            return (
              <G key={`grid_${idx}`}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                {val !== '' && (
                  <SvgText
                    x={paddingLeft - 6}
                    y={y + 3}
                    fill={colors.textMuted}
                    fontSize={9}
                    textAnchor="end"
                    fontWeight="500"
                  >
                    {val}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* X Axis base line */}
          <Line
            x1={paddingLeft}
            y1={chartHeight - paddingBottom}
            x2={svgWidth - paddingRight}
            y2={chartHeight - paddingBottom}
            stroke="#CBD5E1"
            strokeWidth={1}
          />

          {/* Single Metric Gradient Fill Area */}
          {activeTab !== 'ALL' && activeMetricPath !== '' && (
            <Path d={buildAreaD(activeMetricPath)} fill="url(#activeGrad)" />
          )}

          {/* Paths: ALL mode shows all 4 metrics */}
          {activeTab === 'ALL' ? (
            <>
              {scorePath !== '' && (
                <Path d={scorePath} stroke="#9333EA" strokeWidth={2} fill="none" />
              )}
              {fatPath !== '' && (
                <Path d={fatPath} stroke="#D97706" strokeWidth={2} fill="none" />
              )}
              {musclePath !== '' && (
                <Path d={musclePath} stroke="#16A34A" strokeWidth={2.2} fill="none" />
              )}
              {weightPath !== '' && (
                <Path d={weightPath} stroke="#0284C7" strokeWidth={2.5} fill="none" />
              )}
            </>
          ) : (
            <Path
              d={activeMetricPath}
              stroke={activeMetricColor}
              strokeWidth={2.8}
              fill="none"
            />
          )}

          {/* Interactive Dots for Data Points & X Axis Labels */}
          {sorted.map((item, idx) => {
            const x = getX(idx);
            const isSelected = activeIndex === idx;

            // Compute Y position for dots
            let dotY = getYWeight(item.weight);
            if (activeTab === 'MUSCLE') dotY = getYMuscle(item.muscleMass);
            else if (activeTab === 'FAT') dotY = getYFat(item.bodyFatPercentage);
            else if (activeTab === 'SCORE') dotY = getYScore(item.inbodyScore);

            const dotColor =
              activeTab === 'ALL' ? '#0284C7' : activeMetricColor;

            return (
              <G key={`pt_${idx}`}>
                {/* Vertical indicator line for selected index */}
                {isSelected && (
                  <Line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={chartHeight - paddingBottom}
                    stroke={dotColor}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}

                {/* Point circle */}
                <Circle
                  cx={x}
                  cy={dotY}
                  r={isSelected ? 6 : 4}
                  fill={isSelected ? dotColor : '#FFFFFF'}
                  stroke={dotColor}
                  strokeWidth={2}
                />

                {/* Expanded hit area for touch */}
                <Circle
                  cx={x}
                  cy={dotY}
                  r={22}
                  fill="transparent"
                  onPress={() => setSelectedIdx(idx)}
                />

                {/* Date label on X axis */}
                {(sorted.length <= 6 ||
                  idx === 0 ||
                  idx === sorted.length - 1 ||
                  isSelected ||
                  idx % Math.ceil(sorted.length / 5) === 0) && (
                  <SvgText
                    x={x}
                    y={chartHeight - 10}
                    fill={isSelected ? colors.primaryNavy : colors.textMuted}
                    fontSize={9.5}
                    textAnchor="middle"
                    fontWeight={isSelected ? '700' : '500'}
                  >
                    {formatDate(item.measurementDate)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      </View>

      {/* 6. Active Point Inspection Card */}
      {activeRecord && (
        <View style={styles.inspectionCard}>
          <View style={styles.inspectionHeader}>
            <View style={styles.inspectionDateBadge}>
              <Ionicons name="calendar" size={12} color={colors.primary} />
              <Text style={styles.inspectionDateText}>
                Ngày đo: {formatFullDate(activeRecord.measurementDate)}
              </Text>
            </View>
            <Text style={styles.inspectionHint}>
              (Lần {activeIndex + 1}/{sorted.length})
            </Text>
          </View>

          <View style={styles.inspectionMetricsRow}>
            {/* Cân nặng */}
            <View style={styles.inspectionMetricItem}>
              <Text style={styles.inspectionMetricLabel}>Cân nặng</Text>
              <Text style={[styles.inspectionMetricVal, { color: '#0284C7' }]}>
                {activeRecord.weight} kg
              </Text>
            </View>

            {/* Cơ xương */}
            <View style={styles.inspectionMetricItem}>
              <Text style={styles.inspectionMetricLabel}>Cơ nạc</Text>
              <Text style={[styles.inspectionMetricVal, { color: '#16A34A' }]}>
                {activeRecord.muscleMass != null ? `${activeRecord.muscleMass} kg` : '—'}
              </Text>
            </View>

            {/* % Mỡ */}
            <View style={styles.inspectionMetricItem}>
              <Text style={styles.inspectionMetricLabel}>Tỷ lệ mỡ</Text>
              <Text style={[styles.inspectionMetricVal, { color: '#D97706' }]}>
                {activeRecord.bodyFatPercentage != null
                  ? `${activeRecord.bodyFatPercentage}%`
                  : '—'}
              </Text>
            </View>

            {/* Điểm InBody */}
            <View style={styles.inspectionMetricItem}>
              <Text style={styles.inspectionMetricLabel}>Điểm số</Text>
              <Text style={[styles.inspectionMetricVal, { color: '#9333EA' }]}>
                {activeRecord.inbodyScore != null ? activeRecord.inbodyScore : '—'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  deltaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deltaLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  deltaVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  inspectionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 6,
  },
  inspectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inspectionDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inspectionDateText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  inspectionHint: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  inspectionMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inspectionMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  inspectionMetricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  inspectionMetricVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
