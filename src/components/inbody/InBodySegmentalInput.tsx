import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { SegmentalMap } from '@/types/inbody';

interface InBodySegmentalInputProps {
  showSegmental: boolean;
  onToggle: () => void;
  segMuscle: Record<keyof SegmentalMap, string>;
  setSegMuscle: React.Dispatch<React.SetStateAction<Record<keyof SegmentalMap, string>>>;
  segFat: Record<keyof SegmentalMap, string>;
  setSegFat: React.Dispatch<React.SetStateAction<Record<keyof SegmentalMap, string>>>;
}

export function InBodySegmentalInput({
  showSegmental,
  onToggle,
  segMuscle,
  setSegMuscle,
  segFat,
  setSegFat,
}: InBodySegmentalInputProps) {
  return (
    <View>
      <Pressable style={styles.accordionHeader} onPress={onToggle}>
        <View style={styles.accordionTitleRow}>
          <Ionicons name="body-outline" size={17} color={colors.primary} />
          <Text style={styles.accordionTitle}>
            Phân bố cơ & mỡ từng phần (Tùy chọn)
          </Text>
        </View>
        <Ionicons
          name={showSegmental ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {showSegmental && (
        <View style={styles.segmentalSection}>
          <Text style={styles.subSectionTitle}>Khối lượng Cơ 5 vùng (kg):</Text>
          <View style={styles.threeColRow}>
            <View style={styles.miniCol}>
              <Text style={styles.miniLabel}>Tay Phải</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segMuscle.rightArm}
                onChangeText={(v) => setSegMuscle((p) => ({ ...p, rightArm: v }))}
              />
            </View>
            <View style={styles.miniCol}>
              <Text style={styles.miniLabel}>Thân mình</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segMuscle.trunk}
                onChangeText={(v) => setSegMuscle((p) => ({ ...p, trunk: v }))}
              />
            </View>
            <View style={styles.miniCol}>
              <Text style={styles.miniLabel}>Tay Trái</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segMuscle.leftArm}
                onChangeText={(v) => setSegMuscle((p) => ({ ...p, leftArm: v }))}
              />
            </View>
          </View>
          <View style={styles.twoColRow}>
            <View style={styles.halfCol}>
              <Text style={styles.miniLabel}>Chân Phải</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segMuscle.rightLeg}
                onChangeText={(v) => setSegMuscle((p) => ({ ...p, rightLeg: v }))}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.miniLabel}>Chân Trái</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segMuscle.leftLeg}
                onChangeText={(v) => setSegMuscle((p) => ({ ...p, leftLeg: v }))}
              />
            </View>
          </View>

          <Text style={[styles.subSectionTitle, { marginTop: spacing.sm }]}>
            Khối lượng Mỡ 5 vùng (kg):
          </Text>
          <View style={styles.threeColRow}>
            <View style={styles.miniCol}>
              <Text style={styles.miniLabel}>Tay Phải</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segFat.rightArm}
                onChangeText={(v) => setSegFat((p) => ({ ...p, rightArm: v }))}
              />
            </View>
            <View style={styles.miniCol}>
              <Text style={styles.miniLabel}>Thân mình</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segFat.trunk}
                onChangeText={(v) => setSegFat((p) => ({ ...p, trunk: v }))}
              />
            </View>
            <View style={styles.miniCol}>
              <Text style={styles.miniLabel}>Tay Trái</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segFat.leftArm}
                onChangeText={(v) => setSegFat((p) => ({ ...p, leftArm: v }))}
              />
            </View>
          </View>
          <View style={styles.twoColRow}>
            <View style={styles.halfCol}>
              <Text style={styles.miniLabel}>Chân Phải</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segFat.rightLeg}
                onChangeText={(v) => setSegFat((p) => ({ ...p, rightLeg: v }))}
              />
            </View>
            <View style={styles.halfCol}>
              <Text style={styles.miniLabel}>Chân Trái</Text>
              <TextInput
                style={styles.miniInput}
                keyboardType="numeric"
                value={segFat.leftLeg}
                onChangeText={(v) => setSegFat((p) => ({ ...p, leftLeg: v }))}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceIce,
    padding: 10,
    borderRadius: radius.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionTitle: {
    fontWeight: '600',
    fontSize: 12.5,
    color: colors.primaryNavy,
  },
  segmentalSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.sm,
  },
  subSectionTitle: {
    fontWeight: '600',
    fontSize: 11.5,
    color: colors.primaryNavy,
    marginBottom: 4,
  },
  threeColRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniCol: {
    flex: 1,
  },
  halfCol: {
    flex: 1,
    marginBottom: spacing.xs,
  },
  miniLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  miniInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '400',
    color: colors.text,
  },
});
