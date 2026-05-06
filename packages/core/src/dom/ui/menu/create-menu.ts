import { createState, type State } from '@videojs/store';
import type { MenuInput, MenuState } from '../../../core/ui/menu/menu-core';
import { MenuItemDataAttrs } from '../../../core/ui/menu/menu-item-data-attrs';
import type { UIKeyboardEvent } from '../event';
import { createPopover, type PopoverChangeDetails, type PopoverOpenChangeReason } from '../popover/popover';
import type { PositioningOptions } from '../popover/popover-positioning';
import type { TransitionApi } from '../transition';

export type MenuOpenChangeReason = PopoverOpenChangeReason;

export type MenuChangeDetails = PopoverChangeDetails;

export interface NavigationEntry {
  /** ID of the nested menu (submenu) that was pushed. */
  menuId: string;
  /** ID of the Trigger element that initiated the push, for focus restoration. */
  triggerId: string;
}

export interface NavigationState {
  /** Stack of active submenus (last = current). */
  stack: NavigationEntry[];
  /** Direction of the most recent navigation. */
  direction: 'forward' | 'back';
}

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

export interface MenuHighlightOptions {
  preventScroll?: boolean;
}

export function isMenuNavigationKey(event: UIKeyboardEvent): boolean {
  const { key } = event;

  return (
    key === 'ArrowDown' ||
    key === 'ArrowUp' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'Home' ||
    key === 'End' ||
    key === 'Enter' ||
    key === ' ' ||
    key === 'Escape' ||
    (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey)
  );
}

export function getRootPositionOptions(side: MenuState['side'], align: MenuState['align']): PositioningOptions | null {
  if (!side || !align) return null;

  return { side, align };
}

export interface MenuApi {
  /** Reactive transition state for platforms to subscribe to. */
  input: State<MenuInput>;
  /** Reactive navigation state for submenu stack. */
  navigationInput: State<NavigationState>;
  /** Attach to the trigger element. */
  triggerProps: MenuTriggerProps;
  /** Attach to the content element. */
  contentProps: MenuContentProps;
  /** The currently registered trigger element, if any. */
  readonly triggerElement: HTMLElement | null;
  /** The currently registered content element, if any. */
  readonly contentElement: HTMLElement | null;
  setTriggerElement: (element: HTMLElement | null) => void;
  setContentElement: (element: HTMLElement | null) => void;
  /** Register a navigable item. Returns a cleanup function. */
  registerItem: (element: HTMLElement) => () => void;
  /** Programmatically highlight an item (or clear highlight with `null`). */
  highlight: (element: HTMLElement | null, options?: MenuHighlightOptions) => void;
  /** Programmatically highlight the first registered item. */
  highlightFirstItem: (options?: MenuHighlightOptions) => void;
  /** Push a submenu onto the navigation stack. */
  push: (menuId: string, triggerId: string) => void;
  /** Pop the current submenu from the navigation stack. */
  pop: () => void;
  open: (reason?: MenuOpenChangeReason) => void;
  close: (reason?: MenuOpenChangeReason) => void;
  destroy: () => void;
}

export function completeMenuItemSelection(menu: MenuApi, parentMenu: MenuApi | null = null): void {
  if (parentMenu) {
    parentMenu.pop();
  } else {
    menu.close();
  }
}

export function createMenu(options: MenuOptions): MenuApi {
  // Items are stored in DOM order. Framework/component lifecycle ordering is
  // not always the same as visual order, especially across nested components.
  const items: HTMLElement[] = [];
  let highlightedItem: HTMLElement | null = null;
  let triggerElement: HTMLElement | null = null;
  let contentElement: HTMLElement | null = null;
  let typeaheadBuffer = '';
  let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  let openRafId = 0;

  const navigationState = createState<NavigationState>({ stack: [], direction: 'forward' });

  function push(menuId: string, triggerId: string): void {
    const stack = navigationState.current.stack;
    const topEntry = stack[stack.length - 1];

    if (topEntry?.menuId === menuId) return;

    navigationState.patch({
      stack: [...stack, { menuId, triggerId }],
      direction: 'forward',
    });
  }

  function pop(): void {
    const stack = navigationState.current.stack;

    if (stack.length === 0) return;

    navigationState.patch({
      stack: stack.slice(0, -1),
      direction: 'back',
    });
  }

  // --- Highlight ---

  function highlight(element: HTMLElement | null, highlightOptions?: MenuHighlightOptions): void {
    if (highlightedItem === element) return;

    if (highlightedItem) {
      highlightedItem.tabIndex = -1;
      highlightedItem.removeAttribute(MenuItemDataAttrs.highlighted);
    }

    highlightedItem = element;

    if (element) {
      element.tabIndex = 0;
      element.setAttribute(MenuItemDataAttrs.highlighted, '');
      if (highlightOptions?.preventScroll) {
        element.focus({ preventScroll: true });
      } else {
        element.focus();
      }
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

  function highlightFirstItem(options?: MenuHighlightOptions): void {
    highlight(items[0] ?? null, options);
  }

  // --- Type-ahead ---

  function clearTypeahead(): void {
    if (typeaheadTimer !== null) {
      clearTimeout(typeaheadTimer);
      typeaheadTimer = null;
    }
    typeaheadBuffer = '';
  }

  function scheduleInitialHighlight(): void {
    cancelAnimationFrame(openRafId);
    openRafId = requestAnimationFrame(() => {
      openRafId = 0;
      // Guard against close() being called before the RAF fires — active
      // stays true during the closing animation, so also check status.
      if (!popover.input.current.active || popover.input.current.status === 'ending' || highlightedItem) return;
      highlightFirstItem();
    });
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
        scheduleInitialHighlight();
      } else {
        clearHighlight();
        clearTypeahead();
        // Reset navigation stack so the menu starts at root next time it opens.
        navigationState.patch({ stack: [], direction: 'forward' });
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
    contentElement = element;
    popover.setPopupElement(element);
  }

  // --- Item registration ---

  function compareItems(a: HTMLElement, b: HTMLElement): number {
    if (a === b) return 0;

    const position = a.compareDocumentPosition(b);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;

    return 0;
  }

  function registerItem(element: HTMLElement): () => void {
    element.tabIndex = -1;
    element.setAttribute(MenuItemDataAttrs.item, '');
    items.push(element);
    items.sort(compareItems);

    if (popover.input.current.active && popover.input.current.status !== 'ending' && !highlightedItem) {
      scheduleInitialHighlight();
    }

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
    navigationInput: navigationState,
    // Menus open/close on trigger click — forward the popover's click handler.
    // Hover and focus-based open are disabled (openOnHover not set).
    triggerProps: {
      onClick: popover.triggerProps.onClick,
    },
    contentProps,
    get triggerElement(): HTMLElement | null {
      return triggerElement;
    },
    get contentElement(): HTMLElement | null {
      return contentElement;
    },
    setTriggerElement,
    setContentElement,
    registerItem,
    highlight,
    highlightFirstItem,
    push,
    pop,
    open: popover.open,
    close: popover.close,
    destroy,
  };
}
