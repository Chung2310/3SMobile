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
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  specialization?: string | null;
  yearsOfExperience?: number;
  certificates?: string[] | string;
  bio?: string | null;
  totalCustomers: number;
  goodProgressCount: number;
  openAlerts: number;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  email?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string;
  address?: string;
  specialization?: string;
  yearsOfExperience?: number;
  certificates?: string[];
  bio?: string;
  currentPassword?: string;
  password?: string;
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
    dateOfBirth: (user?.dateOfBirth as string) || null,
    gender: (user?.gender as string) || 'OTHER',
    address: (user?.address as string) || '',
    specialization: (user?.specialization as string) || '',
    yearsOfExperience: Number(user?.yearsOfExperience || 0),
    certificates: (user?.certificates as string[] | string) || '',
    bio: (user?.bio as string) || '',
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
      if (me.dateOfBirth) profile.dateOfBirth = String(me.dateOfBirth).slice(0, 10);
      if (typeof me.gender === 'string') profile.gender = me.gender;
      if (typeof me.address === 'string') profile.address = me.address;
      if (typeof me.specialization === 'string') profile.specialization = me.specialization;
      if (me.yearsOfExperience !== undefined) profile.yearsOfExperience = Number(me.yearsOfExperience || 0);
      if (me.certificates) profile.certificates = me.certificates as string[];
      if (typeof me.bio === 'string') profile.bio = me.bio;

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

/**
 * Cập nhật thông tin hồ sơ của PT (gọi PATCH /api/auth/me)
 */
export async function updatePtProfile(payload: UpdateProfilePayload): Promise<User> {
  const res = await api.patch<{ success?: boolean; message?: string; data?: User } | User>(
    '/api/auth/me',
    payload
  );
  const updatedUser = (res && typeof res === 'object' && 'data' in res ? (res as any).data : res) as User;

  // Cập nhật session storage
  try {
    const stored = await getStoredSession();
    if (stored && stored.user) {
      stored.user = {
        ...stored.user,
        ...updatedUser,
      };
      await saveSession(stored);
    }
  } catch {
    // Bỏ qua lỗi session storage
  }

  return updatedUser;
}

/**
 * Upload ảnh đại diện PT lên server (gọi POST /api/upload/image)
 */
export async function uploadPtAvatar(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  base64?: string | null;
}): Promise<string> {
  const fd = new FormData();
  fd.append('image', {
    uri: asset.uri,
    name: asset.fileName || 'avatar.jpg',
    type: asset.mimeType || 'image/jpeg',
  } as any);

  try {
    const res = await api.upload<{
      success?: boolean;
      data?: { url: string; publicId?: string };
      url?: string;
    }>('/api/upload/image', fd);

    const url = res?.data?.url || res?.url;
    if (url) return url;
  } catch (err) {
    if (asset.base64) {
      return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
    }
    throw err;
  }

  if (asset.base64) {
    return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
  }

  throw new Error('Không nhận được URL ảnh sau khi tải lên.');
}
