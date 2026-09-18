import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '@/theme';

interface ProgressPieChartProps {
  good: number;
  slow: number;
  poor: number;
  insufficient?: number;
  totalCustomers?: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressPieChart({
  good,
  slow,
  poor,
  insufficient = 0,
  totalCustomers,
  size = 140,
  strokeWidth = 16,
}: ProgressPieChartProps) {
  const insufficientVal =
    insufficient || (totalCustomers != null ? Math.max(0, totalCustomers - (good + slow + poor)) : 0);
  const total = good + slow + poor + insufficientVal;
  const center = size / 2;
  const radiusVal = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusVal;

  const goodRatio = total > 0 ? good / total : 0;
  const slowRatio = total > 0 ? slow / total : 0;
  const poorRatio = total > 0 ? poor / total : 0;
  const insufficientRatio = total > 0 ? insufficientVal / total : 0;

  // Hiệu ứng Animation đổ đầy tròn siêu mượt (Smooth 60fps RequestAnimationFrame)
  const [fillProgress, setFillProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastKeyRef = useRef('');

  const runAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (total === 0) {
      setFillProgress(0);
      return;
    }

    setFillProgress(0);
    const startTime = Date.now();
    const duration = 800; // 800ms dứt khoát, thanh thoát

    const step = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      // Quad ease-out: 1 - (1-p)^2 -> gia tốc êm dịu, không bị khựng hoặc dừng đột ngột ở giữa
      const eased = 1 - (1 - p) * (1 - p);

      setFillProgress(eased);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [total]);

  // Kích hoạt khi tab được focus lại
  useFocusEffect(
    useCallback(() => {
      if (total > 0) {
        runAnimation();
      }
    }, [runAnimation, total])
  );

  // Chỉ kích hoạt khi dữ liệu thực tế thay đổi thực sự (tránh khởi động lại giữa chừng khi query update cùng số liệu)
  const dataKey = `${good}-${slow}-${poor}-${insufficientVal}-${total}`;
  useEffect(() => {
    if (total > 0 && lastKeyRef.current !== dataKey) {
      lastKeyRef.current = dataKey;
      runAnimation();
    }
  }, [dataKey, total, runAnimation]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const currentFill = fillProgress * circumference;

  const goodTarget = goodRatio * circumference;
  const slowTarget = slowRatio * circumference;
  const poorTarget = poorRatio * circumference;
  const insufficientTarget = insufficientRatio * circumference;

  // Chiều dài vệt màu tăng dần tuần tự tạo cảm giác đổ màu liên tục
  const goodDash = Math.min(goodTarget, currentFill);
  const slowDash = Math.max(0, Math.min(slowTarget, currentFill - goodTarget));
  const poorDash = Math.max(0, Math.min(poorTarget, currentFill - (goodTarget + slowTarget)));
  const insufficientDash = Math.max(
    0,
    Math.min(insufficientTarget, currentFill - (goodTarget + slowTarget + poorTarget))
  );

  const goodOffset = 0;
  const slowOffset = -goodTarget;
  const poorOffset = -(goodTarget + slowTarget);
  const insufficientOffset = -(goodTarget + slowTarget + poorTarget);

  const centerScale = 0.85 + 0.15 * fillProgress;
  const centerOpacity = Math.min(1, fillProgress * 1.6);
  const legendOpacity = Math.min(1, fillProgress * 1.4);

  return (
    <View style={styles.container}>
      <View style={[styles.chartWrap, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background ring */}
            <Circle
              cx={center}
              cy={center}
              r={radiusVal}
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {total === 0 ? (
              <Circle
                cx={center}
                cy={center}
                r={radiusVal}
                stroke="#E5E7EB"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
            ) : (
              <>
                {/* 1. Good (Xanh lá) */}
                {goodDash > 0 && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke="#22C55E"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${goodDash} ${circumference}`}
                    strokeDashoffset={goodOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                  />
                )}

                {/* 2. Slow (Vàng cam) */}
                {slowDash > 0 && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke="#F59E0B"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${slowDash} ${circumference}`}
                    strokeDashoffset={slowOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                  />
                )}

                {/* 3. Poor (Đỏ) */}
                {poorDash > 0 && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke="#EF4444"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${poorDash} ${circumference}`}
                    strokeDashoffset={poorOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                  />
                )}

                {/* 4. Insufficient (Thiếu Inbody - Xám xanh Slate) */}
                {insufficientDash > 0 && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke="#94A3B8"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${insufficientDash} ${circumference}`}
                    strokeDashoffset={insufficientOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                  />
                )}
              </>
            )}
          </G>
        </Svg>

        {/* Text ở tâm biểu đồ */}
        <View
          style={[
            styles.centerLabelWrap,
            {
              opacity: centerOpacity,
              transform: [{ scale: centerScale }],
            },
          ]}
        >
          <Text style={styles.centerValue}>{total}</Text>
          <Text style={styles.centerTitle}>Khách hàng</Text>
        </View>
      </View>

      {/* Chú giải ngắn gọn bên cạnh */}
      <View style={[styles.legendContainer, { opacity: legendOpacity }]}>
        {/* Tốt */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.legendLabel}>Tốt</Text>
          <View style={styles.countWrap}>
            <Text style={styles.legendCount}>{good}</Text>
            <Text style={styles.legendPercent}>({total > 0 ? Math.round(goodRatio * 100) : 0}%)</Text>
          </View>
        </View>

        {/* Chậm */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendLabel}>Chậm</Text>
          <View style={styles.countWrap}>
            <Text style={styles.legendCount}>{slow}</Text>
            <Text style={styles.legendPercent}>({total > 0 ? Math.round(slowRatio * 100) : 0}%)</Text>
          </View>
        </View>

        {/* Kém */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendLabel}>Kém</Text>
          <View style={styles.countWrap}>
            <Text style={styles.legendCount}>{poor}</Text>
            <Text style={styles.legendPercent}>({total > 0 ? Math.round(poorRatio * 100) : 0}%)</Text>
          </View>
        </View>

        {/* Thiếu Inbody */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
          <Text style={styles.legendLabel}>Thiếu Inbody</Text>
          <View style={styles.countWrap}>
            <Text style={styles.legendCount}>{insufficientVal}</Text>
            <Text style={styles.legendPercent}>({total > 0 ? Math.round(insufficientRatio * 100) : 0}%)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.text,
  },
  centerTitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  legendContainer: {
    flex: 1,
    marginLeft: spacing.lg,
    justifyContent: 'center',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  legendLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  countWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 68,
  },
  legendCount: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    minWidth: 12,
    marginRight: 4,
    textAlign: 'left',
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
