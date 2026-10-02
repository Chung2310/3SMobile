import { api } from '@/services/api/client';

export interface RegisterPtPayload {
  fullName: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
}

export interface RegisterPtResponse {
  center: { id: string; type: 'PERSONAL' };
  user: {
    id: string;
    username: string;
    fullName: string;
    role: 'PT';
    status: string;
    email: string;
    phone: string;
  };
}

export function registerPt(payload: RegisterPtPayload) {
  return api.post<RegisterPtResponse>('/api/auth/register-pt', payload);
}
