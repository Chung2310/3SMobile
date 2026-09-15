import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, radius, spacing, typography } from '@/theme';

interface ProgressPieChartProps {
  good: number;
  slow: number;
  poor: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressPieChart({
  good,
  slow,
  poor,
  size = 140,
  strokeWidth = 16,
}: ProgressPieChartProps) {
  const total = good + slow + poor;
  const center = size / 2;
  const radiusVal = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusVal;

  const goodRatio = total > 0 ? good / total : 0;
  const slowRatio = total > 0 ? slow / total : 0;
  const poorRatio = total > 0 ? poor / total : 0;

  const goodDash = goodRatio * circumference;
  const slowDash = slowRatio * circumference;
  const poorDash = poorRatio * circumference;

  const goodOffset = 0;
  const slowOffset = -goodDash;
  const poorOffset = -(goodDash + slowDash);

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
                {good > 0 && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke="#22C55E"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${goodDash} ${circumference}`}
                    strokeDashoffset={goodOffset}
                    strokeLinecap={total === good ? 'butt' : 'round'}
                    fill="transparent"
                  />
                )}

                {/* 2. Slow (Vàng cam) */}
                {slow > 0 && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke="#F59E0B"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${slowDash} ${circumference}`}
                    strokeDashoffset={slowOffset}
                    strokeLinecap={total === slow ? 'butt' : 'round'}
                    fill="transparent"
                  />
                )}

                {/* 3. Poor (Đỏ) */}
                {poor > 0 && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={radiusVal}
                    stroke="#EF4444"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${poorDash} ${circumference}`}
                    strokeDashoffset={poorOffset}
                    strokeLinecap={total === poor ? 'butt' : 'round'}
                    fill="transparent"
                  />
                )}
              </>
            )}
          </G>
        </Svg>

        {/* Text ở tâm biểu đồ */}
        <View style={styles.centerLabelWrap}>
          <Text style={styles.centerValue}>{total}</Text>
          <Text style={styles.centerTitle}>Khách hàng</Text>
        </View>
      </View>

      {/* Chú giải ngắn gọn bên cạnh */}
      <View style={styles.legendContainer}>
        {/* Tốt */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <View style={styles.legendTextWrap}>
            <Text style={styles.legendLabel}>Tiến bộ tốt</Text>
            <Text style={styles.legendCount}>
              {good} <Text style={styles.legendPercent}>({total > 0 ? Math.round(goodRatio * 100) : 0}%)</Text>
            </Text>
          </View>
        </View>

        {/* Chậm */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <View style={styles.legendTextWrap}>
            <Text style={styles.legendLabel}>Tiến bộ chậm</Text>
            <Text style={styles.legendCount}>
              {slow} <Text style={styles.legendPercent}>({total > 0 ? Math.round(slowRatio * 100) : 0}%)</Text>
            </Text>
          </View>
        </View>

        {/* Kém */}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <View style={styles.legendTextWrap}>
            <Text style={styles.legendLabel}>Kết quả kém</Text>
            <Text style={styles.legendCount}>
              {poor} <Text style={styles.legendPercent}>({total > 0 ? Math.round(poorRatio * 100) : 0}%)</Text>
            </Text>
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
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
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
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  legendTextWrap: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
  },
  legendCount: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  legendPercent: {
    fontWeight: '400',
    color: colors.textMuted,
  },
});
