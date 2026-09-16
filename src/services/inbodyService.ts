import { api, type ApiPage } from './api/client';
import type { InBodyOcrDraft, InBodyRecordData } from '@/types/inbody';

export interface InBodyListParams {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const inbodyService = {
  getRecords(params: InBodyListParams = {}): Promise<ApiPage<InBodyRecordData>> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const qs = query.toString();
    return api.getPage<InBodyRecordData>(`/api/inbody${qs ? `?${qs}` : ''}`);
  },

  getRecordById(id: string): Promise<InBodyRecordData> {
    return api.get<InBodyRecordData>(`/api/inbody/${id}`);
  },

  createRecord(payload: Partial<InBodyRecordData>): Promise<InBodyRecordData> {
    return api.post<InBodyRecordData>('/api/inbody', payload);
  },

  updateRecord(id: string, payload: Partial<InBodyRecordData>): Promise<InBodyRecordData> {
    return api.patch<InBodyRecordData>(`/api/inbody/${id}`, payload);
  },

  deleteRecord(id: string): Promise<{ success: boolean; message?: string }> {
    return api.delete<{ success: boolean; message?: string }>(`/api/inbody/${id}`);
  },

  publishRecord(id: string): Promise<InBodyRecordData> {
    return api.patch<InBodyRecordData>(`/api/inbody/${id}/publish`);
  },

  unpublishRecord(id: string): Promise<InBodyRecordData> {
    return api.patch<InBodyRecordData>(`/api/inbody/${id}/unpublish`);
  },

  scanOcr(formData: FormData, onProgress?: (percent: number) => void): Promise<InBodyOcrDraft> {
    return api.upload<InBodyOcrDraft>('/api/inbody/ocr', formData, onProgress);
  },

  confirmOcr(id: string, payload: Partial<InBodyRecordData>): Promise<InBodyRecordData> {
    return api.patch<InBodyRecordData>(`/api/inbody/${id}/confirm-ocr`, payload);
  },
};
