import type { NonNullableObject } from '@videojs/utils/types';

export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

export type PopoverAlign = 'start' | 'center' | 'end';

export interface PopoverProps {
  /** Which side of the trigger the popup appears on. */
  side?: PopoverSide | undefined;
  /** Alignment of the popup along the trigger's edge. */
  align?: PopoverAlign | undefined;
  /**
   * - `false` (default): non-modal; background content remains interactive.
   * - `true`: modal; sets `aria-modal="true"` on the popup.
   * - `'trap-focus'`: reserved for future focus-trapping behavior.
   */
  modal?: boolean | 'trap-focus' | undefined;
  /** Close the popup when the Escape key is pressed. */
  closeOnEscape?: boolean | undefined;
  /** Close the popup when clicking outside the trigger and popup. */
  closeOnOutsideClick?: boolean | undefined;
  /** Controlled open state. When set, the consumer is responsible for toggling. */
  open?: boolean | undefined;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean | undefined;
  /** Open the popup on pointer hover instead of click. */
  openOnHover?: boolean | undefined;
  /** Delay in ms before opening on hover. */
  delay?: number | undefined;
  /** Delay in ms before closing after pointer leaves. */
  closeDelay?: number | undefined;
}

export const POPOVER_DEFAULT_PROPS: NonNullableObject<PopoverProps> = {
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
