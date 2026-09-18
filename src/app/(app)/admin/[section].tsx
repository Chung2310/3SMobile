import React from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AdminResource } from '@/components/admin/AdminResource';
import { AdminPtsManagement } from '@/components/admin/AdminPtsManagement';
import { AdminCustomersManagement } from '@/components/admin/AdminCustomersManagement';
import { AdminTransfersManagement } from '@/components/admin/AdminTransfersManagement';
import { AdminCreditAdjustment } from '@/components/admin/AdminCreditAdjustment';
import { AdminFeatures } from '@/components/admin/AdminFeatures';
import { AdminFoodImages } from '@/components/admin/AdminFoodImages';
import { AdminBatchTransfer } from '@/components/admin/AdminBatchTransfer';
import { AdminAccountsManagement } from '@/components/admin/AdminAccountsManagement';
import { AdminPackagesManagement } from '@/components/admin/AdminPackagesManagement';
import { AdminKnowledgeManagement } from '@/components/admin/AdminKnowledgeManagement';
import { AdminPricing } from '@/components/admin/AdminPricing';
import { AdminCreditPackages } from '@/components/admin/AdminCreditPackages';
import { AdminPaymentOrders } from '@/components/admin/AdminPaymentOrders';
import { AdminCreditLedger } from '@/components/admin/AdminCreditLedger';
import { AdminAiUsage } from '@/components/admin/AdminAiUsage';
import { AdminCreditShortfalls } from '@/components/admin/AdminCreditShortfalls';
import { Notice } from '@/components/admin/AdminUI';
import { resources } from '@/services/adminResources';
import { useAuth } from '@/context/AuthContext';

export default function AdminSection() {
  const { section: raw } = useLocalSearchParams<{ section: string }>();
  const section = Array.isArray(raw) ? raw[0] : raw;
  const { session } = useAuth();
  const resource = resources[section];
  if (resource?.superOnly && session?.user.role !== 'SUPER_ADMIN') return <Redirect href="/(app)/admin" />;

  const title =
    ({
      images: 'Kho ảnh món ăn',
      batchTransfers: 'Chuyển giao hàng loạt',
      features: 'Tính năng hệ thống',
      credits: 'Điều chỉnh credit',
      pricing: 'Bảng giá tác vụ AI',
      creditPackages: 'Gói nạp Credit',
      orders: 'Đơn thanh toán',
      ledger: 'Sổ cái giao dịch',
      usage: 'Nhật ký dùng AI',
      shortfalls: 'Cảnh báo thiếu hụt',
    } as Record<string, string>)[section] ||
    resource?.title ||
    'Quản trị';

  return (
    <Screen
      title={title.toLocaleUpperCase('vi-VN')}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(app)/admin/modules');
        }
      }}
    >
      {section === 'pts' ? (
        <AdminPtsManagement />
      ) : section === 'customers' ? (
        <AdminCustomersManagement />
      ) : section === 'transfers' ? (
        <AdminTransfersManagement />
      ) : section === 'accounts' ? (
        <AdminAccountsManagement />
      ) : section === 'packages' ? (
        <AdminPackagesManagement />
      ) : section === 'knowledge' ? (
        <AdminKnowledgeManagement />
      ) : section === 'images' ? (
        <AdminFoodImages />
      ) : section === 'features' ? (
        <AdminFeatures />
      ) : section === 'batchTransfers' ? (
        <AdminBatchTransfer />
      ) : section === 'credits' ? (
        <AdminCreditAdjustment />
      ) : section === 'pricing' ? (
        <AdminPricing />
      ) : section === 'creditPackages' ? (
        <AdminCreditPackages />
      ) : section === 'orders' ? (
        <AdminPaymentOrders />
      ) : section === 'ledger' ? (
        <AdminCreditLedger />
      ) : section === 'usage' ? (
        <AdminAiUsage />
      ) : section === 'shortfalls' ? (
        <AdminCreditShortfalls />
      ) : resource ? (
        <AdminResource key={section} resourceKey={section} />
      ) : (
        <Notice
          message="Không tìm thấy chức năng quản trị."
          retry={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(app)/admin/modules');
            }
          }}
        />
      )}
    </Screen>
  );
}
