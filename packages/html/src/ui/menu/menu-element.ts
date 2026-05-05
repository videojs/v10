import { MenuCore, MenuDataAttrs, type MenuInput } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createMenu,
  createMenuViewTransition,
  createTransition,
  getAnchorNameStyle,
  getAnchorPositionStyle,
  getMenuViewportAttrs,
  getMenuViewTransitionAttrs,
  getPopupPositionRect,
  isMenuNavigationKey,
  type MenuApi,
  type MenuChangeDetails,
  type MenuViewTransitionState,
  type NavigationState,
  resolveOffsets,
  syncMenuViewRoot,
  syncMenuViewTransition,
  type UIKeyboardEvent,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';
import { applyStyles, supportsAnchorPositioning, tryHidePopover, tryShowPopover } from '@videojs/utils/dom';

import { MediaElement } from '../media-element';
import { PositionController } from '../position-controller';
import { type MenuContextValue, menuContext } from './context';

export class MenuElement extends MediaElement {
  static readonly tagName = 'media-menu';

  static override properties = {
    open: { type: Boolean },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    side: { type: String },
    align: { type: String },
    closeOnEscape: { type: Boolean, attribute: 'close-on-escape' },
    closeOnOutsideClick: { type: Boolean, attribute: 'close-on-outside-click' },
  } satisfies PropertyDeclarationMap<
    'open' | 'defaultOpen' | 'side' | 'align' | 'closeOnEscape' | 'closeOnOutsideClick'
  >;

  open = MenuCore.defaultProps.open;
  defaultOpen = MenuCore.defaultProps.defaultOpen;
  side = MenuCore.defaultProps.side;
  align = MenuCore.defaultProps.align;
  closeOnEscape = MenuCore.defaultProps.closeOnEscape;
  closeOnOutsideClick = MenuCore.defaultProps.closeOnOutsideClick;

  readonly #core = new MenuCore();
  readonly #provider = new ContextProvider(this, { context: menuContext });
  readonly #position = new PositionController(this);
  // Consume parent menu context — present when this is a nested (submenu) element.
  readonly #parentCtx = new ContextConsumer(this, { context: menuContext, subscribe: true });
  readonly #menuViewTransition = createMenuViewTransition({
    focusFirstItem: () => {
      this.#menu?.highlightFirstItem({ preventScroll: true });
    },
    restoreFocus: (triggerId) => {
      const triggerElement = triggerId ? document.getElementById(triggerId) : null;
      const fallbackTrigger = this.parentElement?.querySelector<HTMLElement>(
        `[data-has-submenu][commandfor="${this.id}"]`
      );

      (triggerElement ?? fallbackTrigger)?.focus({ preventScroll: true });
    },
  });
  #menu: MenuApi | null = null;
  #snapshot: SnapshotController<MenuInput> | null = null;
  #navSnapshot: SnapshotController<NavigationState> | null = null;
  #menuViewSnapshot: SnapshotController<MenuViewTransitionState> | null = null;
  #navState: NavigationState = { stack: [], direction: 'forward' };

  #disconnect: AbortController | null = null;
  #triggerAbort: AbortController | null = null;
  #currentTrigger: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();

    this.#menu = createMenu({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean, details: MenuChangeDetails) => {
        this.open = nextOpen;
        this.dispatchEvent(new CustomEvent('open-change', { detail: { open: nextOpen, ...details } }));
      },
      closeOnEscape: () => this.closeOnEscape,
      closeOnOutsideClick: () => this.closeOnOutsideClick,
    });

    // The element itself is the content (popup) for root menus.
    // Submenu detection happens in update() once parent context is available.
    this.#menu.setContentElement(this);

    applyElementProps(this, { onKeyDown: this.#handleContentKeyDown }, { signal: this.#disconnect.signal });

    if (this.#snapshot) {
      this.#snapshot.track(this.#menu.input);
    } else {
      this.#snapshot = new SnapshotController(this, this.#menu.input);
    }

    if (this.#navSnapshot) {
      this.#navSnapshot.track(this.#menu.navigationInput);
    } else {
      this.#navSnapshot = new SnapshotController(this, this.#menu.navigationInput);
    }

    if (this.#menuViewSnapshot) {
      this.#menuViewSnapshot.track(this.#menuViewTransition.input);
    } else {
      this.#menuViewSnapshot = new SnapshotController(this, this.#menuViewTransition.input);
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);

    if (this.defaultOpen && !this.open) {
      this.#menu?.open();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupTrigger();
    this.#menu?.destroy();
    this.#menu = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#menuViewTransition.destroy();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);

    const parentCtx = this.#parentCtx.value ?? null;
    const isSubmenu = parentCtx !== null;

    this.#core.setProps({ ...this, isSubmenu });

    if (this.#menu && changed.has('open') && !isSubmenu) {
      const { active: interactionOpen } = this.#menu.input.current;
      if (this.open !== interactionOpen) {
        if (this.open) {
          this.#menu.open();
        } else {
          this.#menu.close();
        }
      }
    }
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    if (!this.#menu) return;

    const parentCtx = this.#parentCtx.value ?? null;
    const isSubmenu = parentCtx !== null;

    this.#navState = this.#menu.navigationInput.current;
    const input = this.#menu.input.current;
    this.#core.setInput(input);
    const state = this.#core.getState();

    if (isSubmenu && parentCtx) {
      this.#updateAsSubmenu(parentCtx);
    } else {
      this.#updateAsRoot(state);
    }

    // Provide context to child parts.
    // When nested, expose the parent menu's API so items can pop on select.
    const parentMenu = parentCtx?.menu ?? null;
    this.#provider.setValue({
      menu: this.#menu,
      state,
      stateAttrMap: MenuDataAttrs,
      navigation: this.#navState,
      parentMenu,
    });
  }

  #updateAsRoot(state: ReturnType<MenuCore['getState']>): void {
    if (!this.#menu) return;

    const triggerElement = this.#position.findTrigger();
    this.#syncTrigger(triggerElement);

    applyElementProps(this, {
      ...this.#core.getContentAttrs(state),
      ...getMenuViewportAttrs(),
    });
    applyStateDataAttrs(this, state, MenuDataAttrs);

    if (state.open) {
      tryShowPopover(this);
    } else {
      tryHidePopover(this);
    }

    if (this.#currentTrigger) {
      applyElementProps(this.#currentTrigger, this.#core.getTriggerAttrs(state, this.id));
      applyStyles(this.#currentTrigger, getAnchorNameStyle(this.id));
    }

    if (!state.open) {
      this.#position.cleanup();
      return;
    }

    syncMenuViewRoot(this, this.#navState.stack.length > 0);

    const positionOptions = { side: state.side, align: state.align };

    if (supportsAnchorPositioning()) {
      applyStyles(this, getAnchorPositionStyle(this.id, positionOptions));
    } else {
      const triggerRect = this.#currentTrigger?.getBoundingClientRect();
      const selfRect = getPopupPositionRect(this);
      const boundaryRect = document.documentElement.getBoundingClientRect();
      const offsets = resolveOffsets(this);
      applyStyles(this, getAnchorPositionStyle(this.id, positionOptions, triggerRect, selfRect, boundaryRect, offsets));
    }

    this.#position.sync(this.#currentTrigger);
  }

  #updateAsSubmenu(parentCtx: MenuContextValue): void {
    const parentNavigation = parentCtx.navigation;
    const topEntry = parentNavigation.stack[parentNavigation.stack.length - 1];
    const activeSubMenuId = topEntry?.menuId ?? null;
    const isActive = activeSubMenuId === this.id;

    this.#menuViewTransition.setElement(this);
    this.#menuViewTransition.sync({
      active: isActive,
      direction: parentNavigation.direction,
      triggerId: topEntry?.triggerId ?? null,
    });

    // Apply base submenu attributes regardless of phase.
    const transitionState = this.#menuViewTransition.input.current;

    applyElementProps(this, {
      ...getMenuViewTransitionAttrs(transitionState),
      role: 'menu',
      tabIndex: -1,
      'data-submenu': '',
    });
    syncMenuViewTransition(parentCtx.menu.contentElement, this, transitionState);
  }

  #handleContentKeyDown = (event: UIKeyboardEvent): void => {
    this.#menu?.contentProps.onKeyDown(event);

    const parentCtx = this.#parentCtx.value ?? null;

    if (!parentCtx) return;

    const stack = parentCtx.menu.navigationInput.current.stack;
    const topEntry = stack[stack.length - 1];
    const ownsActiveSubmenu = topEntry?.menuId === this.id;

    if ((event.key === 'ArrowLeft' || event.key === 'Escape') && !event.defaultPrevented) {
      event.preventDefault();
      if (ownsActiveSubmenu) {
        parentCtx.menu.pop();
      }
    }

    if (isMenuNavigationKey(event)) {
      event.stopPropagation();
    }
  };

  #syncTrigger(triggerElement: HTMLElement | null): void {
    if (triggerElement === this.#currentTrigger) return;

    this.#position.cleanup();
    this.#cleanupTrigger();
    this.#currentTrigger = triggerElement;
    this.#menu?.setTriggerElement(triggerElement);

    if (triggerElement && this.#menu) {
      this.#triggerAbort = new AbortController();
      applyElementProps(triggerElement, this.#menu.triggerProps, { signal: this.#triggerAbort.signal });
    }
  }

  #cleanupTrigger(): void {
    if (this.#currentTrigger) {
      applyElementProps(this.#currentTrigger, {
        'aria-expanded': undefined,
        'aria-haspopup': undefined,
        'aria-controls': undefined,
      });
      this.#currentTrigger.style.removeProperty('anchor-name');
    }

    this.#triggerAbort?.abort();
    this.#triggerAbort = null;
    this.#currentTrigger = null;
  }
}
