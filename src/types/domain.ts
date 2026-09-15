export type JsonRecord = Record<string, unknown>;

export interface User {
  id: string;
  username?: string;
  role?: string;
  fullName?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  customer?: JsonRecord;
  [key: string]: unknown;
}

export interface Session {
  token: string;
  user: User;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
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
