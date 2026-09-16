import { api } from '@/services/api/client';
import type { CustomerProfile } from '@/types/domain';

export interface AssistantMessage {
  _id?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  suggestionId?: string;
  citations?: Array<{ documentId: string; title: string }>;
  reviewStatus?: string;
  createdAt?: string;
}

export interface AssistantConversation {
  _id: string;
  title: string;
  customerId?: string;
  ptId: string;
  messages: AssistantMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ListConversationsResponse {
  items: AssistantConversation[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchConversations(params?: {
  customerId?: string;
  page?: number;
  limit?: number;
}): Promise<AssistantConversation[]> {
  try {
    const query = new URLSearchParams();
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = `/api/assistant/conversations${qs ? `?${qs}` : ''}`;
    const result = await api.get<ListConversationsResponse | AssistantConversation[]>(endpoint);

    if (Array.isArray(result)) return result;
    if (result && typeof result === 'object' && Array.isArray((result as ListConversationsResponse).items)) {
      return (result as ListConversationsResponse).items;
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchConversationDetail(id: string): Promise<AssistantConversation | null> {
  try {
    return await api.get<AssistantConversation>(`/api/assistant/conversations/${id}`);
  } catch {
    return null;
  }
}

export async function createConversation(payload: {
  title: string;
  customerId?: string;
}): Promise<AssistantConversation> {
  return await api.post<AssistantConversation>('/api/assistant/conversations', {
    title: payload.title.trim(),
    customerId: payload.customerId || undefined,
  });
}

export async function sendConversationMessage(
  conversationId: string,
  payload: {
    content: string;
    requestType?: string;
  }
): Promise<AssistantConversation> {
  return await api.post<AssistantConversation>(
    `/api/assistant/conversations/${conversationId}/messages`,
    {
      content: payload.content.trim(),
      requestType: payload.requestType || 'GENERAL',
    }
  );
}
