import { MenuCore, MenuDataAttrs, type MenuInput } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createMenu,
  createTransition,
  getAnchorNameStyle,
  getAnchorPositionStyle,
  getPopupPositionRect,
  type MenuApi,
  type MenuChangeDetails,
  resolveOffsets,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';
import { applyStyles, supportsAnchorPositioning, tryHidePopover, tryShowPopover } from '@videojs/utils/dom';

import { MediaElement } from '../media-element';
import { PositionController } from '../position-controller';
import { menuContext } from './context';

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
  #menu: MenuApi | null = null;
  #snapshot: SnapshotController<MenuInput> | null = null;

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

    // The element itself is the content (popup).
    this.#menu.setContentElement(this);

    applyElementProps(this, this.#menu.contentProps, { signal: this.#disconnect.signal });

    if (this.#snapshot) {
      this.#snapshot.track(this.#menu.input);
    } else {
      this.#snapshot = new SnapshotController(this, this.#menu.input);
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
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);

    if (this.#menu && changed.has('open')) {
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

    const triggerElement = this.#position.findTrigger();
    this.#syncTrigger(triggerElement);

    const input = this.#menu.input.current;
    this.#core.setInput(input);
    const state = this.#core.getState();

    applyElementProps(this, this.#core.getContentAttrs(state));
    applyStateDataAttrs(this, state, MenuDataAttrs);

    if (state.open) {
      tryShowPopover(this);
    } else {
      tryHidePopover(this);
    }

    // Apply trigger ARIA and anchor-name.
    if (this.#currentTrigger) {
      applyElementProps(this.#currentTrigger, this.#core.getTriggerAttrs(state, this.id));
      applyStyles(this.#currentTrigger, getAnchorNameStyle(this.id));
    }

    // Provide context to child parts.
    this.#provider.setValue({ menu: this.#menu, state, stateAttrMap: MenuDataAttrs });

    if (!state.open) {
      this.#position.cleanup();
      return;
    }

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
