import { PopoverDataAttrs } from '../popover/data';
import type { StateAttrMap } from '../types';
import type { VolumePopoverState } from './core';

/** Volume-specific state applied by VolumePopover adapters. */
export const VolumePopoverStateDataAttrs = {
  /** Indicates volume control availability (`available`, `unavailable`, or `unsupported`). */
  availability: 'data-availability',
  /** Present when volume level controls are unavailable. */
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<Pick<VolumePopoverState, 'availability' | 'hidden'>>;

/** All public VolumePopover data attributes exposed to component transforms. */
export const VolumePopoverDataAttrs = {
  ...PopoverDataAttrs,
  ...VolumePopoverStateDataAttrs,
} as const satisfies StateAttrMap<VolumePopoverState>;
