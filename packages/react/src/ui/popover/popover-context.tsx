'use client';

import type { PopoverCore, StateAttrMap } from '@videojs/core';
import type { PopoverHandle } from '@videojs/core/dom';
import { createContext, useContext } from 'react';

export interface PopoverContextValue {
  core: PopoverCore;
  popover: PopoverHandle;
  state: PopoverCore.State;
  stateAttrMap: StateAttrMap<PopoverCore.State>;
  anchorName: string;
  popupId: string;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

export const PopoverContextProvider = PopoverContext.Provider;

export function usePopoverContext(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error('Popover compound components must be used within a Popover.Root');
  return ctx;
}
