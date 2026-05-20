'use client';

import { TooltipGroupCore, type TooltipGroupProps } from '@videojs/core';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { TooltipGroupContextProvider } from './group-context';

/** Props for the Tooltip.Provider component. */
export interface TooltipProviderProps extends TooltipGroupProps {
  /** Tooltip-using content rendered within shared group timing. */
  children?: ReactNode;
}

/** Shares hover/focus timing between nested `Tooltip.Root` instances — the next tooltip opens instantly while the group is warm. */
export function TooltipProvider({ delay, closeDelay, timeout, children }: TooltipProviderProps): ReactNode {
  const [group] = useState(() => new TooltipGroupCore({ delay, closeDelay, timeout }));
  group.setProps({ delay, closeDelay, timeout });

  return <TooltipGroupContextProvider value={{ group }}>{children}</TooltipGroupContextProvider>;
}

export namespace TooltipProvider {
  export type Props = TooltipProviderProps;
}
