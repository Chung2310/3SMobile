import { useState, useEffect } from 'react';
import { Text, View, Pressable, ScrollView, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Path, Defs, LinearGradient, Stop, Rect, Text as SvgText, G } from 'react-native-svg';
import { colors, typography } from '@/theme';
import { dayKey, metricSeries } from '@/services/progress';
import { readText, formatDate } from '@/services/journey';
import type { JsonRecord } from '@/types/domain';
import { Button, Notice } from '../workouts/Controls';

function createSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

function createAreaPath(pts: { x: number; y: number }[], baseY = 140): string {
  if (pts.length < 2) return '';
  const lineD = createSmoothPath(pts);
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${lineD} L ${last.x.toFixed(1)} ${baseY} L ${first.x.toFixed(1)} ${baseY} Z`;
}

export function MetricChart({ records, metric, unit }: { records: JsonRecord[]; metric: string; unit: string }) {
  const points = metricSeries(records, metric);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [animVal] = useState(() => new Animated.Value(0));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [translateYAnim] = useState(() => new Animated.Value(8));
  const [heroScaleAnim] = useState(() => new Animated.Value(1));
  const [progress, setProgress] = useState(0);

  // Entrance wave animation
  useEffect(() => {
    animVal.setValue(0);
    const id = animVal.addListener(({ value }) => {
      setProgress(value);
    });
    Animated.timing(animVal, {
      toValue: 1,
      duration: 800,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();

    return () => {
      animVal.removeListener(id);
    };
  }, [metric, records, animVal]);

  // Card fade & slide entrance
  useEffect(() => {
    fadeAnim.setValue(0);
    translateYAnim.setValue(8);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [metric, fadeAnim, translateYAnim]);

  // Hero number spring bounce on selection or metric change
  useEffect(() => {
    heroScaleAnim.setValue(0.92);
    Animated.spring(heroScaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [selectedDate, metric, heroScaleAnim]);

  if (!points.length) return <Notice text="Chưa có số đo cho chỉ số này." />;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const firstValue = values[0];

  const foundIdx = selectedDate ? points.findIndex((p) => p.date === selectedDate) : -1;
  const activeIndex = foundIdx !== -1 ? foundIdx : points.length - 1;
  const activeItem = points[activeIndex];
  const isInspecting = foundIdx !== -1 && foundIdx !== points.length - 1;

  const diff = points.length > 1 ? Number((activeItem.value - firstValue).toFixed(1)) : 0;

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
    const staggerDelay = plot.length > 1 ? (i / (plot.length - 1)) * 0.25 : 0;
    const pointProgress = Math.min(1, Math.max(0, (progress - staggerDelay) / 0.75));
    const currentY = 140 - (140 - p.y) * pointProgress;
    return {
      ...p,
      x: p.x,
      y: currentY,
      progress: pointProgress,
    };
  });

  const activePoint = animatedPlot[activeIndex] || animatedPlot[animatedPlot.length - 1];
  const areaPathString = createAreaPath(animatedPlot, 140);
  const linePathString = createSmoothPath(animatedPlot);

  const tooltipX = Math.max(45, Math.min(275, activePoint.x));
  const tooltipY = activePoint.y < 45 ? activePoint.y + 26 : activePoint.y - 20;

  return (
    <Animated.View style={[styles.chartCard, { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }]}>
      <View style={styles.chartHeader}>
        <View style={styles.statLeft}>
          <View style={styles.headerLabelRow}>
            <Text style={styles.chartBadge}>
              {isInspecting ? `Đo ngày ${formatDate(activeItem.date)}` : 'Chỉ số mới nhất'}
            </Text>
            {isInspecting && (
              <Pressable
                onPress={() => setSelectedDate(null)}
                style={styles.resetBtn}
                accessibilityRole="button"
                accessibilityLabel="Xem chỉ số mới nhất"
              >
                <Text style={styles.resetBtnText}>Mới nhất</Text>
              </Pressable>
            )}
          </View>

          <Animated.View style={[styles.valueRow, { transform: [{ scale: heroScaleAnim }] }]}>
            <Text numberOfLines={1} style={styles.heroNumber}>{activeItem.value}</Text>
            <Text style={styles.unitText}>{unit}</Text>
            {points.length > 1 && (
              <View style={[styles.diffBadge, diff < 0 ? styles.diffDown : styles.diffUp]}>
                <Text style={[styles.diffText, diff < 0 ? styles.diffTextDown : styles.diffTextUp]}>
                  {diff > 0 ? `+${diff}` : `${diff}`} {unit}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        <View style={styles.rangePill}>
          <Text style={styles.rangeText}>Thấp: {min} {unit}</Text>
          <Text style={styles.rangeText}>Cao: {max} {unit}</Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`Biểu đồ gồm ${points.length} số đo, từ ${values[0]} đến ${activeItem.value} ${unit}`}
        style={styles.svgContainer}
      >
        <Svg width="100%" height={150} viewBox="0 0 320 150">
          <Defs>
            <LinearGradient id="metricChartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.25} />
              <Stop offset="80%" stopColor={colors.primary} stopOpacity={0.04} />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Background guide lines */}
          <Line x1={20} y1={40} x2={300} y2={40} stroke={colors.borderSoft} strokeDasharray="4 4" strokeWidth={1} />
          <Line x1={20} y1={85} x2={300} y2={85} stroke={colors.borderSoft} strokeDasharray="4 4" strokeWidth={1} />
          <Line x1={20} y1={130} x2={300} y2={130} stroke={colors.border} strokeWidth={1} />

          {/* Area gradient under line */}
          {animatedPlot.length > 1 && areaPathString ? (
            <Path d={areaPathString} fill="url(#metricChartGrad)" />
          ) : null}

          {/* Smooth curved line chart */}
          {points.length > 1 && linePathString ? (
            <Path
              d={linePathString}
              fill="none"
              stroke={colors.primary}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Active point vertical guideline & tooltip */}
          {activePoint && points.length > 1 && (
            <G>
              <Line
                x1={activePoint.x}
                y1={35}
                x2={activePoint.x}
                y2={130}
                stroke={colors.primary}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                opacity={0.6}
              />
              <Rect
                x={tooltipX - 40}
                y={tooltipY - 12}
                width={80}
                height={22}
                rx={11}
                fill={colors.text}
                opacity={0.92}
              />
              <SvgText
                x={tooltipX}
                y={tooltipY + 3}
                fontSize={10}
                fontWeight="700"
                fill="#FFFFFF"
                textAnchor="middle"
              >
                {activeItem.value} {unit}
              </SvgText>
            </G>
          )}

          {/* Regular Points */}
          {animatedPlot.map((p, i) => {
            if (i === activeIndex) return null;
            return (
              <Circle
                key={`pt-${i}`}
                cx={p.x}
                cy={p.y}
                r={4}
                fill="#FFFFFF"
                stroke={colors.primary}
                strokeWidth={2}
              />
            );
          })}

          {/* Active Highlight Point with halo */}
          {activePoint && (
            <G>
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={13}
                fill={colors.primary}
                opacity={0.16}
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={7.5}
                fill="#FFFFFF"
                stroke={colors.primary}
                strokeWidth={3}
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={3.5}
                fill={colors.primary}
              />
            </G>
          )}

          {/* Hit targets for easy finger tapping */}
          {animatedPlot.map((p, i) => (
            <Rect
              key={`hit-${i}`}
              x={Math.max(0, p.x - 20)}
              y={0}
              width={40}
              height={150}
              fill="transparent"
              onPress={() => setSelectedDate(p.date)}
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
          <Text numberOfLines={2} style={styles.footerHint}>
            Thêm lần đo tiếp theo để thấy biểu đồ xu hướng
          </Text>
        )}
      </View>
    </Animated.View>
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
  headerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 10,
  },
  footerDate: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  footerHint: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    flexShrink: 1,
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
