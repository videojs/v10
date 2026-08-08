import type { CSSProperties, PropsWithChildren } from 'react';
import type { Poster } from '@/ui/poster';
import type { RenderProp } from '@/utils/types';

export type BaseSkinProps<T = unknown> = PropsWithChildren<
  T & {
    style?: CSSProperties;
    className?: string;
  }
>;

export type BaseVideoSkinProps<T = unknown> = BaseSkinProps<T> & {
  poster?: string | RenderProp<Poster.State> | undefined;
};
