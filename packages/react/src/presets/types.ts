import type { CSSProperties, PropsWithChildren } from 'react';

export type BaseSkinProps<T = unknown> = PropsWithChildren<
  T & {
    style?: CSSProperties;
    className?: string;
  }
>;
