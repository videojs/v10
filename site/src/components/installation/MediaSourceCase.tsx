import { useStore } from '@nanostores/react';

import { renderer } from '@/stores/installation';
import type { Renderer } from '@/utils/installation/types';

interface MediaSourceCaseProps {
  /** Show the children only while one of these media sources is selected. */
  renderers: Renderer[];
  children: React.ReactNode;
}

/** Client-side gate for installation prose that only applies to some media source picks. */
export default function MediaSourceCase({ renderers, children }: MediaSourceCaseProps) {
  const $renderer = useStore(renderer);
  if (!renderers.includes($renderer)) return null;

  return children;
}
