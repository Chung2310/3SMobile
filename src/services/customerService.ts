import { api } from '@/services/api/client';
import type { CreateCustomerPayload, CustomerProfile } from '@/types/domain';

export interface CustomerListResponse {
  customers: CustomerProfile[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchCustomersList(params?: {
  keyword?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<CustomerProfile[]> {
  try {
    const query = new URLSearchParams();
    if (params?.keyword) query.set('keyword', params.keyword.trim());
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = `/api/customers${qs ? `?${qs}` : ''}`;
    const result = await api.get<CustomerProfile[] | { customers: CustomerProfile[] }>(endpoint);

    if (Array.isArray(result)) return result;
    if (result && typeof result === 'object' && 'customers' in result) {
      return result.customers;
    }
    return [];
  } catch {
    return [];
  }
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<CustomerProfile> {
  return await api.post<CustomerProfile>('/api/customers', payload);
}

export async function updateCustomer(id: string, payload: Partial<CreateCustomerPayload>): Promise<CustomerProfile> {
  return await api.patch<CustomerProfile>(`/api/customers/${id}`, payload);
}

export async function fetchCustomerDetail(id: string): Promise<CustomerProfile | null> {
  try {
    return await api.get<CustomerProfile>(`/api/customers/${id}`);
  } catch {
    return null;
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/api/customers/${id}`);
}

export async function fetchCustomerPackages(customerId: string): Promise<import('@/types/domain').PtPackage[]> {
  try {
    const result = await api.get<import('@/types/domain').PtPackage[] | { data: import('@/types/domain').PtPackage[] }>(
      `/api/customers/${customerId}/packages`
    );
    if (Array.isArray(result)) return result;
    if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as any).data)) {
      return (result as any).data;
    }
    return [];
  } catch {
    return [];
  }
}

export async function createCustomerPackage(
  customerId: string,
  payload: import('@/types/domain').CreatePackagePayload
): Promise<import('@/types/domain').PtPackage> {
  return await api.post<import('@/types/domain').PtPackage>(`/api/customers/${customerId}/packages`, payload);
}

export async function deleteCustomerPackage(customerId: string, packageId: string): Promise<void> {
  await api.delete(`/api/customers/${customerId}/packages/${packageId}`);
}

export interface PackageTemplateItem {
  _id: string;
  id?: string;
  name: string;
  totalSessions: number;
  durationDays: number;
  price?: number;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function fetchPackageTemplates(): Promise<PackageTemplateItem[]> {
  try {
    const res = await api.get<any>('/api/package-templates?status=ACTIVE&limit=50');
    const payload = res?.data || res;
    const list = Array.isArray(payload) ? payload : payload?.templates || payload?.items;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
