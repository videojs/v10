import type { TooltipGroupCore } from '../../../core/ui/tooltip/tooltip-group-core';
import type { UIPointerEvent } from '../event';
import {
  createPopover,
  type PopoverApi,
  type PopoverChangeDetails,
  type PopoverOpenChangeReason,
  type PopoverOptions,
  type PopoverPopupProps,
  type PopoverTriggerProps,
} from '../popover/popover';
import type { TransitionApi } from '../transition';

/** Reason a tooltip open/close transition was triggered. */
export type TooltipOpenChangeReason = 'hover' | 'focus' | 'escape' | 'blur' | 'imperative-action';

/** Details accompanying a tooltip open/close change. */
export interface TooltipChangeDetails {
  /** Why the change happened. */
  reason: TooltipOpenChangeReason;
  /** Originating DOM event, when applicable. */
  event?: Event;
}

/** Options for {@link createTooltip}. */
export interface TooltipOptions {
  /** Transition controller driving open/close animations. */
  transition: TransitionApi;
  /** Called when the tooltip's open state changes. */
  onOpenChange: (open: boolean, details: TooltipChangeDetails) => void;
  /** Fires after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Hover open delay in ms. */
  delay?: () => number;
  /** Hover close delay in ms. */
  closeDelay?: () => number;
  /** Whether hovering the popup itself does not keep it open. */
  disableHoverablePopup?: () => boolean;
  /** Whether the tooltip is currently disabled. */
  disabled?: () => boolean;
  /** Shared tooltip group for "warm" zero-delay opens. */
  group?: () => TooltipGroupCore | undefined;
}

/** Event-handler bundle for the tooltip trigger element. */
export interface TooltipTriggerProps extends Omit<PopoverTriggerProps, 'onClick'> {
  /** Pointer-down handler that suppresses spurious focus-opens during tap. */
  onPointerDown: (event: UIPointerEvent) => void;
}

/** Event-handler bundle for the tooltip popup element. */
export interface TooltipPopupProps extends PopoverPopupProps {}

/** Imperative handle returned by {@link createTooltip}. */
export interface TooltipApi extends Omit<PopoverApi, 'triggerProps' | 'popupProps' | 'open' | 'close'> {
  /** Props for the trigger element. */
  triggerProps: TooltipTriggerProps;
  /** Props for the popup element. */
  popupProps: TooltipPopupProps;
  /** Open the tooltip. */
  open: () => void;
  /** Close the tooltip. */
  close: (reason?: TooltipOpenChangeReason) => void;
}

/** Map popover reasons to tooltip reasons, filtering out click/outside-click. */
const REASON_MAP: Partial<Record<PopoverOpenChangeReason, TooltipOpenChangeReason>> = {
  hover: 'hover',
  focus: 'focus',
  escape: 'escape',
  blur: 'blur',
  'imperative-action': 'imperative-action',
};

/**
 * Build a tooltip controller — hover/focus open with delay coordination across a group.
 *
 * @param options - Tooltip configuration.
 */
export function createTooltip(options: TooltipOptions): TooltipApi {
  const popoverOpts: PopoverOptions = {
    transition: options.transition,
    onOpenChange(open: boolean, details: PopoverChangeDetails) {
      const reason = REASON_MAP[details.reason];
      if (!reason) return;

      const group = options.group?.();
      if (open) group?.notifyOpen();
      else group?.notifyClose();

      const tooltipDetails: TooltipChangeDetails = details.event ? { reason, event: details.event } : { reason };
      options.onOpenChange(open, tooltipDetails);
    },
    closeOnEscape: () => true,
    closeOnOutsideClick: () => false,
    openOnHover: () => true,
    delay: () => {
      const group = options.group?.();
      if (group?.shouldSkipDelay()) return 0;
      return options.delay?.() ?? group?.delay ?? 600;
    },
    closeDelay: () => {
      const group = options.group?.();
      return options.closeDelay?.() ?? group?.closeDelay ?? 0;
    },
  };

  if (options.onOpenChangeComplete) {
    popoverOpts.onOpenChangeComplete = options.onOpenChangeComplete;
  }

  const popover = createPopover(popoverOpts);

  // Track whether a pointer is currently down so focus-triggered opens can be
  // suppressed during tap. The browser fires pointerdown → focus → pointerup,
  // so the flag is true during tap-triggered focus but false during keyboard Tab.
  let isPointerDown = false;

  // Spread popover trigger props, omit onClick, guard disabled/touch on open handlers.
  const { onClick: _, ...baseTriggerProps } = popover.triggerProps;
  const triggerProps: TooltipTriggerProps = {
    ...baseTriggerProps,
    onPointerDown() {
      isPointerDown = true;
    },
    onPointerEnter(event) {
      if (options.disabled?.()) return;
      if (event.pointerType === 'touch') return;
      baseTriggerProps.onPointerEnter(event);
    },
    onFocusIn(event) {
      if (options.disabled?.()) return;
      if (isPointerDown) {
        isPointerDown = false;
        return;
      }
      baseTriggerProps.onFocusIn(event);
    },
  };

  // Spread popover popup props, guard disableHoverablePopup on pointer enter.
  const popupProps: TooltipPopupProps = {
    ...popover.popupProps,
    onPointerEnter(event) {
      if (options.disableHoverablePopup?.()) return;
      popover.popupProps.onPointerEnter(event);
    },
  };

  return {
    ...popover,
    triggerProps,
    popupProps,
    get triggerElement() {
      return popover.triggerElement;
    },
    open: () => popover.open('hover'),
    close: (reason: TooltipOpenChangeReason = 'hover') => popover.close(reason),
  };
}
