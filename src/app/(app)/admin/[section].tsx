import React from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AdminResource } from '@/components/admin/AdminResource';
import { AdminPtsManagement } from '@/components/admin/AdminPtsManagement';
import { AdminCustomersManagement } from '@/components/admin/AdminCustomersManagement';
import { AdminTransfersManagement } from '@/components/admin/AdminTransfersManagement';
import { AdminFeatures } from '@/components/admin/AdminFeatures';
import { AdminFoodImages } from '@/components/admin/AdminFoodImages';
import { AdminBatchTransfer } from '@/components/admin/AdminBatchTransfer';
import { AdminAccountsManagement } from '@/components/admin/AdminAccountsManagement';
import { AdminPackagesManagement } from '@/components/admin/AdminPackagesManagement';
import { AdminKnowledgeManagement } from '@/components/admin/AdminKnowledgeManagement';
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
    } as Record<string, string>)[section] ||
    resource?.title ||
    'Quản trị';

  const isCustomSection = [
    'pts',
    'customers',
    'transfers',
    'accounts',
    'packages',
    'knowledge',
    'images',
    'features',
    'batchTransfers',
  ].includes(section);

  return (
    <Screen
      title={title}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(app)/admin/modules');
        }
      }}
      scroll={!isCustomSection}
      noPadding={isCustomSection}
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
