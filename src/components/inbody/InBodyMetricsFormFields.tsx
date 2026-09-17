import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export interface InBodyMetricsFormValues {
  weight: string;
  height: string;
  bmi: string;
  bodyFatPercentage: string;
  bodyFatMass: string;
  muscleMass: string;
  bmr: string;
  visceralFatLevel: string;
  inbodyScore: string;
  bodyWater: string;
  boneMineral?: string;
  waistHipRatio: string;
  consultationNotes: string;
}

interface InBodyMetricsFormFieldsProps {
  values: InBodyMetricsFormValues;
  onChangeField: (key: keyof InBodyMetricsFormValues, val: string) => void;
  liveBmiClass?: { label: string; color: string } | null;
  liveFatClass?: { label: string; color: string } | null;
  liveVisceralClass?: { label: string; color: string } | null;
  showBoneMineral?: boolean;
}

export function InBodyMetricsFormFields({
  values,
  onChangeField,
  liveBmiClass,
  liveFatClass,
  liveVisceralClass,
  showBoneMineral = true,
}: InBodyMetricsFormFieldsProps) {
  return (
    <View style={styles.container}>
      {/* Cân nặng & Chiều cao */}
      <View style={styles.twoColRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>
            Cân nặng (kg) <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 68.5"
            placeholderTextColor={colors.textMuted}
            value={values.weight}
            onChangeText={(v) => onChangeField('weight', v)}
          />
        </View>

        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Chiều cao (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 172"
            placeholderTextColor={colors.textMuted}
            value={values.height}
            onChangeText={(v) => onChangeField('height', v)}
          />
        </View>
      </View>

      {/* BMI & % Mỡ cơ thể */}
      <View style={styles.twoColRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <View style={styles.labelWithBadge}>
            <Text style={styles.labelInRow} numberOfLines={1} ellipsizeMode="tail">
              Chỉ số BMI
            </Text>
            {liveBmiClass && (
              <Text
                style={[styles.miniBadge, { color: liveBmiClass.color }]}
                numberOfLines={1}
              >
                {liveBmiClass.label}
              </Text>
            )}
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 22.5"
            placeholderTextColor={colors.textMuted}
            value={values.bmi}
            onChangeText={(v) => onChangeField('bmi', v)}
          />
        </View>

        <View style={[styles.formGroup, { flex: 1 }]}>
          <View style={styles.labelWithBadge}>
            <Text style={styles.labelInRow} numberOfLines={1} ellipsizeMode="tail">
              % Mỡ cơ thể
            </Text>
            {liveFatClass && (
              <Text
                style={[styles.miniBadge, { color: liveFatClass.color }]}
                numberOfLines={1}
              >
                {liveFatClass.label}
              </Text>
            )}
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 18.5"
            placeholderTextColor={colors.textMuted}
            value={values.bodyFatPercentage}
            onChangeText={(v) => onChangeField('bodyFatPercentage', v)}
          />
        </View>
      </View>

      {/* Khối lượng cơ xương (SMM) & Khối lượng mỡ */}
      <View style={styles.twoColRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label} numberOfLines={1}>Cơ xương SMM (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 31.2"
            placeholderTextColor={colors.textMuted}
            value={values.muscleMass}
            onChangeText={(v) => onChangeField('muscleMass', v)}
          />
        </View>

        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label} numberOfLines={1}>Khối lượng mỡ (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 12.8"
            placeholderTextColor={colors.textMuted}
            value={values.bodyFatMass}
            onChangeText={(v) => onChangeField('bodyFatMass', v)}
          />
        </View>
      </View>

      {/* Mỡ nội tạng & BMR */}
      <View style={styles.twoColRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <View style={styles.labelWithBadge}>
            <Text style={styles.labelInRow} numberOfLines={1} ellipsizeMode="tail">
              Mỡ nội tạng
            </Text>
            {liveVisceralClass && (
              <Text
                style={[styles.miniBadge, { color: liveVisceralClass.color }]}
                numberOfLines={1}
              >
                {liveVisceralClass.label}
              </Text>
            )}
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Thang 1-20 (VD: 5)"
            placeholderTextColor={colors.textMuted}
            value={values.visceralFatLevel}
            onChangeText={(v) => onChangeField('visceralFatLevel', v)}
          />
        </View>

        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label} numberOfLines={1}>BMR (kcal)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 1650"
            placeholderTextColor={colors.textMuted}
            value={values.bmr}
            onChangeText={(v) => onChangeField('bmr', v)}
          />
        </View>
      </View>

      {/* Điểm InBody & Nước cơ thể */}
      <View style={styles.twoColRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label} numberOfLines={1}>Điểm InBody</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 78"
            placeholderTextColor={colors.textMuted}
            value={values.inbodyScore}
            onChangeText={(v) => onChangeField('inbodyScore', v)}
          />
        </View>

        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label} numberOfLines={1}>Nước cơ thể (L)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 42.5"
            placeholderTextColor={colors.textMuted}
            value={values.bodyWater}
            onChangeText={(v) => onChangeField('bodyWater', v)}
          />
        </View>
      </View>

      {/* Khoáng xương & WHR (nếu có) */}
      <View style={styles.twoColRow}>
        {showBoneMineral ? (
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label} numberOfLines={1}>Khoáng xương (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="VD: 2.8"
              placeholderTextColor={colors.textMuted}
              value={values.boneMineral || ''}
              onChangeText={(v) => onChangeField('boneMineral', v)}
            />
          </View>
        ) : null}

        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label} numberOfLines={1}>Tỉ lệ eo/hông (WHR)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="VD: 0.85"
            placeholderTextColor={colors.textMuted}
            value={values.waistHipRatio}
            onChangeText={(v) => onChangeField('waistHipRatio', v)}
          />
        </View>
      </View>

      {/* Ghi chú tư vấn của PT */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Ghi chú tư vấn của PT</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="Nhập nhận xét hoặc dặn dò cho học viên..."
          placeholderTextColor={colors.textMuted}
          value={values.consultationNotes}
          onChangeText={(v) => onChangeField('consultationNotes', v)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formGroup: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
    minHeight: 18,
    overflow: 'hidden',
  },
  label: {
    fontWeight: '500',
    fontSize: 12.5,
    color: colors.text,
    marginBottom: 4,
  },
  labelInRow: {
    fontWeight: '500',
    fontSize: 12.5,
    color: colors.text,
    flexShrink: 1,
  },
  miniBadge: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  req: {
    color: colors.danger,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13.5,
    fontWeight: '400',
    color: colors.text,
  },
  textArea: {
    height: 65,
    textAlignVertical: 'top',
  },
});
