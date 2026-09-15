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
 * Lấy dữ liệu hồ sơ cá nhân của PT trực tiếp thông qua các API endpoint của backend:
 * - /api/dashboard/pt: Tổng số học viên, tiến độ tốt, cảnh báo
 * - /api/customers?limit=1: populated assignedPtId (email, phone, avatarUrl)
 * - /api/customers/:id/journey: thông tin chi tiết HLV gán cho học viên
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
    // 1. Gọi API dashboard PT để lấy số liệu thực tế
    const dashboard = await api.get<{
      totalCustomers: number;
      goodProgressCount: number;
      openAlerts: number;
      customers?: Array<{ customerId: string }>;
    }>('/api/dashboard/pt');

    if (dashboard && typeof dashboard === 'object') {
      profile.totalCustomers = dashboard.totalCustomers || 0;
      profile.goodProgressCount = dashboard.goodProgressCount || 0;
      profile.openAlerts = dashboard.openAlerts || 0;
    }

    // 2. Nếu email/phone/avatar chưa có từ session, truy vấn thêm từ API khách hàng để lấy dữ liệu thực tế trong DB
    const firstCustomerId = dashboard?.customers?.[0]?.customerId;

    if (firstCustomerId) {
      try {
        const journey = await api.get<{
          customer?: {
            assignedPt?: {
              email?: string;
              phone?: string;
              avatarUrl?: string;
              fullName?: string;
            };
          };
        }>(`/api/customers/${firstCustomerId}/journey`);

        const assignedPt = journey?.customer?.assignedPt;
        if (assignedPt) {
          if (!profile.avatarUrl && assignedPt.avatarUrl) {
            profile.avatarUrl = assignedPt.avatarUrl;
          }
          if (!profile.email && assignedPt.email) {
            profile.email = assignedPt.email;
          }
          if (!profile.phone && assignedPt.phone) {
            profile.phone = assignedPt.phone;
          }
          if (assignedPt.fullName) {
            profile.fullName = assignedPt.fullName;
          }
        }
      } catch {
        // bỏ qua nếu không gọi được journey
      }
    }

    // 3. Dự phòng qua /api/customers?limit=1
    if (!profile.email || !profile.phone || !profile.avatarUrl) {
      try {
        const customersRes = await api.get<{
          customers?: Array<{
            assignedPtId?: {
              email?: string;
              phone?: string;
              avatarUrl?: string;
            };
          }>;
        }>('/api/customers?limit=1');

        const assignedPt = customersRes?.customers?.[0]?.assignedPtId;
        if (assignedPt) {
          if (!profile.email && assignedPt.email) profile.email = assignedPt.email;
          if (!profile.phone && assignedPt.phone) profile.phone = assignedPt.phone;
          if (!profile.avatarUrl && assignedPt.avatarUrl) profile.avatarUrl = assignedPt.avatarUrl;
        }
      } catch {
        // bỏ qua
      }
    }
  } catch {
    // API lỗi mạng, giữ thông tin từ session
  }

  return profile;
}
