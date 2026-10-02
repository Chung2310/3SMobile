import { api } from '@/services/api/client';

export interface GymInvitation {
  id: string;
  centerName: string;
  username: string;
  fullName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  expiresAt: string;
}
export interface GymInvitationsResponse {
  workspaceType: 'PERSONAL' | 'GYM';
  centerName: string;
  items: GymInvitation[];
}
export const fetchGymInvitations = () => api.get<GymInvitationsResponse>('/api/gym-invitations');
export const invitePtToGym = (username: string) => api.post('/api/gym-invitations', { username });
export const respondToGymInvitation = (id: string, action: 'ACCEPT' | 'DECLINE' | 'CANCEL') => api.post('/api/gym-invitations/' + id + '/respond', { action, transferConsent: action === 'ACCEPT' });
