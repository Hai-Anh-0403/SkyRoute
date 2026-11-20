import type { Metadata } from 'next';
import { TripWorkspace } from '@/features/itinerary-planner';

export const metadata: Metadata = {
  title: 'Lập lịch trình | SkyRoute Workspace',
  description: 'Không gian kéo-thả lịch trình 4 khung giờ kết hợp bản đồ không gian.',
};

export default async function TripWorkspacePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <TripWorkspace tripId={Number(tripId)} />;
}
