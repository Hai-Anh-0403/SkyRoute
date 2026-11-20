'use client';

import dynamic from 'next/dynamic';
import type { MapCanvasProps } from './MapCanvas';

function MapSkeleton() {
  return (
    <div className="flex h-full min-h-[420px] w-full animate-pulse items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
      Đang tải bản đồ không gian SkyRoute...
    </div>
  );
}

const DynamicMapCanvas = dynamic(
  () => import('./MapCanvas').then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

export function InteractiveMap(props: MapCanvasProps) {
  return <DynamicMapCanvas {...props} />;
}
