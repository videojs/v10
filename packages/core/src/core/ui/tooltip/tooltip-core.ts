import { defaults } from '@videojs/utils/object';

import type { PopoverAlign, PopoverSide } from '../popover/props';
import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';
import { TOOLTIP_DEFAULT_PROPS, type TooltipProps } from './props';

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
  static readonly defaultProps = TOOLTIP_DEFAULT_PROPS;

  #props = { ...TooltipCore.defaultProps };

  constructor(props?: TooltipProps) {
    if (props) this.setProps(props);
  }

  setProps(props: TooltipProps): void {
    this.#props = defaults(props, TooltipCore.defaultProps);
  }

  #input: TooltipInput | null = null;

  setInput(input: TooltipInput): void {
    this.#input = input;
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

  getPopupAttrs(_state: TooltipState) {
    return {
      popover: 'manual' as const,
      role: 'presentation' as const,
    };
  }
}

export namespace TooltipCore {
  export type Props = TooltipProps;
  export type State = TooltipState;
  export type Input = TooltipInput;
}

export type { TooltipProps } from './props';
