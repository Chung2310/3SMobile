import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography } from '@/theme';
import type { PtCustomerSummary } from '@/types/domain';

const MASCOT_HELLO = require('../../assets/public/3s-hello.png');

interface TopPerformersPodiumProps {
  customers: PtCustomerSummary[];
}

export function TopPerformersPodium({ customers }: TopPerformersPodiumProps) {
  // Sắp xếp lấy top 3 người có điểm tiến bộ cao nhất
  const sorted = [...customers]
    .filter((c) => (c.score ?? 0) > 0 || c.dataStatus === 'READY')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);

  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  // Animation values cho 3 cột bục vinh danh
  const animSecond = useRef(new Animated.Value(0)).current;
  const animFirst = useRef(new Animated.Value(0)).current;
  const animThird = useRef(new Animated.Value(0)).current;

  const runAnimation = useCallback(() => {
    animSecond.stopAnimation();
    animFirst.stopAnimation();
    animThird.stopAnimation();

    animSecond.setValue(0);
    animFirst.setValue(0);
    animThird.setValue(0);

    // Hiệu ứng tăng cột lần lượt: Cột 2 và 3 dâng lên trước, sau đó Cột 1 (Top 1) vút lên cao nhất với độ nảy thể thao
    Animated.stagger(140, [
      Animated.timing(animSecond, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.back(1.15)),
        useNativeDriver: false,
      }),
      Animated.timing(animThird, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.15)),
        useNativeDriver: false,
      }),
      Animated.timing(animFirst, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.back(1.35)),
        useNativeDriver: false,
      }),
    ]).start();
  }, [animFirst, animSecond, animThird]);

  useFocusEffect(
    useCallback(() => {
      runAnimation();
    }, [runAnimation])
  );

  useEffect(() => {
    runAnimation();
  }, [customers.length, runAnimation]);

  useEffect(() => {
    return () => {
      animSecond.stopAnimation();
      animFirst.stopAnimation();
      animThird.stopAnimation();
    };
  }, [animFirst, animSecond, animThird]);

  if (sorted.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.subTagText}>XUẤT SẮC TUẦN</Text>
            <Text style={styles.title}>KẾT QUẢ NỔI BẬT</Text>
            <Text style={styles.subtitle}>Bắt đầu ghi nhận buổi tập để vinh danh 3 khách hàng bứt phá nhất</Text>
          </View>
          <Image source={MASCOT_HELLO} style={styles.mascot} resizeMode="contain" />
        </View>
      </View>
    );
  }

  // Chiều cao cột tăng dần từ 0 đến kích thước chuẩn
  const heightSecond = animSecond.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 65],
  });
  const heightFirst = animFirst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 90],
  });
  const heightThird = animThird.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  // Hiệu ứng mờ dần hiện rõ của điểm và vương miện
  const opacitySecond = animSecond.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });
  const opacityFirst = animFirst.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.6, 1],
  });
  const opacityThird = animThird.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  const crownScale = animFirst.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.5, 0.8, 1],
  });

  // Helper lấy tên ngắn (1-2 từ) để không tràn cột
  function shortName(fullName: string) {
    const parts = fullName.trim().split(' ');
    if (parts.length <= 2) return fullName;
    return `${parts.at(-2)} ${parts.at(-1)}`;
  }

  function formatChange(c?: PtCustomerSummary) {
    if (!c?.changes) return `${c?.score ?? 0} điểm`;
    if (c.changes.bodyFatChange > 0) return `-${c.changes.bodyFatChange}% mỡ`;
    if (c.changes.muscleChange > 0) return `+${c.changes.muscleChange}kg cơ`;
    return `${c.score ?? 0} điểm`;
  }

  return (
    <View style={styles.card}>
      {/* Header với linh vật 3S cổ vũ */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.subTagText}>XUẤT SẮC TUẦN</Text>
          <Text style={styles.title}>KẾT QUẢ NỔI BẬT</Text>
          <Text style={styles.subtitle}>3 khách hàng bứt phá phong độ nhất</Text>
        </View>

        {/* Mascot 3S Thumbs up */}
        <Image source={MASCOT_HELLO} style={styles.mascot} resizeMode="contain" />
      </View>

      {/* Bục vinh danh 3 cột (Podium: #2 - #1 - #3) */}
      <View style={styles.podiumContainer}>
        {/* Hạng 2 (Bên trái) */}
        {second ? (
          <View style={styles.columnWrapper}>
            <Animated.Text style={[styles.scoreText, { opacity: opacitySecond }]}>
              {second.score ?? 0}đ
            </Animated.Text>
            <Animated.View style={[styles.bar, styles.barSecond, { height: heightSecond }]}>
              <View style={[styles.rankBadge, styles.rankBadgeSecond]}>
                <Text style={styles.rankNum}>2</Text>
              </View>
            </Animated.View>
            <Animated.View style={{ opacity: opacitySecond, alignItems: 'center' }}>
              <Text style={styles.customerName} numberOfLines={1}>
                {shortName(second.fullName)}
              </Text>
              <Text style={styles.changeText} numberOfLines={1}>
                {formatChange(second)}
              </Text>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.columnWrapper} />
        )}

        {/* Hạng 1 (Ở giữa - Cao nhất & Nổi bật nhất) */}
        {first ? (
          <View style={styles.columnWrapper}>
            <Animated.View
              style={[
                styles.crownBadge,
                {
                  opacity: opacityFirst,
                  transform: [{ scale: crownScale }],
                },
              ]}
            >
              <Text style={styles.crownText}>TOP 1</Text>
            </Animated.View>
            <Animated.Text style={[styles.scoreText, styles.scoreFirst, { opacity: opacityFirst }]}>
              {first.score ?? 0}đ
            </Animated.Text>
            <Animated.View style={[styles.bar, styles.barFirst, { height: heightFirst }]}>
              <View style={[styles.rankBadge, styles.rankBadgeFirst]}>
                <Text style={styles.rankNumFirst}>1</Text>
              </View>
            </Animated.View>
            <Animated.View style={{ opacity: opacityFirst, alignItems: 'center' }}>
              <Text style={[styles.customerName, styles.customerNameFirst]} numberOfLines={1}>
                {shortName(first.fullName)}
              </Text>
              <Text style={[styles.changeText, styles.changeTextFirst]} numberOfLines={1}>
                {formatChange(first)}
              </Text>
            </Animated.View>
          </View>
        ) : null}

        {/* Hạng 3 (Bên phải) */}
        {third ? (
          <View style={styles.columnWrapper}>
            <Animated.Text style={[styles.scoreText, { opacity: opacityThird }]}>
              {third.score ?? 0}đ
            </Animated.Text>
            <Animated.View style={[styles.bar, styles.barThird, { height: heightThird }]}>
              <View style={[styles.rankBadge, styles.rankBadgeThird]}>
                <Text style={styles.rankNum}>3</Text>
              </View>
            </Animated.View>
            <Animated.View style={{ opacity: opacityThird, alignItems: 'center' }}>
              <Text style={styles.customerName} numberOfLines={1}>
                {shortName(third.fullName)}
              </Text>
              <Text style={styles.changeText} numberOfLines={1}>
                {formatChange(third)}
              </Text>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.columnWrapper} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  subTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  mascot: {
    width: 80,
    height: 80,
    transform: [{ rotate: '4deg' }],
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  columnWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  crownBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  crownText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },
  scoreFirst: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16A34A',
  },
  bar: {
    width: '100%',
    maxWidth: 76,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    paddingTop: 6,
    overflow: 'hidden',
  },
  barFirst: {
    backgroundColor: '#22C55E',
  },
  barSecond: {
    backgroundColor: '#3B82F6',
  },
  barThird: {
    backgroundColor: '#94A3B8',
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeFirst: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  rankBadgeSecond: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  rankBadgeThird: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  rankNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  rankNumFirst: {
    fontSize: 13,
    fontWeight: '900',
    color: '#16A34A',
  },
  customerName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  customerNameFirst: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  changeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
  changeTextFirst: {
    color: '#16A34A',
    fontWeight: '600',
  },
});
