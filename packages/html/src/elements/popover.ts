import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';

import { Popover as CorePopover } from '@videojs/core';
import { getDocumentOrShadowRoot } from '@videojs/utils/dom';

import { getCoreState, getPropsFromAttrs, toConnectedHTMLComponent } from '../utils/component-factory';

type Placement = 'top' | 'top-start' | 'top-end';

export type PopoverState = Prettify<ReturnType<CorePopover['getState']>>;

export const getPopoverState: StateHook<Popover, PopoverState> = (element, _mediaStore) => {
  const coreState = getCoreState(CorePopover, getPropsFromAttrs(element));
  return {
    ...coreState,
  };
};

export const getPopoverProps: PropsHook<Popover, PopoverState> = (element, state) => {
  if (state._popoverElement !== element) {
    state._setPopoverElement(element);
  }

  const triggerElement = getDocumentOrShadowRoot(element)?.querySelector(
    `[commandfor="${element.id}"]`,
  ) as HTMLElement | null;
  if (state._triggerElement !== triggerElement) {
    state._setTriggerElement(triggerElement);
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

export class Popover extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['id', 'open-on-hover', 'delay', 'close-delay', 'side', 'side-offset'];
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
}

export const PopoverElement: ConnectedComponentConstructor<Popover, PopoverState> = toConnectedHTMLComponent(
  Popover,
  getPopoverState,
  getPopoverProps,
  'Popover',
);
