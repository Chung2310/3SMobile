import { useState, useEffect } from 'react';
import { Text, View, Pressable, ScrollView, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Polyline, Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '@/theme';
import { dayKey, metricSeries } from '@/services/progress';
import { readText, formatDate } from '@/services/journey';
import type { JsonRecord } from '@/types/domain';
import { Button, Notice } from '../workouts/Controls';

export function MetricChart({ records, metric, unit }: { records: JsonRecord[]; metric: string; unit: string }) {
  const points = metricSeries(records, metric);
  const [animVal] = useState(() => new Animated.Value(0));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    animVal.setValue(0);
    const id = animVal.addListener(({ value }) => {
      setProgress(value);
    });
    Animated.timing(animVal, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animVal.removeListener(id);
    };
  }, [metric, records, animVal]);

  if (!points.length) return <Notice text="Chưa có số đo cho chỉ số này." />;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latestValue = values[values.length - 1];
  const firstValue = values[0];
  const diff = points.length > 1 ? Number((latestValue - firstValue).toFixed(1)) : 0;

  const first = Date.parse(points[0].date);
  const last = Date.parse(points[points.length - 1].date);
  const timeSpan = last - first || 1;

  const plot = points.map((p, index) => {
    const x = points.length === 1 ? 160 : 30 + ((Date.parse(p.date) - first) / timeSpan) * 260;
    const valueRange = max - min || 1;
    const y = points.length === 1 ? 80 : 130 - ((p.value - min) / valueRange) * 90;
    return { x, y, val: p.value, date: p.date, index };
  });

  const animatedPlot = plot.map((p, i) => {
    const staggerDelay = plot.length > 1 ? (i / (plot.length - 1)) * 0.35 : 0;
    const pointProgress = Math.min(1, Math.max(0, (progress - staggerDelay) / 0.65));
    const currentY = 140 - (140 - p.y) * pointProgress;
    return {
      ...p,
      x: p.x,
      y: currentY,
      progress: pointProgress,
    };
  });

  const areaPoints =
    animatedPlot.length > 1
      ? [
          ...animatedPlot.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
          `${animatedPlot[animatedPlot.length - 1].x.toFixed(1)},140`,
          `${animatedPlot[0].x.toFixed(1)},140`,
        ].join(' ')
      : '';

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.statLeft}>
          <Text style={styles.chartBadge}>Chỉ số mới nhất</Text>
          <View style={styles.valueRow}>
            <Text numberOfLines={1} style={styles.heroNumber}>{latestValue}</Text>
            <Text style={styles.unitText}>{unit}</Text>
            {points.length > 1 && (
              <View style={[styles.diffBadge, diff < 0 ? styles.diffDown : styles.diffUp]}>
                <Text style={[styles.diffText, diff < 0 ? styles.diffTextDown : styles.diffTextUp]}>
                  {diff > 0 ? `+${diff}` : `${diff}`} {unit}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rangePill}>
          <Text style={styles.rangeText}>Thấp: {min} {unit}</Text>
          <Text style={styles.rangeText}>Cao: {max} {unit}</Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`Biểu đồ gồm ${points.length} số đo, từ ${values[0]} đến ${latestValue} ${unit}`}
        style={styles.svgContainer}
      >
        <Svg width="100%" height={150} viewBox="0 0 320 150">
          <Defs>
            <LinearGradient id="metricChartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>
          {/* Background guide lines */}
          <Line x1={20} y1={40} x2={300} y2={40} stroke={colors.borderSoft} strokeDasharray="4 4" strokeWidth={1} />
          <Line x1={20} y1={85} x2={300} y2={85} stroke={colors.borderSoft} strokeDasharray="4 4" strokeWidth={1} />
          <Line x1={20} y1={130} x2={300} y2={130} stroke={colors.border} strokeWidth={1} />

          {/* Area gradient under line */}
          {animatedPlot.length > 1 && (
            <Polygon points={areaPoints} fill="url(#metricChartGrad)" />
          )}

          {/* Polyline line chart */}
          {points.length > 1 && (
            <Polyline
              points={animatedPlot.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={colors.primary}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {animatedPlot.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === plot.length - 1 ? 6 : 4.5}
              fill={i === plot.length - 1 ? colors.primary : '#FFFFFF'}
              stroke={colors.primary}
              strokeWidth={2.5}
            />
          ))}
        </Svg>
      </View>

      <View style={styles.chartFooter}>
        <Text numberOfLines={1} style={styles.footerDate}>
          {formatDate(points[0].date)}
        </Text>
        {points.length > 1 ? (
          <Text numberOfLines={1} style={styles.footerDate}>
            {formatDate(points[points.length - 1].date)} ({points.length} lần đo)
          </Text>
        ) : (
          <Text style={styles.footerHint}>Thêm lần đo tiếp theo để thấy biểu đồ xu hướng</Text>
        )}
      </View>
    </View>
  );
}

export function SessionCalendar({
  sessions,
  selected,
  onSelect,
}: {
  sessions: JsonRecord[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const offset = (month.getDay() + 6) % 7;
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = new Set(sessions.map((s) => dayKey(readText(s, ['performedAt']))));
  const todayKey = dayKey(new Date());

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Button
          secondary
          icon="chevron-left"
          label="Trước"
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        />
        <Text style={styles.monthTitle}>
          Tháng {month.getMonth() + 1} / {month.getFullYear()}
        </Text>
        <Button
          secondary
          icon="chevron-right"
          label="Sau"
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 308, flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', paddingBottom: 4 }}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
              <Text key={d} style={styles.weekdayHeader}>{d}</Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: offset + total }, (_, i) => {
              const number = i - offset + 1;
              const key = dayKey(new Date(month.getFullYear(), month.getMonth(), number));
              if (number < 1) {
                return <View key={i} style={{ width: '14.2857%', height: 46 }} />;
              }
              const isSelected = selected === key;
              const hasSession = days.has(key);
              const isToday = todayKey === key;

              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${key}${hasSession ? ', có buổi tập' : ''}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelect(isSelected ? '' : key)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                    pressed && !isSelected && { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Text style={[
                    styles.dayNumber,
                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                    isToday && !isSelected && { color: colors.primary, fontWeight: '700' },
                  ]}>
                    {number}
                  </Text>
                  {hasSession && (
                    <View style={[
                      styles.sessionDot,
                      isSelected && { backgroundColor: '#FFFFFF' },
                    ]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.calendarLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.sessionDot, { width: 6, height: 6 }]} />
          <Text style={styles.legendText}>Có buổi tập</Text>
        </View>
        {selected ? (
          <Button secondary label="Xem tất cả ngày" onPress={() => onSelect('')} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statLeft: {
    gap: 4,
  },
  chartBadge: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroNumber: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  diffUp: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  diffDown: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  diffText: {
    fontSize: 12,
    fontWeight: '700',
  },
  diffTextUp: {
    color: colors.danger,
  },
  diffTextDown: {
    color: colors.success,
  },
  rangePill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
    gap: 2,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 10,
  },
  footerDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footerHint: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
  },
  weekdayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dayCell: {
    width: '14.2857%',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  sessionDot: {
    height: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
