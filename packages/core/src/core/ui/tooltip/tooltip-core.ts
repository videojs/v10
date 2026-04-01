import { defaults } from '@videojs/utils/object';
import { isUndefined } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { PopoverAlign, PopoverSide } from '../popover/popover-core';
import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';

export interface TooltipProps {
  /** Which side of the trigger the tooltip appears on. */
  side?: PopoverSide | undefined;
  /** Alignment of the tooltip along the trigger's edge. */
  align?: PopoverAlign | undefined;
  /** Controlled open state. */
  open?: boolean | undefined;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean | undefined;
  /** Delay in ms before opening on hover. */
  delay?: number | undefined;
  /** Delay in ms before closing after pointer leaves. */
  closeDelay?: number | undefined;
  /** When true, hovering the popup does not keep it open. */
  disableHoverablePopup?: boolean | undefined;
  /** When true, the tooltip is disabled and will not open. */
  disabled?: boolean | undefined;
}

export interface TooltipInput extends TransitionState {}

export interface TooltipState extends TransitionFlags {
  /** Whether the tooltip is currently visible. */
  open: boolean;
  /** Current phase of the transition lifecycle. */
  status: TransitionStatus;
  /** Which side of the trigger the tooltip is positioned on. */
  side: PopoverSide;
  /** How the tooltip is aligned relative to the specified side. */
  align: PopoverAlign;
}

export class TooltipCore {
  static readonly defaultProps: NonNullableObject<TooltipProps> = {
    side: 'top',
    align: 'center',
    open: false,
    defaultOpen: false,
    delay: 600,
    closeDelay: 0,
    disableHoverablePopup: true,
    disabled: false,
  };

  #props = { ...TooltipCore.defaultProps };

  constructor(props?: TooltipProps) {
    if (props) this.setProps(props);
  }

  setProps(props: TooltipProps): void {
    this.#props = defaults(props, TooltipCore.defaultProps);
  }

  #input: TooltipInput | null = null;
  #content: string | undefined;

  setInput(input: TooltipInput): void {
    this.#input = input;
  }

  setContent(content: string | undefined): void {
    this.#content = content;
  }

  getState(): TooltipState {
    const input = this.#input!;
    return {
      open: input.active,
      status: input.status,
      side: this.#props.side,
      align: this.#props.align,
      ...getTransitionFlags(input.status),
    };
  }

  getTriggerAttrs(state: TooltipState, popupId?: string) {
    // Always return both keys so incremental attribute updaters (e.g.
    // applyElementProps in HTML) remove the stale attribute when modes switch.
    if (!isUndefined(this.#content)) {
      // Content forwarded from trigger — tooltip IS the accessible label.
      // aria-labelledby is persistent because the popup must always provide
      // the accessible name regardless of tooltip visibility.
      return { 'aria-labelledby': popupId, 'aria-describedby': undefined };
    }

    // No forwarded content — tooltip is a supplementary description.
    return { 'aria-describedby': state.open ? popupId : undefined, 'aria-labelledby': undefined };
  }

  getPopupAttrs(_state: TooltipState) {
    return {
      popover: 'manual' as const,
      role: 'tooltip',
    };
  }
}

export namespace TooltipCore {
  export type Props = TooltipProps;
  export type State = TooltipState;
  export type Input = TooltipInput;
}
