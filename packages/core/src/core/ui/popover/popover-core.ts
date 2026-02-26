import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

export type PopoverAlign = 'start' | 'center' | 'end';

export interface PopoverProps {
  side?: PopoverSide | undefined;
  align?: PopoverAlign | undefined;
  sideOffset?: number | undefined;
  alignOffset?: number | undefined;
  /**
   * Controls the modality of the popover.
   *
   * - `false` (default): non-modal; background content remains interactive.
   * - `true`: modal; sets `aria-modal="true"` on the popup.
   * - `'trap-focus'`: reserved for future focus-trapping behavior. Currently
   *   equivalent to `true` — consumers must implement focus trapping in
   *   their own UI layer.
   */
  modal?: boolean | 'trap-focus' | undefined;
  closeOnEscape?: boolean | undefined;
  closeOnOutsideClick?: boolean | undefined;
}

export interface PopoverRootProps extends PopoverProps {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  openOnHover?: boolean | undefined;
  delay?: number | undefined;
  closeDelay?: number | undefined;
}

/**
 * Interaction state managed by `createPopover()` via `createState()`.
 * The UI layer subscribes to this but never writes it directly.
 */
export interface PopoverInteraction {
  open: boolean;
  transitionStatus: 'closed' | 'opening' | 'open' | 'closing';
}

export interface PopoverState extends PopoverInteraction {
  side: PopoverSide;
  align: PopoverAlign;
  sideOffset: number;
  alignOffset: number;
  modal: boolean | 'trap-focus';
}

export class PopoverCore {
  static readonly defaultProps: NonNullableObject<PopoverProps> = {
    side: 'top',
    align: 'center',
    sideOffset: 0,
    alignOffset: 0,
    modal: false,
    closeOnEscape: true,
    closeOnOutsideClick: true,
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
      transitionStatus: interaction.transitionStatus,
      side: this.#props.side,
      align: this.#props.align,
      sideOffset: this.#props.sideOffset,
      alignOffset: this.#props.alignOffset,
      modal: this.#props.modal,
    };
  }

  getTriggerAttrs(state: PopoverState, popupId?: string) {
    return {
      'aria-expanded': state.open ? 'true' : 'false',
      'aria-haspopup': 'dialog',
      ...(popupId ? { 'aria-controls': popupId } : {}),
    };
  }

  getPopupAttrs(state: PopoverState) {
    return {
      role: 'dialog',
      'aria-modal': state.modal === true ? 'true' : undefined,
    };
  }
}

export namespace PopoverCore {
  export type Props = PopoverProps;
  export type RootProps = PopoverRootProps;
  export type State = PopoverState;
  export type Interaction = PopoverInteraction;
}
