import { MenuCore, MenuDataAttrs, type MenuInput, POPUP_HOST_ATTR } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createMenu,
  createTransition,
  getRootPositionOptions,
  isMenuNavigationKey,
  type MenuApi,
  type MenuChangeDetails,
  type MenuOpenChangeReason,
  MenuPositioningCSSVars,
  observeMenuSize,
  type PositioningBoundary,
  selectControls,
  syncMenuSizeChain,
  type UIFocusEvent,
  type UIKeyboardEvent,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';
import { tryHidePopover, tryShowPopover } from '@videojs/utils/dom';
import { containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { popupGroupContext } from '../../player/popup-group-context';
import { MediaElement } from '../media-element';
import { PositionController } from '../position-controller';
import { type MenuContextValue, type MenuTriggerMetadata, menuContext } from './context';

const defaultTriggerMetadata: MenuTriggerMetadata = {
  hint: '',
  disabled: false,
};

export class MenuElement extends MediaElement {
  static readonly tagName: string = 'media-menu';

  static override properties = {
    open: { type: Boolean },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    side: { type: String },
    align: { type: String },
    closeOnEscape: { type: Boolean, attribute: 'close-on-escape' },
    closeOnOutsideClick: { type: Boolean, attribute: 'close-on-outside-click' },
    boundary: { type: String },
  } satisfies PropertyDeclarationMap<
    'open' | 'defaultOpen' | 'side' | 'align' | 'closeOnEscape' | 'closeOnOutsideClick' | 'boundary'
  >;

  open = MenuCore.defaultProps.open;
  defaultOpen = MenuCore.defaultProps.defaultOpen;
  side = MenuCore.defaultProps.side;
  align = MenuCore.defaultProps.align;
  closeOnEscape = MenuCore.defaultProps.closeOnEscape;
  closeOnOutsideClick = MenuCore.defaultProps.closeOnOutsideClick;
  boundary: PositioningBoundary = 'container';

  readonly #core = new MenuCore();
  readonly #provider = new ContextProvider(this, { context: menuContext });
  readonly #position = new PositionController(this);
  readonly #controlsState = new PlayerController(this, playerContext, selectControls);
  readonly #containerCtx = new ContextConsumer(this, { context: containerContext, subscribe: true });
  readonly #popupGroupCtx = new ContextConsumer(this, { context: popupGroupContext });
  // Consume parent menu context — present when this is a nested (submenu) element.
  readonly #parentCtx = new ContextConsumer(this, { context: menuContext, subscribe: true });
  #menu: MenuApi | null = null;
  #snapshot: SnapshotController<MenuInput> | null = null;
  #submenuActive = false;

  #disconnect: AbortController | null = null;
  #triggerAbort: AbortController | null = null;
  #cleanupSizeObserver: (() => void) | null = null;
  #currentTrigger: HTMLElement | null = null;
  #metadataTrigger: HTMLElement | null = null;
  #triggerMetadata = defaultTriggerMetadata;
  #releaseControlsLock: (() => void) | null = null;
  #registeredParentMenu: MenuApi | null = null;
  #cleanupParentRegistration: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.setAttribute(POPUP_HOST_ATTR, '');

    this.#disconnect = new AbortController();

    this.#menu = createMenu({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean, details: MenuChangeDetails) => {
        const accepted = this.dispatchEvent(
          new CustomEvent('open-change', {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: { open: nextOpen, ...details },
          })
        );
        if (accepted) this.open = nextOpen;
      },
      closeOnEscape: () => this.closeOnEscape,
      closeOnOutsideClick: () => this.closeOnOutsideClick,
      group: () => (this.#parentCtx.value ? undefined : this.#popupGroupCtx.value),
    });

    // The element itself is the content (popup) for root menus.
    // Submenu detection happens in update() once parent context is available.
    this.#menu.setContentElement(this);

    applyElementProps(
      this,
      { onKeyDown: this.#handleContentKeyDown, onFocusOut: this.#handleContentFocusOut },
      { signal: this.#disconnect.signal }
    );

    if (this.#snapshot) {
      this.#snapshot.track(this.#menu.input);
    } else {
      this.#snapshot = new SnapshotController(this, this.#menu.input);
    }
  }

  override disconnectedCallback(): void {
    this.#releaseControlsVisibilityLock();
    super.disconnectedCallback();
    this.#cleanupSizeObserver?.();
    this.#cleanupSizeObserver = null;
    this.#syncTriggerMetadata(null);
    this.#cleanupTrigger();
    this.#cleanupParentRegistration?.();
    this.#cleanupParentRegistration = null;
    this.#registeredParentMenu = null;
    this.#menu?.destroy();
    this.#menu = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  close(reason: MenuOpenChangeReason = 'imperative-action'): void {
    this.#menu?.close(reason);
  }

  openMenu(reason: MenuOpenChangeReason = 'imperative-action'): void {
    this.#menu?.open(reason);
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);

    if (!this.hasUpdated && this.defaultOpen && !this.open) this.open = true;

    const parentCtx = this.#parentCtx.value ?? null;
    const isSubmenu = parentCtx !== null;
    this.#syncParentRegistration(parentCtx);

    this.#core.setProps({
      open: this.open,
      defaultOpen: this.defaultOpen,
      side: this.side,
      align: this.align,
      closeOnEscape: this.closeOnEscape,
      closeOnOutsideClick: this.closeOnOutsideClick,
      isSubmenu,
    });

    if (this.#menu && changed.has('open')) {
      this.#menu.syncOpen(this.open);
    }
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    if (!this.#menu) return;

    const parentCtx = this.#parentCtx.value ?? null;
    const isSubmenu = parentCtx !== null;

    const input = this.#menu.input.current;
    this.#core.setInput(input);
    const state = this.#core.getState();

    if (!isSubmenu && state.open) {
      this.#releaseControlsLock ??= this.#controlsState.value?.requestControlsLock() ?? null;
    } else {
      this.#releaseControlsVisibilityLock();
    }

    if (isSubmenu && parentCtx) {
      this.#updateAsSubmenu(state, parentCtx);
    } else {
      this.#updateAsRoot(state);
    }

    // Provide context to child parts.
    this.#provider.setValue({
      menu: this.#menu,
      state,
      stateAttrMap: MenuDataAttrs,
      setTriggerMetadata: this.#setTriggerMetadata,
    });
  }

  #releaseControlsVisibilityLock(): void {
    this.#releaseControlsLock?.();
    this.#releaseControlsLock = null;
  }

  #syncParentRegistration(parentCtx: MenuContextValue | null): void {
    const parentMenu = parentCtx?.menu ?? null;
    if (parentMenu === this.#registeredParentMenu || !this.#menu) return;

    this.#cleanupParentRegistration?.();
    this.#registeredParentMenu = parentMenu;
    this.#cleanupParentRegistration = parentMenu?.registerSubmenu(this.#menu) ?? null;
  }

  #updateAsRoot(state: ReturnType<MenuCore['getState']>): void {
    if (!this.#menu) return;

    const triggerElement = this.#position.findTrigger();
    this.#syncTrigger(triggerElement);

    applyElementProps(this, {
      ...this.#core.getContentAttrs(state),
    });
    applyStateDataAttrs(this, state, MenuDataAttrs);

    if (state.open) {
      tryShowPopover(this);
    } else {
      tryHidePopover(this);
    }

    if (this.#currentTrigger) {
      applyElementProps(this.#currentTrigger, this.#core.getTriggerAttrs(state, this.id));
    }

    if (!state.open) {
      this.#cleanupSizeObserver?.();
      this.#cleanupSizeObserver = null;
      this.#position.cleanup();
      return;
    }

    this.#cleanupSizeObserver?.();
    const syncSize = () => syncMenuSizeChain(this);
    syncSize();
    this.#cleanupSizeObserver = observeMenuSize(this, syncSize);

    const positionOptions = getRootPositionOptions(state.side, state.align);
    if (!positionOptions || !this.#currentTrigger) return;

    this.#position.sync({
      anchorName: this.id,
      position: positionOptions,
      trigger: this.#currentTrigger,
      boundary: this.boundary,
      container: this.#containerCtx.value?.container ?? null,
      cssVars: MenuPositioningCSSVars,
      onSideChange: (side) => this.setAttribute(MenuDataAttrs.side, side),
    });
  }

  #updateAsSubmenu(state: ReturnType<MenuCore['getState']>, parentCtx: MenuContextValue): void {
    const isActive = state.open || state.status === 'ending';
    const triggerElement = this.parentElement?.querySelector<HTMLElement>(
      `[data-has-submenu][commandfor="${this.id}"]`
    );

    this.#menu?.setTriggerElement(triggerElement ?? null);
    if (triggerElement) applyElementProps(triggerElement, this.#core.getTriggerAttrs(state, this.id));
    this.#syncTriggerMetadata(triggerElement ?? null);

    this.removeAttribute(MenuDataAttrs.side);
    this.removeAttribute(MenuDataAttrs.align);
    applyStateDataAttrs(this, state, MenuDataAttrs);

    applyElementProps(this, {
      hidden: !isActive,
      role: 'menu',
      tabIndex: -1,
    });

    if (isActive && !this.#submenuActive) {
      this.#menu?.highlightFirstItem({ preventScroll: true });
    } else if (!isActive && this.#submenuActive) {
      triggerElement?.focus({ preventScroll: true });
    }

    this.#submenuActive = isActive;
    this.#cleanupSizeObserver?.();
    const parentContentElement = parentCtx.menu.contentElement;
    const syncSize = () => syncMenuSizeChain(parentContentElement);
    syncSize();
    this.#cleanupSizeObserver =
      isActive && parentContentElement ? observeMenuSize(parentContentElement, syncSize) : null;
  }

  #handleContentKeyDown = (event: UIKeyboardEvent): void => {
    const isNavigationKey = isMenuNavigationKey(event);
    const defaultPreventedBeforeMenu = event.defaultPrevented;

    this.#menu?.contentProps.onKeyDown(event);

    const parentCtx = this.#parentCtx.value ?? null;

    if (!parentCtx) {
      if (event.key === 'Escape') return;
      if (isNavigationKey) {
        event.stopPropagation();
      }
      return;
    }

    const isBackNavigationKey = event.key === 'ArrowLeft' || event.key === 'Escape';

    if (isBackNavigationKey && !defaultPreventedBeforeMenu) {
      event.preventDefault();
      this.#menu?.close('escape');
    }

    if (isNavigationKey) event.stopPropagation();
  };

  #handleContentFocusOut = (event: UIFocusEvent): void => {
    this.#menu?.contentProps.onFocusOut(event);
  };

  #setTriggerMetadata = (metadata: MenuTriggerMetadata): void => {
    if (
      metadata.hint === this.#triggerMetadata.hint &&
      metadata.disabled === this.#triggerMetadata.disabled &&
      metadata.availability === this.#triggerMetadata.availability
    ) {
      return;
    }

    this.#triggerMetadata = metadata;
    if (metadata.disabled && this.open && this.#parentCtx.value) this.close('imperative-action');
    this.requestUpdate();
  };

  #syncTriggerMetadata(trigger: HTMLElement | null): void {
    if (trigger !== this.#metadataTrigger) {
      this.#clearTriggerMetadata();
      this.#metadataTrigger = trigger;
    }

    if (!trigger) return;

    const disabled = this.#triggerMetadata.disabled || isTriggerExplicitlyDisabled(trigger);
    applyElementProps(trigger, {
      'aria-disabled': disabled ? 'true' : undefined,
      'data-availability': this.#triggerMetadata.availability,
    });

    const hint = trigger.querySelector<HTMLElement>('[data-part~="hint"]');
    if (hint && hint.textContent !== this.#triggerMetadata.hint) hint.textContent = this.#triggerMetadata.hint;
  }

  #clearTriggerMetadata(): void {
    const trigger = this.#metadataTrigger;
    if (!trigger) return;

    applyElementProps(trigger, {
      'aria-disabled': isTriggerExplicitlyDisabled(trigger) ? 'true' : undefined,
      'data-availability': undefined,
    });

    const hint = trigger.querySelector<HTMLElement>('[data-part~="hint"]');
    if (hint?.textContent) hint.textContent = '';
    this.#metadataTrigger = null;
  }

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
    }

    this.#triggerAbort?.abort();
    this.#triggerAbort = null;
    this.#currentTrigger = null;
  }
}

function isTriggerExplicitlyDisabled(trigger: HTMLElement): boolean {
  return (
    trigger.hasAttribute('disabled') ||
    ('disabled' in trigger && (trigger as HTMLElement & { disabled?: boolean }).disabled === true)
  );
}
