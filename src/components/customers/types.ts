import type { CustomerProfile, ProgressCategory } from '@/types/domain';
import { colors } from '@/theme';

export type CustomerStatusFilter = 'ALL' | 'ACTIVE' | 'LEAD' | 'INACTIVE';

export interface CustomerListItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  initialGoal: string;
  score: number | null;
  measurementCount: number;
  progressCategory: ProgressCategory;
  status: 'ACTIVE' | 'LEAD' | 'INACTIVE';
  rawProfile: CustomerProfile | null;
}

export interface CustomerFormState {
  fullName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  email: string;
  height: string;
  initialWeight: string;
  medicalNotes: string;
  initialGoal: string;
  internalNotes: string;
  status: 'ACTIVE' | 'LEAD' | 'INACTIVE';
}

export const initialCustomerFormState: CustomerFormState = {
  fullName: '',
  dateOfBirth: '',
  gender: 'OTHER',
  phone: '',
  email: '',
  height: '',
  initialWeight: '',
  medicalNotes: '',
  initialGoal: '',
  internalNotes: '',
  status: 'ACTIVE',
};

export function parseDateInput(str: string): string | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

export function formatDateDMY(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function getBadgeColor(category?: string): string {
  if (category === 'GOOD') return '#22C55E';
  if (category === 'SLOW') return '#F59E0B';
  if (category === 'POOR') return '#EF4444';
  return colors.textMuted;
}

export function getCategoryText(category?: string): string {
  if (category === 'GOOD') return 'Tiến bộ tốt';
  if (category === 'SLOW') return 'Tiến bộ chậm';
  if (category === 'POOR') return 'Cần cải thiện';
  return 'Chưa đánh giá';
}

export function getStatusFilterLabel(status: CustomerStatusFilter): string {
  switch (status) {
    case 'ACTIVE':
      return 'Đang hoạt động';
    case 'LEAD':
      return 'Tiềm năng';
    case 'INACTIVE':
      return 'Ngừng hoạt động';
    default:
      return 'Tất cả';
  }
}
