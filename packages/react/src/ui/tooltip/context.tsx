'use client';

import type { StateAttrMap, TooltipCore } from '@videojs/core';
import type { TooltipApi } from '@videojs/core/dom';
import { createContext, useContext } from 'react';

export interface TooltipContextValue {
  core: TooltipCore;
  tooltip: TooltipApi;
  state: TooltipCore.State;
  stateAttrMap: StateAttrMap<TooltipCore.State>;
  anchorName: string;
  popupId: string;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

export const TooltipContextProvider = TooltipContext.Provider;

export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error('Tooltip compound components must be used within a Tooltip.Root');
  return ctx;
}
