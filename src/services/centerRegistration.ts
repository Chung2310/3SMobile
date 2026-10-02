import { api } from '@/services/api/client';

export interface RegisterCenterPayload {
  centerName: string;
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
}

export interface RegisterCenterResponse {
  center: { id: string; name: string; slug: string };
  user: {
    id: string;
    username: string;
    fullName: string;
    role: 'ADMIN';
    status: string;
    email: string;
    phone: string;
  };
}

export function registerCenter(payload: RegisterCenterPayload) {
  return api.post<RegisterCenterResponse>('/api/auth/register-center', payload);
}
