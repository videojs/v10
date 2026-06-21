import type { NonNullableObject } from '@videojs/utils/types';

import type { PopoverAlign, PopoverSide } from '../popover/props';

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

export interface TooltipGroupProps {
  /** Default open delay in ms for tooltips in this group. */
  delay?: number | undefined;
  /** Default close delay in ms for tooltips in this group. */
  closeDelay?: number | undefined;
  /** Duration in ms after a tooltip closes during which the next tooltip opens instantly. */
  timeout?: number | undefined;
}

export const TOOLTIP_DEFAULT_PROPS: NonNullableObject<TooltipProps> = {
  side: 'top',
  align: 'center',
  open: false,
  defaultOpen: false,
  delay: 600,
  closeDelay: 0,
  disableHoverablePopup: true,
  disabled: false,
};

export const TOOLTIP_GROUP_DEFAULT_PROPS: NonNullableObject<TooltipGroupProps> = {
  delay: 600,
  closeDelay: 0,
  timeout: 400,
};
