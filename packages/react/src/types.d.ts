declare global {
  namespace React {
    interface HTMLAttributes<_T> {
      popover?: 'auto' | 'manual' | string;
      commandfor?: string;
    }
  }
}

declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';

  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: null | string
  ): ReactPortal;
}

declare module 'react-dom/server' {
  import type { ReactNode } from 'react';

  export function renderToString(children: ReactNode): string;
}
