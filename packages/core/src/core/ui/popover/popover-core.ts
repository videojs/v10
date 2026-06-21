import { defaults } from '@videojs/utils/object';

import type { TransitionFlags, TransitionState, TransitionStatus } from '../transition';
import { getTransitionFlags } from '../transition';
import { POPOVER_DEFAULT_PROPS, type PopoverAlign, type PopoverProps, type PopoverSide } from './props';

/**
 * The raw transition state managed by `createTransition`. Uses `active`
 * (not `open`) to distinguish the generic transition state machine from the
 * domain-specific `PopoverState.open`.
 */
export interface PopoverInput extends TransitionState {}

export interface PopoverState extends TransitionFlags {
  open: boolean;
  status: TransitionStatus;
  side: PopoverSide;
  align: PopoverAlign;
  modal: boolean | 'trap-focus';
}

export class PopoverCore {
  static readonly defaultProps = POPOVER_DEFAULT_PROPS;

  #props = { ...PopoverCore.defaultProps };

  constructor(props?: PopoverProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PopoverProps): void {
    this.#props = defaults(props, PopoverCore.defaultProps);
  }

  #input: PopoverInput | null = null;

  setInput(input: PopoverInput): void {
    this.#input = input;
  }

  getState(): PopoverState {
    const input = this.#input!;
    return {
      open: input.active,
      status: input.status,
      side: this.#props.side,
      align: this.#props.align,
      modal: this.#props.modal,
      ...getTransitionFlags(input.status),
    };
  }

  getTriggerAttrs(state: PopoverState, popupId?: string) {
    return {
      'aria-expanded': state.open && state.status !== 'ending' ? 'true' : 'false',
      'aria-haspopup': 'dialog',
      'aria-controls': popupId,
    };
  }

  getPopupAttrs(state: PopoverState) {
    return {
      popover: 'manual' as const,
      role: 'dialog',
      'aria-modal': state.modal === true ? 'true' : undefined,
    };
  }
}

export namespace PopoverCore {
  export type Props = PopoverProps;
  export type State = PopoverState;
  export type Input = PopoverInput;
}
