import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { PopoverAlign, PopoverSide } from '../popover/popover-core';
import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';

/** Props for the tooltip core. */
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

/** Raw transition state pushed into the tooltip core. */
export interface TooltipInput extends TransitionState {}

/** Reactive state surfaced by the tooltip core. */
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

/** Behavior core for the tooltip — derives open state and ARIA wiring. */
export class TooltipCore {
  /** Default values applied when a prop is omitted. */
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

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: TooltipProps) {
    if (props) this.setProps(props);
  }

  /** Update props on the core. */
  setProps(props: TooltipProps): void {
    this.#props = defaults(props, TooltipCore.defaultProps);
  }

  #input: TooltipInput | null = null;

  /** Push transition input from the surrounding transition controller. */
  setInput(input: TooltipInput): void {
    this.#input = input;
  }

  /** Recompute and return the current state. */
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

  /** Compute popover and role attributes for the tooltip popup. */
  getPopupAttrs(_state: TooltipState) {
    return {
      popover: 'manual' as const,
      role: 'presentation' as const,
    };
  }
}

export namespace TooltipCore {
  /** Alias for {@link TooltipProps}. */
  export type Props = TooltipProps;
  /** Alias for {@link TooltipState}. */
  export type State = TooltipState;
  /** Alias for {@link TooltipInput}. */
  export type Input = TooltipInput;
}
