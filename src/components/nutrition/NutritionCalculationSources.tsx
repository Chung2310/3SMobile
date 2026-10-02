import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';

const SOURCES = [
  {
    label: 'Công thức BMR — Mifflin et al. (1990)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  {
    label: 'Body Weight Planner — NIDDK',
    url: 'https://www.niddk.nih.gov/bwp',
  },
  {
    label: 'Protein và tập luyện — ISSN (2017)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28642676/',
  },
  {
    label: 'Khoảng phân bố macro (AMDR) — National Academies',
    url: 'https://www.nationalacademies.org/read/10872/chapter/13',
  },
  {
    label: 'Nhu cầu nước và các yếu tố ảnh hưởng — National Academies',
    url: 'https://www.nationalacademies.org/read/10925/chapter/6',
  },
];

async function openSource(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Không mở được liên kết', 'Vui lòng kiểm tra kết nối và thử lại.');
  }
}

export function NutritionCalculationSources() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phương pháp và nguồn tham khảo</Text>
      <Text style={styles.description}>
        Công thức BMR: 10 × cân nặng (kg) + 6,25 × chiều cao (cm) − 5 × tuổi,
        cộng 5 với nam hoặc trừ 161 với nữ [Mifflin, 1990]. Đây là ước tính năng
        lượng lúc nghỉ cho người trưởng thành, không phải phép đo chuyển hóa.
      </Text>
      <Text style={styles.description}>
        BMR được ước tính bằng Mifflin–St Jeor; TDEE bằng BMR nhân hệ số hoạt
        động. Hệ số hoạt động, mức calo theo mục tiêu, macro (đạm 2,0–2,2 g/kg,
        chất béo 25%, carbohydrate còn lại) và nước 40 ml/kg là các preset ước
        tính của 3S. Nguồn bên dưới là tài liệu tham khảo, không xác nhận các
        preset này phù hợp với từng người; riêng nhu cầu nước còn thay đổi theo
        sức khỏe, hoạt động và môi trường.
      </Text>
      <Text style={styles.description}>
        Quy ước mục tiêu của ứng dụng: duy trì bằng TDEE; giảm mỡ lấy TDEE trừ
        450 kcal (giới hạn tính toán 1.200 kcal); tăng cơ lấy TDEE cộng 350 kcal.
        Giới hạn 1.200 kcal không có nghĩa là mức ăn an toàn cho mọi người.
        Đạm và carbohydrate quy đổi 4 kcal/g, chất béo 9 kcal/g. PT cần điều chỉnh
        mục tiêu theo từng người trước khi áp dụng vào thực đơn.
      </Text>

      <View style={styles.sourceList}>
        {SOURCES.map((source) => (
          <Pressable
            key={source.url}
            accessibilityRole="link"
            accessibilityLabel={`Mở nguồn tham khảo: ${source.label}`}
            onPress={() => void openSource(source.url)}
            style={({ pressed }) => [styles.sourceRow, pressed && styles.sourceRowPressed]}
          >
            <Text style={styles.sourceLabel}>{source.label}</Text>
            <ExternalLink size={16} color={colors.primary} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        Kết quả chỉ để tham khảo, không dùng để chẩn đoán hoặc điều trị. Nếu có
        bệnh lý hoặc đang điều trị, hãy hỏi bác sĩ trước khi điều chỉnh dinh dưỡng
        hay vận động.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  sourceList: {
    marginTop: spacing.xs,
  },
  sourceRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sourceRowPressed: {
    opacity: 0.7,
  },
  sourceLabel: {
    flex: 1,
    marginRight: spacing.sm,
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
  },
  disclaimer: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
