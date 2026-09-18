import { isValidPassword, PASSWORD_ERROR } from './passwordValidation';
import type { Option } from '@/components/admin/AdminUI';
export interface AdminRecord { _id?: string; id?: string; role?: string; [key: string]: unknown }
export const recordId = (r: AdminRecord) => r._id || r.id || '';
export function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') { const r = value as AdminRecord; return String(r.fullName || r.username || r.name || r.title || r._id || r.id || '—'); }
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return String(value);
}
export const statuses: Option[] = [{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'LOCKED', label: 'Đã khóa' }];
const customerStatuses = [statuses[0], { value: 'INACTIVE', label: 'Ngừng hoạt động' }, { value: 'LEAD', label: 'Tiềm năng' }];
export interface Field { key: string; label: string; required?: boolean; numeric?: boolean; min?: number; integer?: boolean; multiline?: boolean; options?: Option[]; source?: string; createOnly?: boolean; password?: boolean; default?: string }
export interface Resource { title: string; path: string; query?: Record<string, string>; fields?: Field[]; summary: [string, string][]; search?: string; filters?: Option[]; account?: boolean; superOnly?: boolean; unpaged?: boolean; readonly?: boolean }
const contactFields: Field[] = [{ key: 'username', label: 'Tên đăng nhập', required: true, createOnly: true }, { key: 'password', label: 'Mật khẩu tối thiểu 8 ký tự (để trống khi giữ nguyên)', password: true }, { key: 'fullName', label: 'Họ và tên', required: true }, { key: 'phone', label: 'Số điện thoại', required: true }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Trạng thái', options: statuses, default: 'ACTIVE' }];
export const resources: Record<string, Resource> = {
  pts: { title: 'Huấn luyện viên', path: '/api/users', query: { role: 'PT' }, account: true, search: 'keyword', filters: statuses, fields: [...contactFields, { key: 'specialization', label: 'Chuyên môn' }, { key: 'yearsOfExperience', label: 'Số năm kinh nghiệm', numeric: true, integer: true, min: 0 }, { key: 'bio', label: 'Giới thiệu', multiline: true }], summary: [['username', 'Tên đăng nhập'], ['phone', 'Điện thoại'], ['email', 'Email'], ['status', 'Trạng thái'], ['specialization', 'Chuyên môn']] },
  users: { title: 'Tài khoản hội viên', path: '/api/users', query: { role: 'CUSTOMER' }, account: true, search: 'keyword', filters: statuses, fields: contactFields, summary: [['username', 'Tên đăng nhập'], ['phone', 'Điện thoại'], ['status', 'Trạng thái']] },
  accounts: { title: 'Tài khoản admin', path: '/api/users', query: { role: 'ADMIN' }, account: true, superOnly: true, search: 'keyword', filters: statuses, fields: contactFields, summary: [['username', 'Tên đăng nhập'], ['phone', 'Điện thoại'], ['email', 'Email'], ['status', 'Trạng thái']] },
  customers: { title: 'Khách hàng', path: '/api/customers', search: 'keyword', filters: customerStatuses, fields: [{ key: 'fullName', label: 'Họ và tên', required: true }, { key: 'phone', label: 'Số điện thoại', required: true }, { key: 'email', label: 'Email' }, { key: 'assignedPtId', label: 'PT phụ trách', required: true, createOnly: true, source: '/api/users?role=PT&status=ACTIVE' }, { key: 'gender', label: 'Giới tính', options: [{value: 'MALE', label: 'Nam'}, {value: 'FEMALE', label: 'Nữ'}, {value: 'OTHER', label: 'Khác'}] }, { key: 'height', label: 'Chiều cao (cm)', numeric: true, min: 0 }, { key: 'initialWeight', label: 'Cân nặng ban đầu (kg)', numeric: true, min: 0 }, { key: 'initialGoal', label: 'Mục tiêu', multiline: true }, { key: 'medicalNotes', label: 'Lưu ý sức khỏe', multiline: true }, { key: 'status', label: 'Trạng thái', options: customerStatuses, default: 'ACTIVE' }], summary: [['phone', 'Điện thoại'], ['assignedPtId', 'PT phụ trách'], ['status', 'Trạng thái'], ['initialGoal', 'Mục tiêu']] },
  packages: { title: 'Gói tập mẫu', path: '/api/package-templates', search: 'keyword', filters: customerStatuses.slice(0, 2), fields: [{ key: 'name', label: 'Tên gói tập', required: true }, { key: 'totalSessions', label: 'Số buổi', required: true, numeric: true, min: 1, integer: true }, { key: 'durationDays', label: 'Thời hạn (ngày)', required: true, numeric: true, min: 1, integer: true }, { key: 'price', label: 'Giá (VNĐ)', numeric: true, min: 0, default: '0' }, { key: 'description', label: 'Mô tả', multiline: true }, { key: 'status', label: 'Trạng thái', options: customerStatuses.slice(0, 2), default: 'ACTIVE' }], summary: [['totalSessions', 'Số buổi'], ['durationDays', 'Thời hạn (ngày)'], ['price', 'Giá (VNĐ)'], ['status', 'Trạng thái']] },
  transfers: { title: 'Lịch sử chuyển giao', path: '/api/transfers', readonly: true, filters: [{value:'PENDING',label:'Chờ tiếp nhận'}, {value:'ACCEPTED',label:'Đã tiếp nhận'}, {value:'REJECTED',label:'Đã từ chối'}, {value:'ADMIN_FORCED',label:'Admin điều chuyển'}], summary: [['customerId', 'Khách hàng'], ['fromPtId', 'PT cũ'], ['toPtId', 'PT mới'], ['reason', 'Lý do'], ['status', 'Trạng thái'], ['createdAt', 'Thời gian']] },
  knowledge: { title: 'Tri thức AI', path: '/api/knowledge', search: 'search', filters: [{value:'DRAFT',label:'Bản nháp'}, {value:'PUBLISHED',label:'Đã xuất bản'}], fields: [{key:'title',label:'Tiêu đề',required:true},{key:'topic',label:'Chủ đề',required:true},{key:'content',label:'Nội dung',required:true,multiline:true}], summary: [['topic','Chủ đề'],['status','Trạng thái'],['version','Phiên bản']] },
  creditPackages: { title: 'Gói credit', path: '/api/admin/credit-packages', unpaged: true, fields: [{key:'name',label:'Tên gói',required:true},{key:'description',label:'Mô tả',multiline:true},{key:'amountVnd',label:'Giá (VNĐ, bội số 1.000)',required:true,numeric:true,min:10000,integer:true},{key:'bonusCredits',label:'Credit tặng thêm',numeric:true,min:0,integer:true,default:'0'},{key:'sortOrder',label:'Thứ tự',numeric:true,min:0,integer:true,default:'0'},{key:'active',label:'Trạng thái',options:[{value:'true',label:'Đang bán'},{value:'false',label:'Ngừng bán'}],default:'true'}], summary: [['amountVnd','Giá (VNĐ)'],['baseCredits','Credit cơ bản'],['bonusCredits','Credit tặng'],['active','Đang bán']] },
  orders: { title: 'Đơn nạp credit', path: '/api/admin/payment-orders', readonly:true, summary:[['orderCode','Mã đơn'],['userId','Tài khoản'],['amountVnd','Số tiền (VNĐ)'],['grantCredits','Credit'],['gateway','Cổng thanh toán'],['status','Trạng thái'],['createdAt','Thời gian']] },
  ledger: { title: 'Sổ giao dịch credit', path:'/api/admin/credit-ledger', readonly:true, summary:[['userId','Tài khoản'],['type','Loại giao dịch'],['availableDelta','Thay đổi credit'],['availableAfter','Số dư sau'],['reason','Lý do'],['createdAt','Thời gian']] },
  usage: { title:'Sử dụng AI',path:'/api/admin/ai-usage',readonly:true,summary:[['userId','Tài khoản'],['taskType','Tác vụ'],['status','Trạng thái'],['settledCredits','Credit tính phí'],['createdAt','Thời gian']] },
  shortfalls: { title:'Thiếu credit',path:'/api/admin/credit-shortfalls',readonly:true,summary:[['userId','Tài khoản'],['taskType','Tác vụ'],['billingShortfall','Credit thiếu'],['reservedCredits','Credit giữ chỗ'],['createdAt','Thời gian']] },
};
export function formPayload(fields: Field[], values: Record<string, string>, editing: boolean): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (editing && field.createOnly) continue;
    const rawValue = values[field.key] || '';
    const value = field.password ? rawValue : rawValue.trim();
    if (field.password) {
      if (!value && editing) continue;
      if (!isValidPassword(value)) throw new Error(PASSWORD_ERROR);
    }
    if (field.required && !value) throw new Error(`Vui lòng nhập ${field.label.toLowerCase()}.`);
    if (field.numeric) {
      if (!value) continue;
      const number = Number(value);
      if (!Number.isFinite(number) || (field.integer && !Number.isInteger(number)) || (field.min !== undefined && number < field.min)) throw new Error(`${field.label} không hợp lệ.`);
      result[field.key] = number;
    } else if (field.key === 'active') result[field.key] = value === 'true';
    else if (value || field.multiline || field.key === 'email') result[field.key] = value;
  }
  if (result.username && String(result.username).length < 3) throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự.');
  if (result.amountVnd !== undefined && (Number(result.amountVnd) % 1000 !== 0 || Number(result.amountVnd) > 50000000)) throw new Error('Giá phải là bội số 1.000 và không vượt quá 50.000.000 VNĐ.');
  return result;
}
export function listPath(resource: Resource, page: number, keyword: string, status: string) {
  const params = new URLSearchParams({ ...resource.query, page: String(page), limit: '20' });
  if (resource.search && keyword.trim()) params.set(resource.search, keyword.trim());
  if (status) params.set('status', status);
  return resource.unpaged ? resource.path : `${resource.path}?${params.toString()}`;
}

