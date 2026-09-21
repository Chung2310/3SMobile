import { Ionicons } from '@expo/vector-icons';

export interface AdminSectionItem {
  key: string;
  title: string;
  desc: string;
  iconName: keyof typeof Ionicons.glyphMap;
  badge?: string;
  superOnly?: boolean;
}

export interface AdminSectionCategory {
  title: string;
  items: AdminSectionItem[];
}

export const SECTION_CATEGORIES: AdminSectionCategory[] = [
  {
    title: 'NHÂN SỰ & HỘI VIÊN',
    items: [
      {
        key: 'pts',
        title: 'Huấn luyện viên',
        desc: 'Quản lý HLV, hồ sơ chuyên môn',
        iconName: 'people-outline',
      },
      {
        key: 'customers',
        title: 'Khách hàng',
        desc: 'Danh sách và thông tin học viên',
        iconName: 'person-add-outline',
      },
      {
        key: 'transfers',
        title: 'Lịch sử chuyển giao',
        desc: 'Hồ sơ chuyển giao giữa các HLV',
        iconName: 'swap-horizontal-outline',
      },
      {
        key: 'batchTransfers',
        title: 'Chuyển giao hàng loạt',
        desc: 'Điều chuyển học viên số lượng lớn',
        iconName: 'git-branch-outline',
      },
      {
        key: 'accounts',
        title: 'Tài khoản Quản trị',
        desc: 'Phân quyền tài khoản quản trị viên',
        iconName: 'shield-checkmark-outline',
        superOnly: true,
      },
    ],
  },
  {
    title: 'GÓI TẬP & KHO TRI THỨC',
    items: [
      {
        key: 'packages',
        title: 'Gói tập mẫu',
        desc: 'Thiết lập số buổi, thời hạn, giá',
        iconName: 'barbell-outline',
      },
      {
        key: 'knowledge',
        title: 'Tri thức AI',
        desc: 'Bài viết và tài liệu huấn luyện AI',
        iconName: 'book-outline',
      },
      {
        key: 'images',
        title: 'Kho ảnh món ăn',
        desc: 'Thư viện hình ảnh thực đơn dinh dưỡng',
        iconName: 'images-outline',
      },
      {
        key: 'features',
        title: 'Tính năng hệ thống',
        desc: 'Bật/tắt các module tính năng',
        iconName: 'toggle-outline',
      },
    ],
  },
  {
    title: 'TÀI CHÍNH & TÍN DỤNG AI',
    items: [
      {
        key: 'credits',
        title: 'Điều chỉnh Credit',
        desc: 'Cộng/trừ credit thủ công cho tài khoản',
        iconName: 'wallet-outline',
      },
      {
        key: 'pricing',
        title: 'Bảng giá tác vụ AI',
        desc: 'Cấu hình chi phí xử lý từng tác vụ',
        iconName: 'pricetags-outline',
      },
      {
        key: 'ledger',
        title: 'Sổ cái giao dịch',
        desc: 'Biến động số dư credit toàn hệ thống',
        iconName: 'file-tray-full-outline',
      },
      {
        key: 'usage',
        title: 'Nhật ký dùng AI',
        desc: 'Thống kê lưu lượng và chi phí AI',
        iconName: 'stats-chart-outline',
      },
      {
        key: 'shortfalls',
        title: 'Cảnh báo thiếu hụt',
        desc: 'Các tác vụ bị thiếu credit giữ chỗ',
        iconName: 'alert-circle-outline',
      },
    ],
  },
];
