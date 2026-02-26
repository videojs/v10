'use client';

import type { PopoverCore } from '@videojs/core';
import type { Popover } from '@videojs/core/dom';
import { createContext, useContext } from 'react';

export interface PopoverContextValue {
  core: PopoverCore;
  popover: Popover;
  state: PopoverCore.State;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

export const PopoverContextProvider = PopoverContext.Provider;

export function usePopoverContext(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error('Popover compound components must be used within a Popover.Root');
  return ctx;
}
