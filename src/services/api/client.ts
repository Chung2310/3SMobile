import { API_BASE_URL } from '@/services/config';
import { getStoredSession } from '@/services/sessionStore';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  requestId?: string;
  errors?: unknown;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  errors?: unknown;

  constructor(message: string, status = 0, details?: Partial<ApiEnvelope<unknown>>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = details?.code;
    this.requestId = details?.requestId;
    this.errors = details?.errors;
  }
}

function getMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const record = body as ApiEnvelope<unknown>;
  return record.message || record.error || fallback;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const storedSession = await getStoredSession();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (storedSession?.token) {
    headers.set('Authorization', `Bearer ${storedSession.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError('Không thể kết nối máy chủ. Kiểm tra mạng hoặc API URL.', 0);
  }

  const body = await parseBody(response);
  if (!response.ok) {
    const details = body && typeof body === 'object' ? (body as ApiEnvelope<unknown>) : undefined;
    throw new ApiError(getMessage(body, `Yêu cầu thất bại (${response.status}).`), response.status, details);
  }

  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data as T;
  }
  return body as T;
}

function encodeBody(body: unknown): BodyInit | undefined {
  return body === undefined ? undefined : JSON.stringify(body);
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: encodeBody(body) });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body: encodeBody(body) });
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
