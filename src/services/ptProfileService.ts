import { api } from '@/services/api/client';
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
 * Lay thong tin ho so cua PT:
 * - So lieu huan luyen: /api/dashboard/pt (tong hoc vien, tien do tot, canh bao)
 * - Ho so tai khoan chinh xac: /api/auth/me (avatarUrl, fullName, email, phone thuc te cua user)
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
    // 1. Goi API dashboard PT de lay so lieu thong ke
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
    // Bo qua neu loi mang khi lay dashboard
  }

  try {
    // 2. Goi /api/auth/me de lay profile moi nhat va avatarUrl chinh xac cua user
    const me = await api.get<User>('/api/auth/me');
    if (me && typeof me === 'object') {
      if (typeof me.id === 'string' && me.id) profile.id = me.id;
      if (typeof me.username === 'string' && me.username) profile.username = me.username;
      if (typeof me.fullName === 'string' && me.fullName) profile.fullName = me.fullName;
      if (typeof me.role === 'string' && me.role) profile.role = me.role;
      if (typeof me.status === 'string' && me.status) profile.status = me.status;
      if (typeof me.email === 'string') profile.email = me.email;
      if (typeof me.phone === 'string') profile.phone = me.phone;
      if (typeof me.avatarUrl === 'string') profile.avatarUrl = me.avatarUrl;
    }
  } catch {
    // Neu khong goi duoc /api/auth/me thi giu nguyen thong tin tu session
  }

  return profile;
}
