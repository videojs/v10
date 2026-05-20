'use client';

import type { StateAttrMap, TooltipCore } from '@videojs/core';
import type { MediaContainer, PositioningBoundary, TooltipApi } from '@videojs/core/dom';
import { createContext, useContext } from 'react';

/** Internal state shared between Tooltip compound parts. */
export interface TooltipContextValue {
  /** Core state machine for the tooltip. */
  core: TooltipCore;
  /** Imperative tooltip handle returned by `createTooltip`. */
  tooltip: TooltipApi;
  /** Snapshot of the current tooltip state for rendered parts. */
  state: TooltipCore.State;
  /** Mapping of state fields to `data-*` attributes for styling. */
  stateAttrMap: StateAttrMap<TooltipCore.State>;
  /** CSS anchor name used to position the popup against its trigger. */
  anchorName: string;
  /** Stable ID for the popup element. */
  popupId: string;
  /** Current tooltip text content, derived from the trigger (e.g. button label). */
  content: string | undefined;
  /** Setter used by triggers to publish their accessible label as tooltip content. */
  setContent: (content: string | undefined) => void;
  /** Boundary used to constrain the popup size. */
  boundary: PositioningBoundary;
  /** Surrounding player container, or `null` when used outside a player. */
  container: MediaContainer | null;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

export const TooltipContextProvider = TooltipContext.Provider;

/** Read the surrounding Tooltip context. Throws when used outside a `Tooltip.Root`. */
export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error('Tooltip compound components must be used within a Tooltip.Root');
  return ctx;
}

/** Read the surrounding Tooltip context if present, returning `null` outside a `Tooltip.Root`. */
export function useOptionalTooltipContext(): TooltipContextValue | null {
  return useContext(TooltipContext);
}
