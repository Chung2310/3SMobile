import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { api } from '@/services/api/client';
import { resolveImageUrl } from '@/services/imageUtils';
import { colors } from '@/theme';

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [avatarErrorUrl, setAvatarErrorUrl] = useState<string | null>(null);
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const userName = session?.user?.fullName || session?.user?.username || 'Admin 3S';
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  // Điều hướng tương thích ngược nếu có param tab=modules
  useEffect(() => {
    if (tab === 'modules') {
      router.replace('/(app)/admin/modules');
    }
  }, [tab]);

  const fetchCreditBalance = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/credits/me');
      const payload = res?.data || res;
      if (payload && typeof payload.availableCredits === 'number') {
        setCreditBalance(payload.availableCredits);
      }
    } catch {
      // Bỏ qua lỗi ngầm nếu chưa có quyền
    }
  }, []);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const payload = await api.get<any>('/api/notifications?page=1&limit=20');
      const list = Array.isArray(payload)
        ? payload
        : payload?.items || payload?.notifications || payload?.data || [];
      const unread = list.filter((n: any) => !n.readAt).length;
      setUnreadNotificationsCount(unread);
    } catch {
      // Bỏ qua lỗi ngầm
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchCreditBalance();
      void fetchUnreadNotifications();
    }, [fetchCreditBalance, fetchUnreadNotifications])
  );

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP HEADER HIỆN ĐẠI */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.roleTag}>
            <Ionicons
              name={isSuperAdmin ? 'shield-checkmark' : 'shield'}
              size={12}
              color={colors.primary}
            />
            <Text style={styles.roleTagText}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'QUẢN TRỊ VIÊN'}
            </Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={() => router.push('/(app)/wallet')}
            style={({ pressed }) => [styles.headerCreditBadge, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Số dư Credit AI. Bấm để xem ví"
          >
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={styles.headerCreditValue}>
              {creditBalance !== null ? creditBalance.toLocaleString('vi-VN') : '---'}
            </Text>
          </Pressable>

          {/* Nút thông báo */}
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]}
            hitSlop={8}
            accessibilityLabel="Thông báo"
          >
            <Feather name="bell" size={17} color="#334155" />
            {unreadNotificationsCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Avatar Profile */}
          <Pressable
            onPress={() => router.push('/(app)/profile')}
            style={({ pressed }) => [
              styles.avatarWrap,
              pressed && styles.avatarPressed,
            ]}
            hitSlop={8}
            accessibilityLabel="Hồ sơ quản trị"
          >
            {session?.user?.avatarUrl && session.user.avatarUrl !== avatarErrorUrl ? (
              <Image
                source={{ uri: resolveImageUrl(session.user.avatarUrl) || '' }}
                style={styles.avatarImg}
                onError={() => setAvatarErrorUrl(session.user?.avatarUrl || '')}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(userName || 'AD').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.onlineBadge} />
          </Pressable>
        </View>
      </View>

      {/* 2. NỘI DUNG CHÍNH: DASHBOARD QUẢN TRỊ VIÊN */}
      <View style={styles.viewContent}>
        <AdminDashboardView
          key={refreshKey}
          onRefreshParent={() => {
            void fetchCreditBalance();
            setRefreshKey((k) => k + 1);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  /* Top Header */
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  roleTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCreditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 18,
    paddingHorizontal: 10,
    height: 36,
  },
  headerBadgePressed: {
    opacity: 0.7,
  },
  headerCreditValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerIconBtnPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.94 }],
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },

  avatarWrap: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.8,
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  /* Dashboard View Container */
  viewContent: {
    flex: 1,
  },
});
