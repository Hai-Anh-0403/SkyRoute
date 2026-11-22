'use client';

import dynamic from 'next/dynamic';
import type { CentroidMapPinProps } from './CentroidMapLayer';

const DynamicCentroidMapLayer = dynamic(
  () => import('./CentroidMapLayer').then((mod) => mod.CentroidMapLayer),
  {
    ssr: false,
    loading: () => null,
  },
);

export function CentroidMapPin(props: CentroidMapPinProps) {
  return <DynamicCentroidMapLayer {...props} />;
}
