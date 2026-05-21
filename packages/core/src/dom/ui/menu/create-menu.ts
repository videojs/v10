import { createState, type State } from '@videojs/store';
import { noop } from '@videojs/utils/function';
import type { MenuInput, MenuState } from '../../../core/ui/menu/menu-core';
import { MenuItemDataAttrs } from '../../../core/ui/menu/menu-item-data-attrs';
import type { UIFocusEvent, UIKeyboardEvent } from '../event';
import { createPopover, type PopoverChangeDetails, type PopoverOpenChangeReason } from '../popover/popover';
import type { PositioningOptions } from '../popover/popover-positioning';
import { createPopupGroup, getSharedMenuPopupGroup, type PopupGroup } from '../popover/popup-group';
import type { TransitionApi } from '../transition';
import type { MenuViewTransitionApi } from './create-menu-view-transition';
import { createMenuViewTransition, type MenuViewTransitionState } from './create-menu-view-transition';
import { createMenuViewport, type MenuViewportApi, shouldCreateMenuViewport } from './menu-viewport';

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
  /**
   * Optional popup group from a player or shell provider.
   * When omitted, or when the resolver returns `undefined` on a root menu, menus use a document-wide group
   * so peer menus cooperate without extra setup. Nested menus with an explicit resolver that returns
   * `undefined` get an isolated group so they do not join that shared root coordination.
   */
  group?: () => PopupGroup | undefined;
  /**
   * When this returns an ancestor {@link MenuApi}, this menu is nested under that surface: triggers still
   * join the peer list for outside-dismiss, but open/close are not forwarded to the popup group (the parent
   * root coordinates one-open-at-a-time). Omit or return null for a root menu.
   */
  parentMenu?: () => MenuApi | null | undefined;
}

export interface MenuTriggerProps {
  /** Called when the trigger is clicked. Uses the DOM `UIEvent` type to match the Popover API. */
  onClick: (event: UIEvent) => void;
  onKeyDown: (event: UIKeyboardEvent) => void;
}

export interface MenuContentProps {
  onKeyDown: (event: UIKeyboardEvent) => void;
  onFocusOut: (event: UIFocusEvent) => void;
}

export interface MenuHighlightOptions {
  focus?: boolean;
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
  /** Register a submenu panel for viewport transitions on the nearest viewport host. */
  registerSubmenuView: (view: HTMLElement, transition: MenuViewTransitionApi) => () => void;
  /** Root panel transition when this menu hosts a viewport (null for submenus). */
  readonly rootViewTransitionInput: State<MenuViewTransitionState> | null;
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

/** Submenus register peer triggers but must not replace the root as the group's `current` member. */
function bindMenuPopupGroup(resolveGroup: () => PopupGroup, hasParentMenu: () => boolean): PopupGroup {
  return {
    open(member) {
      if (hasParentMenu()) return;
      resolveGroup().open(member);
    },
    close(member) {
      if (hasParentMenu()) return;
      resolveGroup().close(member);
    },
    addMemberTrigger(element) {
      return resolveGroup().addMemberTrigger(element);
    },
    pathHasPeerMemberTrigger(path, ownTrigger) {
      return resolveGroup().pathHasPeerMemberTrigger(path, ownTrigger);
    },
    isPeerTrigger(element, ownTrigger) {
      return resolveGroup().isPeerTrigger(element, ownTrigger);
    },
  };
}

export function createMenu(options: MenuOptions): MenuApi {
  // Items are stored in DOM order. Framework/component lifecycle ordering is
  // not always the same as visual order, especially across nested components.
  const items: HTMLElement[] = [];
  let highlightedItem: HTMLElement | null = null;
  let triggerElement: HTMLElement | null = null;
  let contentElement: HTMLElement | null = null;
  let viewport: MenuViewportApi | null = null;
  let unsubscribeNavigation: (() => void) | null = null;
  let typeaheadBuffer = '';
  let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  let openRafId = 0;
  let lastCloseReason: MenuOpenChangeReason | null = null;

  const navigationState = createState<NavigationState>({ stack: [], direction: 'forward' });
  let rootPanelTransition: MenuViewTransitionApi | null = null;

  function getRootPanelTransition(): MenuViewTransitionApi | null {
    if (options.parentMenu?.()) return null;
    rootPanelTransition ??= createMenuViewTransition({ persistent: true });
    return rootPanelTransition;
  }

  let menuPopupGroup: PopupGroup | null = null;
  let isolatedPopupGroup: PopupGroup | null = null;

  function resolveMenuPopupGroupBase(): PopupGroup {
    if (options.group === undefined) {
      return getSharedMenuPopupGroup();
    }

    const resolved = options.group();
    if (resolved !== undefined) {
      return resolved;
    }

    if (options.parentMenu?.() != null) {
      isolatedPopupGroup ??= createPopupGroup();
      return isolatedPopupGroup;
    }

    return getSharedMenuPopupGroup();
  }

  function getMenuPopupGroup(): PopupGroup {
    menuPopupGroup ??= bindMenuPopupGroup(resolveMenuPopupGroupBase, () => options.parentMenu?.() != null);
    return menuPopupGroup;
  }

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

  function focusItem(element: HTMLElement, highlightOptions?: MenuHighlightOptions): void {
    if (highlightOptions?.focus === false) return;

    if (highlightOptions?.preventScroll) {
      element.focus({ preventScroll: true });
    } else {
      element.focus();
    }
  }

  function highlight(element: HTMLElement | null, highlightOptions?: MenuHighlightOptions): void {
    if (highlightedItem === element) {
      if (element) focusItem(element, highlightOptions);
      return;
    }

    if (highlightedItem) {
      highlightedItem.tabIndex = -1;
      highlightedItem.removeAttribute(MenuItemDataAttrs.highlighted);
    }

    highlightedItem = element;

    if (element) {
      element.tabIndex = 0;
      element.setAttribute(MenuItemDataAttrs.highlighted, '');
      focusItem(element, highlightOptions);
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

  function getInitialHighlightItem(): HTMLElement | null {
    return items.find((item) => item.matches('[aria-checked="true"], [aria-selected="true"]')) ?? items[0] ?? null;
  }

  function getEventItem(event: UIKeyboardEvent): HTMLElement | null {
    const target = event.target;

    if (!(target instanceof Element)) return null;

    const item = target.closest<HTMLElement>(`[${MenuItemDataAttrs.item}]`);

    if (!item || !items.includes(item)) return null;

    return item;
  }

  function syncHighlightToEventTarget(event: UIKeyboardEvent): void {
    const item = getEventItem(event);

    if (!item || item === highlightedItem) return;

    highlight(item, { preventScroll: true });
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
      // Root view children may connect after the menu host (HTML custom elements).
      // Re-measure on open so viewport CSS variables reflect the mounted panel.
      const hasActiveSubmenu = getNavigationInput().current.stack.length > 0;
      viewport?.syncRoot(hasActiveSubmenu, { animate: !hasActiveSubmenu });
      // Guard against close() being called before the RAF fires — active
      // stays true during the closing animation, so also check status.
      if (!popover.input.current.active || popover.input.current.status === 'ending' || highlightedItem) return;
      highlight(getInitialHighlightItem());
    });
  }

  function handleTypeahead(char: string): void {
    const repeatedChar = typeaheadBuffer.length === 1 && typeaheadBuffer.toLowerCase() === char.toLowerCase();
    typeaheadBuffer = repeatedChar ? char : typeaheadBuffer + char;

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

  // --- Internal popover (see `bindMenuPopupGroup` for nested vs root group behavior) ---

  const popover = createPopover({
    transition: options.transition,
    onOpenChange(open, details) {
      lastCloseReason = open ? null : details.reason;
      options.onOpenChange(open, details);

      if (open) {
        // Focus the selected item after the popover element becomes visible.
        // One RAF ensures the element has been shown via the Popover API.
        scheduleInitialHighlight();
      } else {
        clearHighlight();
        clearTypeahead();
      }
    },
    onOpenChangeComplete(open) {
      if (!open) {
        // Reset after close animations so submenu views stay mounted during `ending`
        // (outside click and other dismiss paths would otherwise drop the stack
        // immediately and tear down nested panels with no transition).
        navigationState.patch({ stack: [], direction: 'forward' });
        // Root panel may have been driven to `hidden` while a submenu was open; content
        // can unmount before the viewport restores it, so reset for the next open.
        getRootPanelTransition()?.reset();
      }
      options.onOpenChangeComplete?.(open);
      // Return focus to the trigger after the close animation completes
      // so screen readers hear the correct context.
      if (
        !open &&
        lastCloseReason !== 'imperative-action' &&
        lastCloseReason !== 'group-open' &&
        lastCloseReason !== 'blur'
      ) {
        const element = triggerElement;

        const restoreTriggerFocus = (): void => {
          // Close completion runs before a deferred reopen from a trigger click during
          // `ending` (see `createPopover`); the reopen is chained on the same close promise.
          // Without this guard, the scheduled focus runs after the menu has reopened and
          // highlights an item — pulling focus to the trigger and blur-closing the menu.
          if (popover.input.current.active) return;
          // Another root menu may already have focus (e.g. this menu dismissed via
          // outside-click on a peer trigger before the peer opened). Restoring our trigger
          // would steal focus from that menu and blur-close it.
          if (typeof document !== 'undefined') {
            const active = document.activeElement;
            const menuSurface = active instanceof HTMLElement ? active.closest('[role="menu"]') : null;
            if (menuSurface instanceof HTMLElement && contentElement && !contentElement.contains(menuSurface)) {
              return;
            }
            if (active instanceof HTMLElement && getMenuPopupGroup().isPeerTrigger(active, element)) {
              return;
            }
          }
          element?.focus();
        };

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(restoreTriggerFocus, 0);
          });
        });
      }
    },
    closeOnEscape: options.closeOnEscape,
    closeOnOutsideClick: options.closeOnOutsideClick,
    group: getMenuPopupGroup,
  });

  // --- Content keyboard navigation ---

  const contentProps: MenuContentProps = {
    onFocusOut: popover.popupProps.onFocusOut,
    onKeyDown(event) {
      const { key } = event;

      if (key !== 'Escape' && isMenuNavigationKey(event) && !event.defaultPrevented) {
        event.preventDefault();
      }

      if (items.length === 0) return;

      if (isMenuNavigationKey(event)) {
        syncHighlightToEventTarget(event);
      }

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

  function handleTriggerKeyDown(event: UIKeyboardEvent): void {
    const input = popover.input.current;

    if (!input.active || input.status === 'ending') return;
    if (event.key === 'Escape') return;
    if (!isMenuNavigationKey(event)) return;

    contentProps.onKeyDown(event);
    event.stopPropagation();
  }

  // --- Element setters ---

  function setTriggerElement(element: HTMLElement | null): void {
    triggerElement = element;
    popover.setTriggerElement(element);
  }

  function getNavigationInput(): State<NavigationState> {
    const parent = options.parentMenu?.();
    return parent ? parent.navigationInput : navigationState;
  }

  function teardownViewport(): void {
    unsubscribeNavigation?.();
    unsubscribeNavigation = null;
    viewport?.destroy();
    viewport = null;
  }

  function subscribeViewportNavigation(): void {
    unsubscribeNavigation?.();
    const navInput = getNavigationInput();

    unsubscribeNavigation = navInput.subscribe(() => {
      viewport?.syncRoot(navInput.current.stack.length > 0);
    });
  }

  function setContentElement(element: HTMLElement | null): void {
    teardownViewport();
    contentElement = element;
    popover.setPopupElement(element);

    if (!element) return;

    const isSubmenu = options.parentMenu?.() != null;

    if (shouldCreateMenuViewport(element, isSubmenu)) {
      viewport = createMenuViewport(element, getRootPanelTransition() ?? undefined, {
        navigation: {
          hasActiveSubmenu: () => getNavigationInput().current.stack.length > 0,
          direction: () => getNavigationInput().current.direction,
        },
      });
      subscribeViewportNavigation();
      viewport.syncRoot(getNavigationInput().current.stack.length > 0);
    }
  }

  function registerSubmenuView(view: HTMLElement, transition: MenuViewTransitionApi): () => void {
    return viewport?.bindChild(view, transition) ?? noop;
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
    teardownViewport();
    rootPanelTransition?.destroy();
    rootPanelTransition = null;
    navigationState.patch({ stack: [], direction: 'forward' });
    popover.destroy();
  }

  return {
    input: popover.input as State<MenuInput>,
    navigationInput: navigationState,
    // Menus open/close on trigger click — delegate to popover. Hover/focus open are off.
    triggerProps: {
      onClick: popover.triggerProps.onClick,
      onKeyDown: handleTriggerKeyDown,
    },
    contentProps,
    get triggerElement(): HTMLElement | null {
      return triggerElement;
    },
    get contentElement(): HTMLElement | null {
      return contentElement;
    },
    get rootViewTransitionInput(): State<MenuViewTransitionState> | null {
      return getRootPanelTransition()?.input ?? null;
    },
    setTriggerElement,
    setContentElement,
    registerItem,
    highlight,
    highlightFirstItem,
    push,
    pop,
    registerSubmenuView,
    open: popover.open,
    close: popover.close,
    destroy,
  };
}
