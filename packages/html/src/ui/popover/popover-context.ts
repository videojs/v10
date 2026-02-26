import type { PopoverCore } from '@videojs/core';
import type { Popover } from '@videojs/core/dom';
import { type Context, createContext } from '@videojs/element/context';
import type { State } from '@videojs/store';

const POPOVER_CONTEXT_KEY = Symbol('@videojs/popover');

export interface PopoverContextValue {
  core: PopoverCore;
  popover: Popover;
  interaction: State<PopoverCore.Interaction>;
  anchorName: string;
  popupId: string;
}

export type PopoverContext = Context<typeof POPOVER_CONTEXT_KEY, PopoverContextValue>;

export const popoverContext: PopoverContext = createContext<PopoverContextValue, typeof POPOVER_CONTEXT_KEY>(
  POPOVER_CONTEXT_KEY
);
