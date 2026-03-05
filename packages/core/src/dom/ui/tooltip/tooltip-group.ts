export interface TooltipGroupOptions {
  /** Default open delay in ms for tooltips in this group. */
  delay?: number;
  /** Default close delay in ms for tooltips in this group. */
  closeDelay?: number;
  /** Duration in ms after a tooltip closes during which the next tooltip opens instantly. */
  timeout?: number;
}

export interface TooltipGroupApi {
  readonly delay: number;
  readonly closeDelay: number;
  shouldSkipDelay: () => boolean;
  notifyOpen: () => void;
  notifyClose: () => void;
  destroy: () => void;
}

export function createTooltipGroup(options?: TooltipGroupOptions): TooltipGroupApi {
  const delay = options?.delay ?? 600;
  const closeDelay = options?.closeDelay ?? 0;
  const timeout = options?.timeout ?? 400;

  let lastCloseTime = 0;
  let isOpen = false;
  let destroyed = false;

  function shouldSkipDelay(): boolean {
    if (destroyed || isOpen) return false;
    return Date.now() - lastCloseTime < timeout;
  }

  function notifyOpen(): void {
    if (destroyed) return;
    isOpen = true;
  }

  function notifyClose(): void {
    if (destroyed) return;
    isOpen = false;
    lastCloseTime = Date.now();
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
  }

  return {
    get delay() {
      return delay;
    },
    get closeDelay() {
      return closeDelay;
    },
    shouldSkipDelay,
    notifyOpen,
    notifyClose,
    destroy,
  };
}
