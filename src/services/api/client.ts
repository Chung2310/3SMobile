import { API_BASE_URL } from '@/services/config';
import { getStoredSession, saveSession } from '@/services/sessionStore';

export interface ApiPage<T> { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }

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

  // 1. Nếu backend trả về danh sách chi tiết lỗi kiểm tra dữ liệu (Joi / validation issues)
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    const errorDetails = record.errors
      .map((err: any) => {
        if (typeof err === 'string') return err;
        if (err && typeof err === 'object') {
          if (err.message && typeof err.message === 'string') return err.message;
          if (err.field) return `Trường "${err.field}" không hợp lệ.`;
        }
        return null;
      })
      .filter(Boolean);

    if (errorDetails.length > 0) {
      return errorDetails.join('\n');
    }
  }

  // 2. Nếu errors là một đối tượng { [field]: string | object }
  if (record.errors && typeof record.errors === 'object' && !Array.isArray(record.errors)) {
    const errorDetails = Object.entries(record.errors as Record<string, unknown>)
      .map(([field, val]) => {
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object' && (val as any).message) {
          return (val as any).message;
        }
        return `Trường "${field}" không hợp lệ.`;
      })
      .filter(Boolean);

    if (errorDetails.length > 0) {
      return errorDetails.join('\n');
    }
  }

  // 3. Nếu message từ server cụ thể và không phải câu thông báo chung chung
  if (
    record.message &&
    record.message !== 'Dữ liệu gửi lên không hợp lệ.' &&
    record.message !== 'Validation Error'
  ) {
    return record.message;
  }

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

async function request<T>(path: string, init: RequestInit = {}, unwrap = true): Promise<T> {
  const storedSession = await getStoredSession();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const isFormData =
    Boolean(init.body) &&
    (
      (typeof FormData !== 'undefined' && init.body instanceof FormData) ||
      (typeof init.body === 'object' && init.body !== null && '_parts' in (init.body as unknown as Record<string, unknown>)) ||
      (init.body?.constructor && (init.body.constructor as { name?: string }).name === 'FormData')
    );

  if (isFormData) {
    // For multipart FormData in React Native and Web, fetch automatically attaches the boundary.
    // Explicit Content-Type headers corrupt multipart uploads.
    headers.delete('Content-Type');
    headers.delete('content-type');
  } else if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (storedSession?.token) {
    headers.set('Authorization', `Bearer ${storedSession.token}`);
  }

  let response: Response;
  const normalizedBase = API_BASE_URL.replace(/:(8008|8089)/g, ':3008');
  const targetUrl = `${normalizedBase}${path}`;
  try {
    response = await fetch(targetUrl, {
      ...init,
      headers,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[API Fetch Error] ${init.method || 'GET'} ${targetUrl}:`, err);
    throw new ApiError(`Không thể kết nối máy chủ (${errorMsg}) tại ${targetUrl}. Kiểm tra mạng hoặc API URL.`, 0);
  }

  // Tự động gia hạn phiên đăng nhập ngầm nếu gặp 401 và có refreshToken
  if (response.status === 401 && storedSession?.refreshToken && !path.includes('/api/auth/')) {
    try {
      const refreshRes = await fetch(`${normalizedBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: storedSession.refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const payload = refreshData?.data || refreshData;
        if (payload?.token) {
          const updatedSession = {
            ...storedSession,
            token: payload.token,
            refreshToken: payload.refreshToken || storedSession.refreshToken,
          };
          await saveSession(updatedSession);
          headers.set('Authorization', `Bearer ${payload.token}`);
          response = await fetch(targetUrl, {
            ...init,
            headers,
          });
        }
      }
    } catch {
      // Bỏ qua lỗi refresh và chuyển tiếp lỗi 401
    }
  }

  const body = await parseBody(response);
  if (!response.ok) {
    const details = body && typeof body === 'object' ? (body as ApiEnvelope<unknown>) : undefined;
    throw new ApiError(getMessage(body, `Yêu cầu thất bại (${response.status}).`), response.status, details);
  }

  if (unwrap && body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data as T;
  }
  return body as T;
}

function encodeBody(body: unknown): BodyInit | undefined {
  return body === undefined ? undefined : JSON.stringify(body);
}

export const api = {
  getPage<T>(path: string): Promise<ApiPage<T>> {
    return request<ApiPage<T>>(path, { method: 'GET' }, false);
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options?: { headers?: HeadersInit }): Promise<T> {
    return request<T>(path, { method: 'POST', body: encodeBody(body), headers: options?.headers });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body: encodeBody(body) });
  },
  upload<T>(path: string, formData: FormData, onProgress?: (percent: number) => void): Promise<T> {
    if (!onProgress || typeof XMLHttpRequest === 'undefined') {
      return request<T>(path, { method: 'POST', body: formData });
    }

    const storedSessionPromise = getStoredSession();
    const normalizedBase = API_BASE_URL.replace(/:(8008|8089)/g, ':3008');
    const targetUrl = `${normalizedBase}${path}`;

    return new Promise<T>((resolve, reject) => {
      storedSessionPromise
        .then((storedSession) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', targetUrl);
          xhr.setRequestHeader('Accept', 'application/json');
          if (storedSession?.token) {
            xhr.setRequestHeader('Authorization', `Bearer ${storedSession.token}`);
          }
          if (onProgress && xhr.upload) {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable && event.total > 0) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress(percent);
              }
            };
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                resolve(json?.data !== undefined ? json.data : json);
              } catch {
                resolve(xhr.responseText as unknown as T);
              }
            } else {
              try {
                const json = JSON.parse(xhr.responseText);
                reject(
                  new ApiError(
                    json?.message || `Tải lên thất bại (${xhr.status}).`,
                    xhr.status,
                    json
                  )
                );
              } catch {
                reject(new ApiError(`Tải lên thất bại (${xhr.status}).`, xhr.status));
              }
            }
          };
          xhr.onerror = () => {
            reject(
              new ApiError(
                `Không thể kết nối máy chủ khi tải tệp lên tại ${targetUrl}. Kiểm tra mạng hoặc API URL.`,
                0
              )
            );
          };
          xhr.send(formData);
        })
        .catch(reject);
    });
  },
};
