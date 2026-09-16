import { api } from '@/services/api/client';
import type { PtDashboardData } from '@/types/domain';

// Dữ liệu mẫu dự phòng khi chưa kết nối mạng hoặc tài khoản thử nghiệm
export const DEMO_PT_DASHBOARD: PtDashboardData = {
  totalCustomers: 12,
  openAlerts: 2,
  goodProgressCount: 7,
  slowProgressCount: 3,
  poorProgressCount: 2,
  customers: [
    {
      customerId: 'cust-1',
      fullName: 'Trần Minh Hoàng',
      phone: '0988 123 456',
      initialGoal: 'Giảm 5kg mỡ & săn chắc cơ',
      initialWeight: 76.5,
      dataStatus: 'READY',
      score: 85,
      progressCategory: 'GOOD',
      measurementCount: 4,
      changes: { bodyFatChange: 3.2, muscleChange: 1.8, weightChange: -2.8, daysBetween: 28 },
      openAlerts: 0,
      riskFactors: [],
      improvementTips: ['Tiếp tục duy trì cường độ tập hiện tại.'],
    },
    {
      customerId: 'cust-2',
      fullName: 'Lê Thu Hà',
      phone: '0912 345 678',
      initialGoal: 'Tăng cơ mông đùi & siết eo',
      initialWeight: 54.0,
      dataStatus: 'READY',
      score: 78,
      progressCategory: 'GOOD',
      measurementCount: 3,
      changes: { bodyFatChange: 2.1, muscleChange: 1.2, weightChange: -1.0, daysBetween: 21 },
      openAlerts: 0,
      riskFactors: [],
      improvementTips: ['Bổ sung thêm đạm sau buổi tập.'],
    },
    {
      customerId: 'cust-3',
      fullName: 'Nguyễn Văn Nam',
      phone: '0903 888 999',
      initialGoal: 'Giảm mỡ bụng & cải thiện tim mạch',
      initialWeight: 82.0,
      dataStatus: 'READY',
      score: 58,
      progressCategory: 'SLOW',
      measurementCount: 3,
      changes: { bodyFatChange: 0.5, muscleChange: 0.2, weightChange: -0.4, daysBetween: 30 },
      openAlerts: 1,
      riskFactors: ['Chỉ số cơ/mỡ chuyển biến chậm'],
      improvementTips: ['Tăng cường bài tập cardio cuối buổi.'],
    },
    {
      customerId: 'cust-4',
      fullName: 'Phạm Hải Đăng',
      phone: '0977 654 321',
      initialGoal: 'Tăng 3kg cơ bắp thân trên',
      initialWeight: 63.0,
      dataStatus: 'READY',
      score: 42,
      progressCategory: 'POOR',
      measurementCount: 2,
      changes: { bodyFatChange: -1.2, muscleChange: -0.6, weightChange: 0.8, daysBetween: 24 },
      openAlerts: 1,
      riskFactors: ['Tỷ lệ mỡ tăng nhẹ, cơ giảm'],
      improvementTips: ['Kiểm tra lại chế độ nghỉ ngơi và calo nạp vào.'],
    },
  ],
};

export const EMPTY_PT_DASHBOARD: PtDashboardData = {
  totalCustomers: 0,
  openAlerts: 0,
  goodProgressCount: 0,
  slowProgressCount: 0,
  poorProgressCount: 0,
  customers: [],
};

export async function fetchPtDashboard(): Promise<PtDashboardData> {
  try {
    const data = await api.get<PtDashboardData>('/api/dashboard/pt');
    if (data && typeof data === 'object' && 'goodProgressCount' in data) {
      return data;
    }
    return EMPTY_PT_DASHBOARD;
  } catch {
    return EMPTY_PT_DASHBOARD;
  }
}
