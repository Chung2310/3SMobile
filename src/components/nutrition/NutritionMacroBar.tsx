import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import type { MacroNutrients } from '@/types/nutrition';

interface NutritionMacroBarProps {
  targetCalories: number;
  consumedCalories?: number;
  macros: MacroNutrients;
  consumedMacros?: Partial<MacroNutrients>;
  title?: string;
  showSubtitle?: boolean;
}

export function NutritionMacroBar({
  targetCalories,
  consumedCalories,
  macros,
  consumedMacros,
  title = 'Mục tiêu dinh dưỡng',
  showSubtitle = true,
}: NutritionMacroBarProps) {
  const pG = macros.protein || 0;
  const cG = macros.carbs || 0;
  const fG = macros.fat || 0;

  const curCal = consumedCalories != null ? consumedCalories : targetCalories;
  const calPercent = targetCalories > 0 ? Math.min(100, Math.round((curCal / targetCalories) * 100)) : 100;

  const curP = consumedMacros?.protein != null ? consumedMacros.protein : pG;
  const curC = consumedMacros?.carbs != null ? consumedMacros.carbs : cG;
  const curF = consumedMacros?.fat != null ? consumedMacros.fat : fG;

  const pPct = pG > 0 ? Math.min(100, Math.round((curP / pG) * 100)) : 100;
  const cPct = cG > 0 ? Math.min(100, Math.round((curC / cG) * 100)) : 100;
  const fPct = fG > 0 ? Math.min(100, Math.round((curF / fG) * 100)) : 100;

  return (
    <View style={styles.card}>
      {/* Header: Title + Calorie Big Number */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.badgeRow}>
            <Flame size={15} color="#EA580C" />
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {showSubtitle && (
            <Text style={styles.cardSub}>
              {consumedCalories != null
                ? `Đã nạp ${curCal} / ${targetCalories} kcal`
                : 'Mức năng lượng & đa lượng khuyến nghị'}
            </Text>
          )}
        </View>

        <View style={styles.calPill}>
          <Text style={styles.calNumber}>{targetCalories}</Text>
          <Text style={styles.calUnit}>kcal / ngày</Text>
        </View>
      </View>

      {/* Main Calories Progress Bar */}
      {consumedCalories != null && (
        <View style={styles.mainProgressTrack}>
          <View
            style={[
              styles.mainProgressFill,
              {
                width: `${calPercent}%`,
                backgroundColor: calPercent > 105 ? '#EF4444' : colors.primary,
              },
            ]}
          />
        </View>
      )}

      {/* 3 Macro Cards (Protein - Carbs - Fat) */}
      <View style={styles.macroRow}>
        {/* 1. Protein (Đạm) */}
        <View style={[styles.macroCol, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <View style={styles.macroTop}>
            <Text style={[styles.macroLabel, { color: '#1D4ED8' }]}>ĐẠM (P)</Text>
            <Text style={[styles.macroVal, { color: '#1E40AF' }]}>
              {curP}
              {consumedMacros?.protein != null ? `/${pG}` : ''}g
            </Text>
          </View>
          <View style={[styles.macroTrack, { backgroundColor: '#DBEAFE' }]}>
            <View style={[styles.macroFill, { width: `${pPct}%`, backgroundColor: '#2563EB' }]} />
          </View>
          <Text style={[styles.macroKcalSub, { color: '#3B82F6' }]}>{Math.round(pG * 4)} kcal</Text>
        </View>

        {/* 2. Carbs (Tinh bột) */}
        <View style={[styles.macroCol, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <View style={styles.macroTop}>
            <Text style={[styles.macroLabel, { color: '#B45309' }]}>CARB (C)</Text>
            <Text style={[styles.macroVal, { color: '#92400E' }]}>
              {curC}
              {consumedMacros?.carbs != null ? `/${cG}` : ''}g
            </Text>
          </View>
          <View style={[styles.macroTrack, { backgroundColor: '#FEF3C7' }]}>
            <View style={[styles.macroFill, { width: `${cPct}%`, backgroundColor: '#D97706' }]} />
          </View>
          <Text style={[styles.macroKcalSub, { color: '#D97706' }]}>{Math.round(cG * 4)} kcal</Text>
        </View>

        {/* 3. Fat (Chất béo) */}
        <View style={[styles.macroCol, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <View style={styles.macroTop}>
            <Text style={[styles.macroLabel, { color: '#B91C1C' }]}>BÉO (F)</Text>
            <Text style={[styles.macroVal, { color: '#991B1B' }]}>
              {curF}
              {consumedMacros?.fat != null ? `/${fG}` : ''}g
            </Text>
          </View>
          <View style={[styles.macroTrack, { backgroundColor: '#FEE2E2' }]}>
            <View style={[styles.macroFill, { width: `${fPct}%`, backgroundColor: '#DC2626' }]} />
          </View>
          <Text style={[styles.macroKcalSub, { color: '#EF4444' }]}>{Math.round(fG * 9)} kcal</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleCol: {
    flex: 1,
    paddingRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  cardSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  calPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  calNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C2410C',
  },
  calUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EA580C',
  },
  mainProgressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
    marginTop: 2,
  },
  mainProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  macroCol: {
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
  },
  macroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  macroVal: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  macroTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  macroFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroKcalSub: {
    fontSize: 9.5,
    fontWeight: '600',
    textAlign: 'right',
  },
});
