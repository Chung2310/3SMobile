import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ShieldCheck, Users, Dumbbell, Bell, UserCheck } from 'lucide-react-native';
import { api } from '@/services/api/client';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { type AdminRecord, display } from '@/services/adminResources';
import { Button, Label, Notice, ui } from './AdminUI';
import { AdminForm } from './AdminForm';

interface Dashboard {
  totalPts: number; totalCustomers: number; openAlerts: number; activePackages: number;
  customerStats?: { active: number; lead: number; inactive: number };
  packageStats?: { totalSessions: number; remainingSessions: number; completedSessions: number };
  ptWorkload?: { ptId: string; fullName: string; username: string; activeCustomers: number; totalCustomers: number; activePackages: number }[];
  recentAlerts?: { _id: string; title: string; reason: string; customerName: string; ptName: string }[];
}
export function AdminOverview({ onNavigate }: { onNavigate: (key: string) => void }) {
  const [data, setData] = useState<Dashboard>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(false);
  const [params, setParams] = useState<AdminRecord>({});
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
    setLoading(true); setError('');
    const query = new URLSearchParams(Object.entries(params).map(([k,v]) => [k,String(v)]));
    void api.get<Dashboard>(`/api/dashboard/admin?${query}`).then(value => { if (active) setData(value); }).catch(e => { if (active) setError(messageOf(e)); }).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [params, reload]);
  return <View style={ui.gap}><View style={ui.card}><ShieldCheck color={colors.primary} size={32} /><Text style={ui.title}>TỔNG QUAN</Text><Label muted>Theo dõi đội ngũ, khách hàng và hoạt động phòng tập.</Label><Button secondary label="Lọc tổng quan" onPress={() => setFilter(true)} />{Object.keys(params).length > 0 && <><Label muted>{Object.entries(params).map(([k,v]) => `${k === 'customerStatus' ? 'Trạng thái' : k === 'ptId' ? 'PT' : k === 'fromDate' ? 'Từ ngày' : 'Đến ngày'}: ${v}`).join(' · ')}</Label><Button secondary label="Xóa bộ lọc" onPress={() => setParams({})} /></>}<Button secondary label="Làm mới" onPress={() => setReload(n => n + 1)} disabled={loading} /></View>{loading ? <View style={ui.card}><ActivityIndicator color={colors.primary} /><Label>Đang tải dữ liệu…</Label></View> : error ? <Notice message={error} retry={() => setReload(n => n + 1)} /> : data && <>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{[{label:'Huấn luyện viên',value:data.totalPts,Icon:UserCheck,key:'pts'},{label:'Khách hàng',value:data.totalCustomers,Icon:Users,key:'customers'},{label:'Gói tập hoạt động',value:data.activePackages,Icon:Dumbbell,key:'packages'},{label:'Cảnh báo đang mở',value:data.openAlerts,Icon:Bell,key:'alerts'}].map(({label,value,Icon,key}) => <View key={key} style={[ui.card,{width:'47%',flexGrow:1}]}><Icon color={colors.primary} size={24} /><Text style={ui.title}>{value ?? '—'}</Text><Label muted>{label}</Label>{key !== 'alerts' && <Button secondary label="Quản lý" onPress={() => onNavigate(key)} />}</View>)}</View>
    {data.customerStats && <View style={ui.card}><Text style={ui.heading}>Trạng thái khách hàng</Text><Label>Đang tập: {data.customerStats.active}</Label><Label>Tiềm năng: {data.customerStats.lead}</Label><Label>Ngừng hoạt động: {data.customerStats.inactive}</Label></View>}
    {data.packageStats && <View style={ui.card}><Text style={ui.heading}>Buổi tập trong gói</Text><Label>Tổng số buổi: {data.packageStats.totalSessions}</Label><Label>Đã hoàn thành: {data.packageStats.completedSessions}</Label><Label>Còn lại: {data.packageStats.remainingSessions}</Label></View>}
    <Text style={ui.heading}>Phân bổ khách hàng theo PT</Text>{data.ptWorkload?.length ? data.ptWorkload.map(pt => <View style={ui.card} key={pt.ptId}><Text numberOfLines={2} ellipsizeMode="tail" style={ui.heading}>{pt.fullName || pt.username}</Text><Label>{pt.activeCustomers} đang tập / {pt.totalCustomers} khách hàng</Label><Label muted>{pt.activePackages} gói đang hoạt động</Label></View>) : <Notice empty message="Chưa có dữ liệu phân bổ PT." retry={() => setReload(n => n + 1)} />}
    <Text style={ui.heading}>Cảnh báo gần đây</Text>{data.recentAlerts?.length ? data.recentAlerts.map(alert => <View style={ui.card} key={alert._id}><Bell size={24} color={colors.warning} /><Text numberOfLines={2} ellipsizeMode="tail" style={ui.heading}>{alert.title}</Text><Label>{alert.reason}</Label><Label muted>{alert.customerName} · {alert.ptName}</Label></View>) : <Notice empty message="Không có cảnh báo gần đây." retry={() => setReload(n => n + 1)} />}
    </>}{filter && <AdminForm title="Bộ lọc tổng quan" initial={params} fields={[{key:'ptId',label:'Huấn luyện viên',source:'/api/users?role=PT'},{key:'customerStatus',label:'Trạng thái khách hàng',options:[{value:'',label:'Tất cả'},{value:'ACTIVE',label:'Đang tập'},{value:'LEAD',label:'Tiềm năng'},{value:'INACTIVE',label:'Ngừng hoạt động'}]},{key:'fromDate',label:'Từ ngày (YYYY-MM-DD)'},{key:'toDate',label:'Đến ngày (YYYY-MM-DD)'}]} onClose={() => setFilter(false)} onSave={async payload => { for (const key of ['fromDate','toDate']) if (payload[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload[key])) || !Number.isFinite(Date.parse(String(payload[key]))) || new Date(String(payload[key])).toISOString().slice(0,10) !== payload[key])) throw new Error('Ngày không hợp lệ. Dùng định dạng YYYY-MM-DD.'); if (payload.fromDate && payload.toDate && String(payload.fromDate) > String(payload.toDate)) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.'); setParams(payload); }} />}</View>;
}
export function CreditAdjustment() {
  const [open,setOpen] = useState(false);
  const [result,setResult] = useState<AdminRecord>();
  return <View style={ui.card}><Text style={ui.heading}>Điều chỉnh credit</Text><Label muted>Cộng hoặc trừ credit cho tài khoản, kèm lý do để lưu lịch sử giao dịch.</Label><Button label="Điều chỉnh số dư" onPress={() => setOpen(true)} />{result && <Label>Số dư sau điều chỉnh: {display(result.availableCredits)} credit</Label>}{open && <AdminForm title="Điều chỉnh credit" description="Số dương để cộng, số âm để trừ credit. Kiểm tra tài khoản nhận trước khi lưu." fields={[{key:'userId',label:'Tài khoản',source:'/api/users',required:true},{key:'credits',label:'Số credit thay đổi',numeric:true,integer:true,required:true},{key:'reason',label:'Lý do',required:true,multiline:true}]} onClose={() => setOpen(false)} onSave={async payload => { if (!payload.credits) throw new Error('Số credit phải khác 0.'); if (String(payload.reason).length < 3) throw new Error('Lý do phải có ít nhất 3 ký tự.'); setResult(await api.post('/api/admin/credit-adjustments',payload)); }} />}</View>;
}
