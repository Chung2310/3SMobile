import { api } from '@/services/api/client';
import { getStoredSession, saveSession } from '@/services/sessionStore';
import type { User } from '@/types/domain';

export interface PtProfileInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
  status: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  totalCustomers: number;
  goodProgressCount: number;
  openAlerts: number;
}

/**
 * Lấy thông tin hồ sơ của PT:
 * - Số liệu huấn luyện: /api/dashboard/pt (tổng học viên, tiến độ tốt, cảnh báo)
 * - Hồ sơ tài khoản chính xác: /api/auth/me (avatarUrl, fullName, email, phone thực tế của user)
 */
export async function fetchPtProfile(user?: User | null): Promise<PtProfileInfo> {
  const profile: PtProfileInfo = {
    id: user?.id || '',
    username: user?.username || '',
    fullName: user?.fullName || user?.username || 'Huấn luyện viên',
    role: user?.role || 'PT',
    status: (user?.status as string) || 'ACTIVE',
    email: (user?.email as string) || null,
    phone: (user?.phone as string) || null,
    avatarUrl: (user?.avatarUrl as string) || null,
    totalCustomers: 0,
    goodProgressCount: 0,
    openAlerts: 0,
  };

  try {
    // 1. Gọi API dashboard PT để lấy số liệu thống kê
    const dashboard = await api.get<{
      totalCustomers: number;
      goodProgressCount: number;
      openAlerts: number;
    }>('/api/dashboard/pt');

    if (dashboard && typeof dashboard === 'object') {
      profile.totalCustomers = dashboard.totalCustomers || 0;
      profile.goodProgressCount = dashboard.goodProgressCount || 0;
      profile.openAlerts = dashboard.openAlerts || 0;
    }
  } catch {
    // Bỏ qua nếu lỗi mạng khi lấy dashboard
  }

  try {
    // 2. Gọi /api/auth/me để lấy profile mới nhất và avatarUrl chính xác của user
    const me = await api.get<User>('/api/auth/me');
    if (me && typeof me === 'object') {
      if (typeof me.id === 'string' && me.id) profile.id = me.id;
      if (typeof me.username === 'string' && me.username) profile.username = me.username;
      if (typeof me.fullName === 'string' && me.fullName) profile.fullName = me.fullName;
      if (typeof me.role === 'string' && me.role) profile.role = me.role;
      if (typeof me.status === 'string' && me.status) profile.status = me.status;
      if (typeof me.email === 'string') profile.email = me.email;
      if (typeof me.phone === 'string') profile.phone = me.phone;
      if (typeof me.avatarUrl === 'string' && me.avatarUrl.trim()) profile.avatarUrl = me.avatarUrl.trim();

      // Đồng bộ thông tin mới nhất vào session lưu trữ
      try {
        const stored = await getStoredSession();
        if (stored && stored.user) {
          const resolvedAvatar = (typeof me.avatarUrl === 'string' && me.avatarUrl.trim())
            ? me.avatarUrl.trim()
            : (stored.user.avatarUrl || '');
          stored.user = {
            ...stored.user,
            ...me,
            avatarUrl: resolvedAvatar,
          };
          await saveSession(stored);
        }
      } catch {
        // Bỏ qua nếu lỗi lưu session
      }
    }
  } catch {
    // Nếu không gọi được /api/auth/me thì giữ nguyên thông tin từ session
  }

  return profile;
}
