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
];
