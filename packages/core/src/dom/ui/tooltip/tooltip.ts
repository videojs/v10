import {
  createPopover,
  type PopoverApi,
  type PopoverChangeDetails,
  type PopoverOptions,
  type PopoverPopupProps,
  type PopoverTriggerProps,
} from '../popover/popover';
import type { TransitionApi } from '../transition';
import type { TooltipGroupApi } from './tooltip-group';

export type TooltipOpenChangeReason = 'hover' | 'focus' | 'escape' | 'blur';

export interface TooltipChangeDetails {
  reason: TooltipOpenChangeReason;
  event?: Event;
}

export interface TooltipOptions {
  transition: TransitionApi;
  onOpenChange: (open: boolean, details: TooltipChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  delay?: () => number;
  closeDelay?: () => number;
  disableHoverablePopup?: () => boolean;
  disabled?: () => boolean;
  group?: TooltipGroupApi;
}

export interface TooltipTriggerProps extends Omit<PopoverTriggerProps, 'onClick'> {}

export interface TooltipPopupProps extends PopoverPopupProps {}

export interface TooltipApi extends Omit<PopoverApi, 'triggerProps' | 'popupProps' | 'open' | 'close'> {
  triggerProps: TooltipTriggerProps;
  popupProps: TooltipPopupProps;
  open: () => void;
  close: () => void;
}

/** Map popover reasons to tooltip reasons, filtering out click/outside-click. */
const REASON_MAP: Partial<Record<string, TooltipOpenChangeReason>> = {
  hover: 'hover',
  focus: 'focus',
  escape: 'escape',
  blur: 'blur',
};

export function createTooltip(options: TooltipOptions): TooltipApi {
  const { group } = options;

  const popoverOpts: PopoverOptions = {
    transition: options.transition,
    onOpenChange(open: boolean, details: PopoverChangeDetails) {
      const reason = REASON_MAP[details.reason];
      if (!reason) return;

      if (open) group?.notifyOpen();
      else group?.notifyClose();

      const tooltipDetails: TooltipChangeDetails = details.event ? { reason, event: details.event } : { reason };
      options.onOpenChange(open, tooltipDetails);
    },
    closeOnEscape: () => true,
    closeOnOutsideClick: () => false,
    openOnHover: () => true,
    delay: () => {
      if (group?.shouldSkipDelay()) return 0;
      return options.delay?.() ?? group?.delay ?? 600;
    },
    closeDelay: () => options.closeDelay?.() ?? group?.closeDelay ?? 0,
  };

  if (options.onOpenChangeComplete) {
    popoverOpts.onOpenChangeComplete = options.onOpenChangeComplete;
  }

  const popover = createPopover(popoverOpts);

  // Spread popover trigger props, omit onClick, guard disabled on open handlers.
  const { onClick: _, ...baseTriggerProps } = popover.triggerProps;
  const triggerProps: TooltipTriggerProps = {
    ...baseTriggerProps,
    onPointerEnter(event) {
      if (options.disabled?.()) return;
      baseTriggerProps.onPointerEnter(event);
    },
    onFocusIn(event) {
      if (options.disabled?.()) return;
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
    close: () => popover.close('hover'),
  };
}
