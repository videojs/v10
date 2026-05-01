import type { State } from '@videojs/store';
import type { MenuInput } from '../../../core/ui/menu/menu-core';
import { MenuItemDataAttrs } from '../../../core/ui/menu/menu-item-data-attrs';
import type { UIKeyboardEvent } from '../event';
import { createPopover, type PopoverChangeDetails, type PopoverOpenChangeReason } from '../popover/popover';
import type { TransitionApi } from '../transition';

export type MenuOpenChangeReason = PopoverOpenChangeReason;

export type MenuChangeDetails = PopoverChangeDetails;

export interface MenuOptions {
  transition: TransitionApi;
  onOpenChange: (open: boolean, details: MenuChangeDetails) => void;
  /** Fires after open/close animations complete. */
  onOpenChangeComplete?: (open: boolean) => void;
  closeOnEscape: () => boolean;
  closeOnOutsideClick: () => boolean;
  /** Called when the highlighted item changes. */
  onHighlightChange?: (element: HTMLElement | null) => void;
}

export interface MenuTriggerProps {
  /** Called when the trigger is clicked. Uses the DOM `UIEvent` type to match the Popover API. */
  onClick: (event: UIEvent) => void;
}

export interface MenuContentProps {
  onKeyDown: (event: UIKeyboardEvent) => void;
}

export interface MenuApi {
  /** Reactive transition state for platforms to subscribe to. */
  input: State<MenuInput>;
  /** Attach to the trigger element. */
  triggerProps: MenuTriggerProps;
  /** Attach to the content element. */
  contentProps: MenuContentProps;
  /** The currently registered trigger element, if any. */
  readonly triggerElement: HTMLElement | null;
  setTriggerElement: (element: HTMLElement | null) => void;
  setContentElement: (element: HTMLElement | null) => void;
  /** Register a navigable item. Returns a cleanup function. */
  registerItem: (element: HTMLElement) => () => void;
  /** Programmatically highlight an item (or clear highlight with `null`). */
  highlight: (element: HTMLElement | null) => void;
  open: (reason?: MenuOpenChangeReason) => void;
  close: (reason?: MenuOpenChangeReason) => void;
  destroy: () => void;
}

export function createMenu(options: MenuOptions): MenuApi {
  // Items are stored in registration order, which matches DOM order since
  // React effects run top-to-bottom through siblings.
  const items: HTMLElement[] = [];
  let highlightedItem: HTMLElement | null = null;
  let triggerElement: HTMLElement | null = null;
  let typeaheadBuffer = '';
  let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  let openRafId = 0;

  // --- Highlight ---

  function highlight(element: HTMLElement | null): void {
    if (highlightedItem === element) return;

    if (highlightedItem) {
      highlightedItem.tabIndex = -1;
      highlightedItem.removeAttribute(MenuItemDataAttrs.highlighted);
    }

    highlightedItem = element;

    if (element) {
      element.tabIndex = 0;
      element.setAttribute(MenuItemDataAttrs.highlighted, '');
      element.focus();
    }

    options.onHighlightChange?.(element);
  }

  function clearHighlight(): void {
    if (highlightedItem) {
      highlightedItem.tabIndex = -1;
      highlightedItem.removeAttribute(MenuItemDataAttrs.highlighted);
      highlightedItem = null;
      options.onHighlightChange?.(null);
    }
  }

  // --- Type-ahead ---

  function clearTypeahead(): void {
    if (typeaheadTimer !== null) {
      clearTimeout(typeaheadTimer);
      typeaheadTimer = null;
    }
    typeaheadBuffer = '';
  }

  function handleTypeahead(char: string): void {
    typeaheadBuffer += char;

    if (typeaheadTimer !== null) clearTimeout(typeaheadTimer);
    typeaheadTimer = setTimeout(clearTypeahead, 500);

    const currentIdx = highlightedItem ? items.indexOf(highlightedItem) : -1;

    // Search from after the current item so repeated chars cycle through matches.
    const searchStart = currentIdx + 1;
    const candidates = [...items.slice(searchStart), ...items.slice(0, searchStart)];

    const needle = typeaheadBuffer.toLowerCase();
    const match = candidates.find((candidate) => {
      const text = candidate.textContent?.trim().toLowerCase() ?? '';
      return text.startsWith(needle);
    });

    if (match) highlight(match);
  }

  // --- Internal popover ---

  const popover = createPopover({
    transition: options.transition,
    onOpenChange(open, details) {
      options.onOpenChange(open, details);

      if (open) {
        // Focus the first item after the popover element becomes visible.
        // One RAF ensures the element has been shown via the Popover API.
        cancelAnimationFrame(openRafId);
        openRafId = requestAnimationFrame(() => {
          openRafId = 0;
          // Guard against close() being called before the RAF fires — active
          // stays true during the closing animation, so also check status.
          if (!popover.input.current.active || popover.input.current.status === 'ending') return;
          highlight(items[0] ?? null);
        });
      } else {
        clearHighlight();
        clearTypeahead();
      }
    },
    onOpenChangeComplete(open) {
      options.onOpenChangeComplete?.(open);
      // Return focus to the trigger after the close animation completes
      // so screen readers hear the correct context.
      if (!open) triggerElement?.focus();
    },
    closeOnEscape: options.closeOnEscape,
    closeOnOutsideClick: options.closeOnOutsideClick,
  });

  // --- Content keyboard navigation ---

  const contentProps: MenuContentProps = {
    onKeyDown(event) {
      const { key } = event;

      if (items.length === 0) return;

      switch (key) {
        case 'ArrowDown': {
          event.preventDefault();
          const currentIndex = highlightedItem ? items.indexOf(highlightedItem) : -1;
          highlight(items[(currentIndex + 1) % items.length] ?? null);
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const currentIndex = highlightedItem ? items.indexOf(highlightedItem) : 0;
          highlight(items[(currentIndex <= 0 ? items.length : currentIndex) - 1] ?? null);
          break;
        }
        case 'Home': {
          event.preventDefault();
          highlight(items[0] ?? null);
          break;
        }
        case 'End': {
          event.preventDefault();
          highlight(items[items.length - 1] ?? null);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          highlightedItem?.click();
          break;
        }
        default: {
          // Printable characters trigger type-ahead search.
          if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
            handleTypeahead(key);
          }
        }
      }
    },
  };

  // --- Element setters ---

  function setTriggerElement(element: HTMLElement | null): void {
    triggerElement = element;
    popover.setTriggerElement(element);
  }

  function setContentElement(element: HTMLElement | null): void {
    popover.setPopupElement(element);
  }

  // --- Item registration ---

  function registerItem(element: HTMLElement): () => void {
    element.tabIndex = -1;
    element.setAttribute(MenuItemDataAttrs.item, '');
    items.push(element);

    return () => {
      const index = items.indexOf(element);
      if (index !== -1) items.splice(index, 1);
      if (highlightedItem === element) clearHighlight();
    };
  }

  function destroy(): void {
    cancelAnimationFrame(openRafId);
    openRafId = 0;
    clearTypeahead();
    popover.destroy();
  }

  return {
    input: popover.input as State<MenuInput>,
    // Menus open/close on trigger click — forward the popover's click handler.
    // Hover and focus-based open are disabled (openOnHover not set).
    triggerProps: {
      onClick: popover.triggerProps.onClick,
    },
    contentProps,
    get triggerElement(): HTMLElement | null {
      return triggerElement;
    },
    setTriggerElement,
    setContentElement,
    registerItem,
    highlight,
    open: popover.open,
    close: popover.close,
    destroy,
  };
}
