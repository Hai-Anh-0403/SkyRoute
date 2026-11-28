import type { Metadata } from 'next';
import { AdminCatalogDashboard } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Quản trị Catalog | SkyRoute',
  description: 'Quản lý danh mục địa điểm và cơ sở lưu trú SkyRoute.',
};

export default function AdminPage() {
  return <AdminCatalogDashboard />;
}
