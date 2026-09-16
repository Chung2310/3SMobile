import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { fetchPtProfile, type PtProfileInfo } from '@/services/ptProfileService';
import { resolveImageUrl } from '@/services/imageUtils';
import { colors, radius, spacing } from '@/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<PtProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchPtProfile(session?.user);
      setProfile(data);
    } catch {
      // Đã xử lý trong service
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadProfile();
  }, [loadProfile]);

  async function handleSignOut() {
    setShowSignOutModal(true);
  }

  async function confirmSignOut() {
    setShowSignOutModal(false);
    await signOut();
    router.replace('/(auth)/login');
  }

  const displayName = profile?.fullName || session?.user?.fullName || session?.user?.username || 'Huấn luyện viên';
  const username = profile?.username || session?.user?.username || 'Chưa cập nhật';
  const role = profile?.role || session?.user?.role || 'PT';
  const email = profile?.email || (session?.user?.email as string) || 'Chưa cập nhật';
  const phone = profile?.phone || (session?.user?.phone as string) || 'Chưa cập nhật';
  const avatarUrl = profile?.avatarUrl || (session?.user?.avatarUrl as string) || null;
  const status = profile?.status || (session?.user?.status as string) || 'ACTIVE';

  const totalCustomers = profile?.totalCustomers ?? 0;
  const goodProgress = profile?.goodProgressCount ?? 0;
  const alerts = profile?.openAlerts ?? 0;
  const efficiency = totalCustomers > 0 ? Math.round((goodProgress / totalCustomers) * 100) : 0;

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP BAR CÓ NÚT BACK (CÁCH LY AN TOÀN VỚI STATUS BAR) */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.navigate('/(app)/(tabs)')}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityLabel="Quay lại"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Hồ sơ cá nhân</Text>
          <Text style={styles.topBarSubtitle}>Tài khoản Huấn luyện viên</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(insets.bottom, 24) + 40
                : Math.max(insets.bottom, 16) + 30,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !profile ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải dữ liệu hồ sơ từ hệ thống...</Text>
          </View>
        ) : (
          <>
            {/* 2. THẺ HLV CHÍNH (HERO CARD MÀU XANH DA TRỜI SANG TRỌNG) */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                {/* Ảnh đại diện thực tế từ API (hoặc fallback ký tự tên nếu backend chưa lưu URL ảnh) */}
                <View style={styles.avatarContainer}>
                  {avatarUrl ? (
                    <Image source={{ uri: resolveImageUrl(avatarUrl) || '' }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {displayName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.onlineBadge} />
                </View>

                <View style={styles.heroInfo}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={styles.roleRow}>
                    <View style={styles.rolePill}>
                      <Feather name="shield" size={11} color="#FFFFFF" />
                      <Text style={styles.roleText}>
                        {role === 'PT' ? 'HUẤN LUYỆN VIÊN' : role}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Hàng chỉ số thực tế từ API /api/dashboard/pt */}
              <View style={styles.statsStrip}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalCustomers}</Text>
                  <Text style={styles.statLabel}>Khách hàng</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{efficiency}%</Text>
                  <Text style={styles.statLabel}>Tiến độ tốt</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{alerts}</Text>
                  <Text style={styles.statLabel}>Cảnh báo</Text>
                </View>
              </View>
            </View>

            {/* 3. THÔNG TIN CHI TIẾT TỪ API */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>THÔNG TIN TÀI KHOẢN</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Feather name="at-sign" size={16} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tên đăng nhập</Text>
                  <Text style={styles.infoValue}>{username}</Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Feather name="phone" size={16} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Số điện thoại</Text>
                  <Text style={styles.infoValue}>{phone}</Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Feather name="mail" size={16} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email}</Text>
                </View>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Feather name="check-circle" size={16} color="#10B981" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Trạng thái tài khoản</Text>
                  <Text style={[styles.infoValue, { color: '#10B981' }]}>
                    {status === 'ACTIVE' ? 'Đang hoạt động (ACTIVE)' : status}
                  </Text>
                </View>
              </View>
            </View>

            {/* 4. HÀNH ĐỘNG TÀI KHOẢN (ĐĂNG XUẤT) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>HỆ THỐNG</Text>

              <Pressable
                onPress={() => void handleSignOut()}
                style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}
              >
                <Feather name="log-out" size={18} color="#EF4444" />
                <Text style={styles.signOutText}>Đăng xuất tài khoản</Text>
              </Pressable>
            </View>

        
          </>
        )}
      </ScrollView>

      {/* Modal bo góc - Xác nhận đăng xuất */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSignOutModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Feather name="log-out" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Đăng xuất</Text>
            <Text style={styles.modalMessage}>Bạn có chắc muốn đăng xuất khỏi tài khoản?</Text>
            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setShowSignOutModal(false)}
                style={({ pressed }) => [
                  styles.modalBtnCancel,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={styles.modalBtnCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmSignOut()}
                style={({ pressed }) => [
                  styles.modalBtnConfirm,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={styles.modalBtnConfirmText}>Đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backBtnPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.95 }],
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.primary, // Xanh da trời hiện đại (#0284C7)
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#1E293B',
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  gymBrandText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.8,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 48,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 4,
  },
  signOutBtnPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    transform: [{ scale: 0.98 }],
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  appVersionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
