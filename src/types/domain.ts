export type JsonRecord = Record<string, unknown>;

export interface User {
  id: string;
  username?: string;
  role?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  customer?: JsonRecord;
  [key: string]: unknown;
}

export interface Session {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  clientType?: string;
  user?: User;
  account?: User;
  [key: string]: unknown;
}

export interface CustomerJourney extends JsonRecord {
  customer?: JsonRecord;
  sessions?: JsonRecord[];
  measurements?: JsonRecord[];
  calendar?: JsonRecord[];
  photos?: JsonRecord[];
  plans?: JsonRecord | JsonRecord[];
  roadmaps?: JsonRecord[];
  nutritionPlans?: JsonRecord[];
  goals?: JsonRecord[];
  inbodyRecords?: JsonRecord[];
  reports?: JsonRecord[];
  analytics?: JsonRecord;
}

export interface AppNotification extends JsonRecord {
  id?: string;
  _id?: string;
  title?: string;
  message?: string;
  type?: string;
  readAt?: string | null;
  createdAt?: string;
  resourceType?: string | null;
  resourceId?: string | null;
}

export type ProgressCategory = 'GOOD' | 'SLOW' | 'POOR' | 'INSUFFICIENT_DATA';

export interface PtCustomerSummary {
  customerId: string;
  fullName: string;
  phone?: string;
  initialGoal?: string;
  initialWeight?: number | null;
  dataStatus: 'READY' | 'INSUFFICIENT_DATA';
  score?: number | null;
  progressCategory: ProgressCategory;
  measurementCount: number;
  changes?: {
    bodyFatChange: number;
    muscleChange: number;
    weightChange: number;
    daysBetween: number;
  } | null;
  openAlerts: number;
  riskFactors?: string[];
  improvementTips?: string[];
}

export interface PtDashboardData {
  totalCustomers: number;
  openAlerts: number;
  goodProgressCount: number;
  slowProgressCount: number;
  poorProgressCount: number;
  ptAvatarUrl?: string;
  customers: PtCustomerSummary[];
}

export interface CustomerProfile {
  _id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  height?: number | null;
  initialWeight?: number | null;
  medicalNotes?: string;
  initialGoal?: string;
  internalNotes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LEAD';
  assignedPtId?: string | JsonRecord;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerPayload {
  fullName: string;
  phone: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  height?: number | null;
  initialWeight?: number | null;
  medicalNotes?: string;
  initialGoal?: string;
  internalNotes?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'LEAD';
}

export interface PtPackage {
  _id: string;
  name: string;
  totalSessions: number;
  remainingSessions: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';
  customerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePackagePayload {
  name: string;
  totalSessions: number;
  startDate: string;
  endDate: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';
}
