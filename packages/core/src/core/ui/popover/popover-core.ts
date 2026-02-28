import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

/** Which side of the trigger the popup is placed on. */
export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

/** Alignment of the popup along the cross axis of the trigger. */
export type PopoverAlign = 'start' | 'center' | 'end';

/** Configuration props shared by all popover platform layers. */
export interface PopoverProps {
  /** Which side of the trigger to place the popup. @defaultValue `'top'` */
  side?: PopoverSide | undefined;
  /** Alignment along the cross axis. @defaultValue `'center'` */
  align?: PopoverAlign | undefined;
  /**
   * Controls the modality of the popover.
   *
   * - `false` (default): non-modal; background content remains interactive.
   * - `true`: modal; sets `aria-modal="true"` on the popup.
   * - `'trap-focus'`: reserved for future focus-trapping behavior. Does NOT
   *   set `aria-modal` — focus trapping is behavioral, not semantic.
   *
   * @defaultValue `false`
   */
  modal?: boolean | 'trap-focus' | undefined;
  /** Close when the Escape key is pressed. @defaultValue `true` */
  closeOnEscape?: boolean | undefined;
  /** Close when clicking outside the trigger and popup. @defaultValue `true` */
  closeOnOutsideClick?: boolean | undefined;
}

/** Root-level props that extend `PopoverProps` with open state and hover behavior. */
export interface PopoverRootProps extends PopoverProps {
  /** Controlled open state. When set, the consumer owns open/close transitions. */
  open?: boolean | undefined;
  /** Initial open state for uncontrolled mode. @defaultValue `false` */
  defaultOpen?: boolean | undefined;
  /** Open the popover on pointer hover (requires `(hover: hover)` media). @defaultValue `false` */
  openOnHover?: boolean | undefined;
  /** Delay in ms before opening on hover. @defaultValue `300` */
  delay?: number | undefined;
  /** Delay in ms before closing after pointer leaves. @defaultValue `0` */
  closeDelay?: number | undefined;
}

/**
 * Interaction state managed by `createPopover()` via `createState()`.
 * The UI layer subscribes to this but never writes it directly.
 */
export interface PopoverInteraction {
  /** Whether the popover is currently open. */
  open: boolean;
  /**
   * Current transition phase. Follows the lifecycle:
   * `closed` → `opening` → `open` → `closing` → `closed`.
   *
   * Use `data-transition-status` in CSS to animate enter/exit.
   */
  transitionStatus: 'closed' | 'opening' | 'open' | 'closing';
}

/**
 * Full popover state, combining interaction state with resolved configuration.
 * Platform layers derive this via `PopoverCore.getState()`.
 */
export interface PopoverState extends PopoverInteraction {
  /** Resolved placement side. */
  side: PopoverSide;
  /** Resolved cross-axis alignment. */
  align: PopoverAlign;
  /** Resolved modality. */
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
      transitionStatus: interaction.transitionStatus,
      side: this.#props.side,
      align: this.#props.align,
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
