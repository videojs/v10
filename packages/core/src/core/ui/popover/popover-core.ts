import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';
import type { TransitionState } from '../types';

export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

export type PopoverAlign = 'start' | 'center' | 'end';

export interface PopoverProps {
  side?: PopoverSide | undefined;
  align?: PopoverAlign | undefined;
  /**
   * - `false` (default): non-modal; background content remains interactive.
   * - `true`: modal; sets `aria-modal="true"` on the popup.
   * - `'trap-focus'`: reserved for future focus-trapping behavior.
   */
  modal?: boolean | 'trap-focus' | undefined;
  closeOnEscape?: boolean | undefined;
  closeOnOutsideClick?: boolean | undefined;
}

export interface PopoverRootProps extends PopoverProps {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  openOnHover?: boolean | undefined;
  /** Delay in ms before opening on hover. */
  delay?: number | undefined;
  /** Delay in ms before closing after pointer leaves. */
  closeDelay?: number | undefined;
}

export interface PopoverInteraction extends TransitionState {}

export interface PopoverState extends PopoverInteraction {
  side: PopoverSide;
  align: PopoverAlign;
  modal: boolean | 'trap-focus';
}

export class PopoverCore {
  static readonly defaultProps: NonNullableObject<PopoverProps> = {
    side: 'top',
    align: 'center',
    modal: false,
    closeOnEscape: true,
    closeOnOutsideClick: true,
  };

  static readonly defaultRootProps: NonNullableObject<Omit<PopoverRootProps, keyof PopoverProps>> = {
    open: false,
    defaultOpen: false,
    openOnHover: false,
    delay: 300,
    closeDelay: 0,
  };

  #props = { ...PopoverCore.defaultProps };

  constructor(props?: PopoverProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PopoverProps): void {
    this.#props = defaults(props, PopoverCore.defaultProps);
  }

  getState(interaction: PopoverInteraction): PopoverState {
    return {
      open: interaction.open,
      status: interaction.status,
      side: this.#props.side,
      align: this.#props.align,
      modal: this.#props.modal,
    };
  }

  getTriggerAttrs(state: PopoverState, popupId?: string) {
    return {
      'aria-expanded': state.open ? 'true' : 'false',
      'aria-haspopup': 'dialog',
      'aria-controls': popupId,
    };
  }

  getPopupAttrs(state: PopoverState) {
    return {
      role: 'dialog',
      'aria-modal': state.modal === true ? 'true' : undefined,
      'data-starting-style': state.status === 'starting' ? '' : undefined,
      'data-ending-style': state.status === 'ending' ? '' : undefined,
    };
  }
}

export namespace PopoverCore {
  export type Props = PopoverProps;
  export type RootProps = PopoverRootProps;
  export type State = PopoverState;
  export type Interaction = PopoverInteraction;
}
