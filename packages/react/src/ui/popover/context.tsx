'use client';

import type { PopoverCore, StateAttrMap } from '@videojs/core';
import type { MediaContainer, PopoverApi, PositioningBoundary } from '@videojs/core/dom';
import { createContext, useContext } from 'react';

/** Internal state shared between Popover compound parts. */
export interface PopoverContextValue {
  /** Core state machine for the popover. */
  core: PopoverCore;
  /** Imperative popover handle returned by `createPopover`. */
  popover: PopoverApi;
  /** Snapshot of the current popover state for rendered parts. */
  state: PopoverCore.State;
  /** Mapping of state fields to `data-*` attributes for styling. */
  stateAttrMap: StateAttrMap<PopoverCore.State>;
  /** CSS anchor name used to position the popup against its trigger. */
  anchorName: string;
  /** Stable ID for the popup element. */
  popupId: string;
  /** Boundary used to constrain the popup size. */
  boundary: PositioningBoundary;
  /** Surrounding player container, or `null` when used outside a player. */
  container: MediaContainer | null;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

export const PopoverContextProvider = PopoverContext.Provider;

/** Read the surrounding Popover context. Throws when used outside a `Popover.Root`. */
export function usePopoverContext(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error('Popover compound components must be used within a Popover.Root');
  return ctx;
}
