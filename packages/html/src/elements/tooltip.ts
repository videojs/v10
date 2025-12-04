import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';

import { Tooltip as CoreTooltip } from '@videojs/core';
import { getDocumentOrShadowRoot } from '@videojs/utils/dom';

import { getCoreState, getPropsFromAttrs, toConnectedHTMLComponent } from '../utils/component-factory';

type Placement = 'top' | 'top-start' | 'top-end';

export type TooltipState = Prettify<ReturnType<CoreTooltip['getState']>>;

export const getTooltipState: StateHook<Tooltip, TooltipState> = (element, _mediaStore) => {
  const coreState = getCoreState(CoreTooltip, getPropsFromAttrs(element));
  return {
    ...coreState,
  };
};

export const getTooltipProps: PropsHook<Tooltip, TooltipState> = (element, state) => {
  if (state._popoverElement !== element) {
    state._setPopoverElement(element);
  }

  const triggerElement = getDocumentOrShadowRoot(element)?.querySelector(
    `[commandfor="${element.id}"]`,
  ) as HTMLElement | null;

  if (state._triggerElement !== triggerElement) {
    state._setTriggerElement(triggerElement);
  }

  const mediaContainer = element.closest('media-container') as HTMLElement | null;
  if (state._boundingBoxElement !== mediaContainer) {
    state._setBoundingBoxElement(mediaContainer);
  }

  return {
    'data-side': state.placement,
    'data-starting-style': state._transitionStatus === 'initial',
    'data-open': state._transitionStatus === 'initial' || state._transitionStatus === 'open',
    'data-ending-style': state._transitionStatus === 'close' || state._transitionStatus === 'unmounted',
    'data-closed': state._transitionStatus === 'close' || state._transitionStatus === 'unmounted',
    style: {
      ...state._popoverStyle,
    },
  };
};

export class Tooltip extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'id',
      'open-on-hover',
      'delay',
      'close-delay',
      'side',
      'side-offset',
      'track-cursor-axis',
      'collision-padding',
    ];
  }

  get openOnHover(): boolean {
    return this.hasAttribute('open-on-hover');
  }

  get delay(): number {
    return Number.parseInt(this.getAttribute('delay') ?? '0', 10);
  }

  get closeDelay(): number {
    return Number.parseInt(this.getAttribute('close-delay') ?? '0', 10);
  }

  get side(): Placement {
    return this.getAttribute('side') as Placement;
  }

  get sideOffset(): number {
    return Number.parseInt(this.getAttribute('side-offset') ?? '0', 10);
  }

  get trackCursorAxis(): 'x' | undefined {
    const value = this.getAttribute('track-cursor-axis');
    return value === 'x' ? value : undefined;
  }

  get collisionPadding(): number {
    return Number.parseInt(this.getAttribute('collision-padding') ?? '0', 10);
  }
}

export const TooltipElement: ConnectedComponentConstructor<Tooltip, TooltipState> = toConnectedHTMLComponent(
  Tooltip,
  getTooltipState,
  getTooltipProps,
  'Tooltip',
);
