import { PopoverCore, PopoverDataAttrs, type PopoverInteraction, type PopoverProps } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createPopover,
  getAnchorNameStyle,
  getAnchorPositionStyle,
  type PopoverChangeDetails,
  type PopoverHandle,
  resolveOffsets,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { SnapshotController } from '@videojs/store/html';
import { applyStyles } from '@videojs/utils/dom';

import { MediaElement } from '../media-element';

export class PopoverElement extends MediaElement {
  static readonly tagName = 'media-popover';

  static override properties = {
    open: { type: Boolean },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    side: { type: String },
    align: { type: String },
    modal: { type: Boolean },
    closeOnEscape: { type: Boolean, attribute: 'close-on-escape' },
    closeOnOutsideClick: { type: Boolean, attribute: 'close-on-outside-click' },
    openOnHover: { type: Boolean, attribute: 'open-on-hover' },
    delay: { type: Number },
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<keyof PopoverCore.RootProps>;

  // Controlled/uncontrolled
  open = PopoverCore.defaultRootProps.open;
  defaultOpen = PopoverCore.defaultRootProps.defaultOpen;

  // Core props
  side = PopoverCore.defaultProps.side;
  align = PopoverCore.defaultProps.align;
  modal: PopoverProps['modal'] = PopoverCore.defaultProps.modal;
  closeOnEscape = PopoverCore.defaultProps.closeOnEscape;
  closeOnOutsideClick = PopoverCore.defaultProps.closeOnOutsideClick;

  // Interaction props
  openOnHover = PopoverCore.defaultRootProps.openOnHover;
  delay = PopoverCore.defaultRootProps.delay;
  closeDelay = PopoverCore.defaultRootProps.closeDelay;

  readonly #core = new PopoverCore();
  #popover: PopoverHandle | null = null;
  #snapshot: SnapshotController<PopoverInteraction> | null = null;

  // Cleanup controllers
  #disconnect: AbortController | null = null;
  #triggerAc: AbortController | null = null;
  #currentTrigger: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();

    this.#popover = createPopover({
      onOpenChange: (nextOpen: boolean, details: PopoverChangeDetails) => {
        this.open = nextOpen;
        this.dispatchEvent(new CustomEvent('open-change', { detail: { open: nextOpen, ...details } }));
      },
      closeOnEscape: () => this.closeOnEscape,
      closeOnOutsideClick: () => this.closeOnOutsideClick,
      openOnHover: () => this.openOnHover,
      delay: () => this.delay,
      closeDelay: () => this.closeDelay,
    });

    // Register self as the popup element — the element IS the popup.
    this.#popover.setPopupElement(this);

    // Apply popup event handlers (pointerenter/leave, focusout) to self.
    applyElementProps(this, this.#popover.popupProps, this.#disconnect.signal);

    // Subscribe to interaction state for reactive updates.
    // Reuse the controller across connect/disconnect cycles to avoid
    // leaking stale controllers in the host's controller set.
    if (this.#snapshot) {
      this.#snapshot.track(this.#popover.interaction);
    } else {
      this.#snapshot = new SnapshotController(this, this.#popover.interaction);
    }

    // Determine initial open state: controlled mode uses the `open`
    // attribute, uncontrolled mode uses `defaultOpen`.
    const isControlled = this.hasAttribute('open');
    const shouldOpen = isControlled ? this.open : this.defaultOpen;

    if (shouldOpen) {
      this.#popover.open();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupTrigger();
    this.#popover?.destroy();
    this.#popover = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);

    // Sync controlled open state
    if (this.#popover && changed.has('open')) {
      const { open: interactionOpen } = this.#popover.interaction.current;
      if (this.open !== interactionOpen) {
        if (this.open) {
          this.#popover.open();
        } else {
          this.#popover.close();
        }
      }
    }
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    if (!this.#popover) return;

    // Discover trigger via commandfor linkage.
    const triggerEl = this.#findTrigger();
    this.#syncTrigger(triggerEl);

    // Derive state from core + interaction.
    const interaction = this.#popover.interaction.current;
    const state = this.#core.getState(interaction);

    // Apply popup ARIA and data attributes to self.
    applyElementProps(this, this.#core.getPopupAttrs(state));
    applyStateDataAttrs(this, state, PopoverDataAttrs);

    // Apply trigger ARIA and anchor-name to the discovered trigger.
    if (this.#currentTrigger) {
      applyElementProps(this.#currentTrigger, this.#core.getTriggerAttrs(state, this.id));
      applyStyles(this.#currentTrigger, getAnchorNameStyle(this.id));
    }

    // Skip positioning when closed — no rects to measure.
    if (!state.open) return;

    // Apply positioning styles to self.
    // CSS Anchor Positioning is used when supported; otherwise falls
    // back to JS-computed fixed positioning from measured rects.
    const posOpts = { side: state.side, align: state.align };
    const triggerRect = this.#currentTrigger?.getBoundingClientRect();
    const selfRect = this.getBoundingClientRect();
    const boundaryRect = document.documentElement.getBoundingClientRect();
    const offsets = resolveOffsets(this);

    applyStyles(this, getAnchorPositionStyle(this.id, posOpts, triggerRect, selfRect, boundaryRect, offsets));
  }

  // --- Trigger discovery ---

  #findTrigger(): HTMLElement | null {
    if (!this.id) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return root.querySelector<HTMLElement>(`[commandfor="${this.id}"]`);
  }

  #syncTrigger(triggerEl: HTMLElement | null): void {
    if (triggerEl === this.#currentTrigger) return;

    this.#cleanupTrigger();
    this.#currentTrigger = triggerEl;
    this.#popover?.setTriggerElement(triggerEl);

    if (triggerEl && this.#popover) {
      this.#triggerAc = new AbortController();
      applyElementProps(triggerEl, this.#popover.triggerProps, this.#triggerAc.signal);
    }
  }

  #cleanupTrigger(): void {
    // Remove ARIA attributes from the old trigger to avoid stale state.
    if (this.#currentTrigger) {
      this.#currentTrigger.removeAttribute('aria-expanded');
      this.#currentTrigger.removeAttribute('aria-haspopup');
      this.#currentTrigger.removeAttribute('aria-controls');
    }

    this.#triggerAc?.abort();
    this.#triggerAc = null;
    this.#currentTrigger = null;
  }
}
