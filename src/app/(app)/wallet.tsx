import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionHeader } from '@/components/UI';
import { colors, radius, spacing, typography } from '@/theme';

interface Transaction {
  id: string;
  title: string;
  customerName: string;
  amount: string;
  type: 'PLUS' | 'MINUS';
  date: string;
  status: 'SUCCESS' | 'PENDING';
}

const TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Hoa hồng buổi tập 1:1',
    customerName: 'Trần Minh Hoàng',
    amount: '+350.000 đ',
    type: 'PLUS',
    date: 'Hôm nay, 10:30',
    status: 'SUCCESS',
  },
  {
    id: 'tx-2',
    title: 'Hoa hồng gói 24 buổi',
    customerName: 'Lê Thu Hà',
    amount: '+2.400.000 đ',
    type: 'PLUS',
    date: '14/09/2026',
    status: 'SUCCESS',
  },
  {
    id: 'tx-3',
    title: 'Hoa hồng buổi tập 1:1',
    customerName: 'Nguyễn Văn Nam',
    amount: '+350.000 đ',
    type: 'PLUS',
    date: '13/09/2026',
    status: 'SUCCESS',
  },
  {
    id: 'tx-4',
    title: 'Rút tiền về tài khoản ngân hàng',
    customerName: 'MB Bank (*8899)',
    amount: '-5.000.000 đ',
    type: 'MINUS',
    date: '10/09/2026',
    status: 'SUCCESS',
  },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [balance] = useState('12.850.000 đ');
  const [monthlyIncome] = useState('18.200.000 đ');

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header with Back Button */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.navigate('/(app)/(tabs)')}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityLabel="Quay lại"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Ví & Thu nhập</Text>
          <Text style={styles.pageSubtitle}>Quản lý thù lao huấn luyện viên</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
      >
        {/* Thẻ số dư ví chính */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletLabel}>SỐ DƯ KHẢ DỤNG</Text>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>ĐÃ XÁC THỰC</Text>
            </View>
          </View>
          <Text style={styles.balanceText}>{balance}</Text>

          <View style={styles.divider} />

          <View style={styles.incomeRow}>
            <View>
              <Text style={styles.subLabel}>Thu nhập tháng 09</Text>
              <Text style={styles.subAmount}>{monthlyIncome}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.withdrawBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {}}
            >
              <Text style={styles.withdrawBtnText}>Rút tiền</Text>
            </Pressable>
          </View>
        </View>

        <SectionHeader title="Lịch sử giao dịch" />

        {TRANSACTIONS.map((tx) => (
          <Card key={tx.id}>
            <View style={styles.txRow}>
              <View
                style={[
                  styles.txIconWrap,
                  tx.type === 'PLUS' ? styles.txPlus : styles.txMinus,
                ]}
              >
                <Feather
                  name={tx.type === 'PLUS' ? 'arrow-down-left' : 'arrow-up-right'}
                  size={18}
                  color={tx.type === 'PLUS' ? '#16A34A' : '#EF4444'}
                />
              </View>

              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{tx.title}</Text>
                <Text style={styles.txCustomer}>{tx.customerName}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>

              <Text
                style={[
                  styles.txAmount,
                  tx.type === 'PLUS' ? styles.txAmountPlus : styles.txAmountMinus,
                ]}
              >
                {tx.amount}
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: '#E5E7EB',
  },
  titleWrap: {
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  walletCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
  },
  activePill: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4ADE80',
    letterSpacing: 0.5,
  },
  balanceText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: spacing.sm,
  },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  subAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: 2,
  },
  withdrawBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  withdrawBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txPlus: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  txMinus: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  txCustomer: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountPlus: {
    color: '#16A34A',
  },
  txAmountMinus: {
    color: '#EF4444',
  },
});
