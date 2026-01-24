import { Tooltip as CoreTooltip } from '@videojs/core';
import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';
import { getCoreState, getPropsFromAttrs, toConnectedHTMLComponent } from '../utils/component-factory';
import { getPopoverProps, Popover } from './popover';

export type TooltipState = Prettify<ReturnType<CoreTooltip['getState']>>;

export const getTooltipState: StateHook<Tooltip, TooltipState> = (element, _mediaStore) => {
  const coreState = getCoreState(CoreTooltip, getPropsFromAttrs(element));
  return {
    ...coreState,
  };
};

export const getTooltipProps: PropsHook<Tooltip, TooltipState> = getPopoverProps;

export class Tooltip extends Popover {
  static get observedAttributes(): string[] {
    return [...Popover.observedAttributes, 'track-cursor-axis'];
  }

  get trackCursorAxis(): 'x' | null {
    const value = this.getAttribute('track-cursor-axis');
    return value === 'x' ? value : null;
  }
}

export const TooltipElement: ConnectedComponentConstructor<Tooltip, TooltipState> = toConnectedHTMLComponent(
  Tooltip,
  getTooltipState,
  getTooltipProps,
  'Tooltip'
);
