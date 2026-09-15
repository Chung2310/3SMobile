import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card, PrimaryButton, Row } from '@/components/UI';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { useJourney } from '@/context/JourneyContext';
import { asRecord, getDisplayName, readText } from '@/services/journey';
import { colors, spacing, typography } from '@/theme';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { journey } = useJourney();
  const customer = asRecord(journey?.customer);
  const displayName = getDisplayName(journey, session?.user);

  async function handleSignOut() {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void signOut().then(() => router.replace('/(auth)/login')) },
    ]);
  }

  return (
    <Screen title="Hồ sơ" subtitle="Thông tin tài khoản và hồ sơ hội viên.">
      <Card tone="primary">
        <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text></View>
        <Text style={styles.heroName}>{displayName}</Text>
        <Text style={styles.heroRole}>{readText(session?.user, ['role'], 'CUSTOMER')}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <Row label="Tên đăng nhập" value={readText(session?.user, ['username'], 'Chưa cập nhật')} icon="@" />
        <Row label="Email" value={readText(customer, ['email'], readText(session?.user, ['email'], 'Chưa cập nhật'))} icon="✉" />
        <Row label="Số điện thoại" value={readText(customer, ['phone', 'phoneNumber'], 'Chưa cập nhật')} icon="⌕" />
        <Row label="Mục tiêu" value={readText(customer, ['goal', 'target', 'fitnessGoal'], 'Chưa cập nhật')} icon="◎" />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        <Text style={styles.description}>Dữ liệu được đồng bộ trực tiếp với hệ thống 3S Gym.</Text>
        <PrimaryButton label="Đăng xuất" onPress={() => void handleSignOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '800', color: colors.textOnPrimary },
  heroName: { ...typography.title, color: colors.textOnPrimary, marginTop: spacing.md },
  heroRole: { ...typography.caption, color: '#B9DDF0', marginTop: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.primary, marginBottom: spacing.sm },
  description: { ...typography.body, color: colors.textMuted },
});
