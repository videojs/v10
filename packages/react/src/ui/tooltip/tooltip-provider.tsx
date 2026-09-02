import { TooltipGroupCore, type TooltipGroupProps } from '@videojs/core';
import type { ReactNode } from 'react';
import { useInsertionEffect, useState } from 'react';

import { TooltipGroupContextProvider } from './group-context';

export interface TooltipProviderProps extends TooltipGroupProps {
  children?: ReactNode;
}

export function TooltipProvider({ delay, closeDelay, timeout, children }: TooltipProviderProps): ReactNode {
  const [group] = useState(() => new TooltipGroupCore({ delay, closeDelay, timeout }));

  // Insertion timing publishes the props before any descendant tooltip's layout effect reads the shared group, while
  // still skipping abandoned renders.
  useInsertionEffect(() => {
    group.setProps({ delay, closeDelay, timeout });
  }, [group, delay, closeDelay, timeout]);

  return <TooltipGroupContextProvider value={{ group }}>{children}</TooltipGroupContextProvider>;
}

export namespace TooltipProvider {
  export type Props = TooltipProviderProps;
}
