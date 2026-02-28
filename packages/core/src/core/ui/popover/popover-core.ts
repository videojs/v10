import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';
import type { TransitionState } from '../types';

export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

export type PopoverAlign = 'start' | 'center' | 'end';

export interface PopoverProps {
  /** Which side of the trigger the popup appears on. @defaultValue `'top'` */
  side?: PopoverSide | undefined;
  /** Alignment of the popup along the trigger's edge. @defaultValue `'center'` */
  align?: PopoverAlign | undefined;
  /**
   * - `false` (default): non-modal; background content remains interactive.
   * - `true`: modal; sets `aria-modal="true"` on the popup.
   * - `'trap-focus'`: reserved for future focus-trapping behavior.
   */
  modal?: boolean | 'trap-focus' | undefined;
  /** Close the popup when the Escape key is pressed. @defaultValue `true` */
  closeOnEscape?: boolean | undefined;
  /** Close the popup when clicking outside the trigger and popup. @defaultValue `true` */
  closeOnOutsideClick?: boolean | undefined;
  /** Controlled open state. When set, the consumer is responsible for toggling. */
  open?: boolean | undefined;
  /** Initial open state for uncontrolled usage. @defaultValue `false` */
  defaultOpen?: boolean | undefined;
  /** Open the popup on pointer hover instead of click. @defaultValue `false` */
  openOnHover?: boolean | undefined;
  /** Delay in ms before opening on hover. @defaultValue `300` */
  delay?: number | undefined;
  /** Delay in ms before closing after pointer leaves. @defaultValue `0` */
  closeDelay?: number | undefined;
}

export interface PopoverInteraction extends TransitionState {}

export interface PopoverState extends PopoverInteraction {
  /** Resolved side the popup is positioned on. */
  side: PopoverSide;
  /** Resolved alignment along the trigger's edge. */
  align: PopoverAlign;
  /** Resolved modal mode. */
  modal: boolean | 'trap-focus';
}

export class PopoverCore {
  static readonly defaultProps: NonNullableObject<PopoverProps> = {
    side: 'top',
    align: 'center',
    modal: false,
    closeOnEscape: true,
    closeOnOutsideClick: true,
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
  export type State = PopoverState;
  export type Interaction = PopoverInteraction;
}
