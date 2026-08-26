import { MenuCore, type MenuInput, MenuPopupDataAttrs, POPUP_HOST_ATTR } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createMenu,
  createMenuPopup,
  createTransition,
  getRootPositionOptions,
  type MenuApi,
  type MenuChangeDetails,
  type MenuOpenChangeReason,
  type MenuPopupApi,
  MenuPositioningCSSVars,
  type PositioningBoundary,
  selectControls,
  type UIFocusEvent,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';
import { tryHidePopover, tryShowPopover } from '@videojs/utils/dom';

import { containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { popupGroupContext } from '../../player/popup-group-context';
import { PositionController } from '../position-controller';
import { UIElement } from '../ui-element';
import { menuContext } from './context';

/**
 * Root menu state and positioned popup. Content pages are direct children.
 *
 * @fires open-change - Fired before the menu's open state changes. Cancel the event to prevent the change.
 */
export class MenuElement extends UIElement {
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
  #menu: MenuApi | null = null;
  #popup: MenuPopupApi | null = null;
  #snapshot: SnapshotController<MenuInput> | null = null;
  #disconnect: AbortController | null = null;
  #triggerAbort: AbortController | null = null;
  #currentTrigger: HTMLElement | null = null;
  #releaseControlsLock: (() => void) | null = null;

  get menu(): MenuApi | null {
    return this.#menu;
  }

  get popup(): MenuPopupApi | null {
    return this.#popup;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.destroyed) return;

    this.setAttribute(POPUP_HOST_ATTR, '');
    this.#disconnect = new AbortController();
    this.#popup = createMenuPopup();
    this.#popup.setElement(this);
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
      group: () => this.#popupGroupCtx.value,
    });
    this.#menu.setPopupElement(this);

    applyElementProps(this, { onFocusOut: this.#handleFocusOut }, { signal: this.#disconnect.signal });

    if (this.#snapshot) this.#snapshot.track(this.#menu.input);
    else this.#snapshot = new SnapshotController(this, this.#menu.input);
  }

  override disconnectedCallback(): void {
    this.#releaseControlsVisibilityLock();
    super.disconnectedCallback();
    this.#position.cleanup();
    this.#cleanupTrigger();
    this.#popup?.destroy();
    this.#popup = null;
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

    this.#core.setProps({
      open: this.open,
      defaultOpen: this.defaultOpen,
      side: this.side,
      align: this.align,
      closeOnEscape: this.closeOnEscape,
      closeOnOutsideClick: this.closeOnOutsideClick,
    });

    if (this.#menu && changed.has('open')) this.#menu.syncOpen(this.open);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    if (!this.#menu || !this.#popup) return;

    const input = this.#menu.input.current;

    this.#core.setInput({ ...input, isSubmenu: false });
    const state = this.#core.getState();

    if (state.open) this.#releaseControlsLock ??= this.#controlsState.value?.requestControlsLock() ?? null;
    else this.#releaseControlsVisibilityLock();

    const triggerElement = this.#position.findTrigger();

    this.#syncTrigger(triggerElement);
    applyElementProps(this, this.#core.getPopupAttrs());
    applyStateDataAttrs(this, state, MenuPopupDataAttrs);

    if (state.open) tryShowPopover(this);
    else tryHidePopover(this);

    if (this.#currentTrigger) {
      applyElementProps(this.#currentTrigger, this.#core.getTriggerAttrs(state, this.#menu.contentElement?.id));
    }

    if (!state.open) {
      this.#position.cleanup();
    } else {
      this.#popup.sync();
      const positionOptions = getRootPositionOptions(state.side, state.align);

      if (positionOptions && this.#currentTrigger) {
        this.#position.sync({
          anchorName: this.id,
          position: positionOptions,
          trigger: this.#currentTrigger,
          boundary: this.boundary,
          container: this.#containerCtx.value?.container ?? null,
          cssVars: MenuPositioningCSSVars,
          trackResize: false,
          onSideChange: (side) => this.setAttribute(MenuPopupDataAttrs.side, side),
        });
      }
    }

    this.#provider.setValue({
      core: this.#core,
      menu: this.#menu,
      popup: this.#popup,
      state,
      setTriggerState: () => {},
    });
  }

  #releaseControlsVisibilityLock(): void {
    this.#releaseControlsLock?.();
    this.#releaseControlsLock = null;
  }

  #handleFocusOut = (event: UIFocusEvent): void => {
    this.#menu?.contentProps.onFocusOut(event);
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
    }

    this.#triggerAbort?.abort();
    this.#triggerAbort = null;
    this.#currentTrigger = null;
  }
}
