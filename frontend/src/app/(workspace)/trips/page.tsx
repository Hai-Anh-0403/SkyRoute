import type { Metadata } from 'next';
import { TripsDashboard } from '@/features/itinerary-planner';

export const metadata: Metadata = {
  title: 'Chuyến đi của bạn | SkyRoute',
  description: 'Quản lý danh sách chuyến đi và lập lịch trình du lịch thông minh.',
};

export default function TripsPage() {
  return <TripsDashboard />;
}
