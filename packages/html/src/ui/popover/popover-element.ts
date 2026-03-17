import { PopoverCore, PopoverDataAttrs, type PopoverInput, type PopoverProps } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createPopover,
  createTransition,
  getAnchorNameStyle,
  getAnchorPositionStyle,
  getPopupPositionRect,
  type PopoverApi,
  type PopoverChangeDetails,
  resolveOffsets,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { SnapshotController } from '@videojs/store/html';
import { applyStyles, supportsAnchorPositioning, tryHidePopover, tryShowPopover } from '@videojs/utils/dom';

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
  } satisfies PropertyDeclarationMap<keyof PopoverCore.Props>;

  open = PopoverCore.defaultProps.open;
  defaultOpen = PopoverCore.defaultProps.defaultOpen;
  side = PopoverCore.defaultProps.side;
  align = PopoverCore.defaultProps.align;
  modal: PopoverProps['modal'] = PopoverCore.defaultProps.modal;
  closeOnEscape = PopoverCore.defaultProps.closeOnEscape;
  closeOnOutsideClick = PopoverCore.defaultProps.closeOnOutsideClick;
  openOnHover = PopoverCore.defaultProps.openOnHover;
  delay = PopoverCore.defaultProps.delay;
  closeDelay = PopoverCore.defaultProps.closeDelay;

  readonly #core = new PopoverCore();
  #popover: PopoverApi | null = null;
  #snapshot: SnapshotController<PopoverInput> | null = null;

  // Cleanup controllers
  #disconnect: AbortController | null = null;
  #triggerAbort: AbortController | null = null;
  #currentTrigger: HTMLElement | null = null;
  #triggerObserver: MutationObserver | null = null;
  #triggerObserverTarget: Node | null = null;
  #triggerAvailabilityObserver: MutationObserver | null = null;
  #observedTrigger: HTMLElement | null = null;
  #positionAbort: AbortController | null = null;
  #positionFrame = 0;
  #resizeObserver: ResizeObserver | null = null;
  #positionTrigger: HTMLElement | null = null;
  #availabilityHidden = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();

    this.#popover = createPopover({
      transition: createTransition(),
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
    applyElementProps(this, this.#popover.popupProps, { signal: this.#disconnect.signal });

    if (this.id) {
      this.#observeTriggerLinkage(null);
    }

    // Subscribe to interaction state for reactive updates.
    // Reuse the controller across connect/disconnect cycles to avoid
    // leaking stale controllers in the host's controller set.
    if (this.#snapshot) {
      this.#snapshot.track(this.#popover.input);
    } else {
      this.#snapshot = new SnapshotController(this, this.#popover.input);
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);

    // Uncontrolled mode: open if `defaultOpen` is set. Controlled `open`
    // is already synced by `willUpdate` on the first render cycle.
    if (this.defaultOpen && !this.open) {
      this.#popover?.open();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupPositioning();
    this.#cleanupTriggerObserver();
    this.#cleanupTriggerAvailabilityObserver();
    this.#cleanupTrigger();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  override destroyCallback(): void {
    this.#cleanupPositioning();
    this.#cleanupTriggerObserver();
    this.#cleanupTriggerAvailabilityObserver();
    this.#cleanupTrigger();
    this.#popover?.destroy();
    super.destroyCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);

    // Sync controlled open state
    if (this.#popover && changed.has('open')) {
      const { active: interactionOpen } = this.#popover.input.current;
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

    const availableTriggerEl = this.#syncTriggerLinkage();

    // Derive state from core + input.
    const input = this.#popover.input.current;
    this.#core.setInput(input);
    const state = this.#core.getState();

    // Apply popup ARIA and data attributes to self.
    applyElementProps(this, this.#core.getPopupAttrs(state));
    applyStateDataAttrs(this, state, PopoverDataAttrs);

    // Show/hide via Popover API AFTER data attributes are applied so
    // `data-starting-style` is present before the first visible frame.
    if (!availableTriggerEl) return;

    if (state.open) {
      tryShowPopover(this);
    } else {
      tryHidePopover(this);
    }

    // Apply trigger ARIA and anchor-name to the discovered trigger.
    if (this.#currentTrigger) {
      applyElementProps(this.#currentTrigger, this.#core.getTriggerAttrs(state, this.id));
      applyStyles(this.#currentTrigger, getAnchorNameStyle(this.id));
    }

    // Skip positioning when closed — no rects to measure.
    if (!state.open) {
      this.#cleanupPositioning();
      return;
    }

    // Apply positioning styles to self.
    const posOpts = { side: state.side, align: state.align };

    if (supportsAnchorPositioning()) {
      // Native CSS Anchor Positioning — no JS rect measurements needed.
      applyStyles(this, getAnchorPositionStyle(this.id, posOpts));
    } else {
      // JS fallback: measure rects and resolve CSS var offsets.
      const triggerRect = this.#currentTrigger?.getBoundingClientRect();
      const selfRect = getPopupPositionRect(this);
      const boundaryRect = document.documentElement.getBoundingClientRect();
      const offsets = resolveOffsets(this);
      applyStyles(this, getAnchorPositionStyle(this.id, posOpts, triggerRect, selfRect, boundaryRect, offsets));
    }

    this.#syncPositioning();
  }

  // --- Trigger discovery ---

  #findTrigger(): HTMLElement | null {
    if (!this.id) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return this.#findLinkedTrigger(root);
  }

  #isTriggerAvailable(triggerEl: HTMLElement | null): triggerEl is HTMLElement {
    if (!triggerEl) return false;

    const availability = triggerEl.getAttribute('data-availability');
    return !availability || availability === 'available';
  }

  #syncTrigger(triggerEl: HTMLElement | null): void {
    if (triggerEl === this.#currentTrigger) return;

    this.#cleanupPositioning();
    this.#cleanupTrigger();
    this.#currentTrigger = triggerEl;
    this.#popover?.setTriggerElement(triggerEl);

    if (triggerEl && this.#popover) {
      this.#triggerAbort = new AbortController();
      applyElementProps(triggerEl, this.#popover.triggerProps, { signal: this.#triggerAbort.signal });
    }
  }

  #observeTriggerLinkage(triggerEl: HTMLElement | null): void {
    if (!this.id) {
      this.#cleanupTriggerObserver();
      return;
    }

    const target = this.#getTriggerObserverTarget(triggerEl);

    if (target === this.#triggerObserverTarget) return;

    this.#cleanupTriggerObserver();
    this.#triggerObserverTarget = target;

    if (!(target instanceof Node)) return;

    this.#triggerObserver = new MutationObserver((records) => {
      if (records.some((record) => this.#isTriggerLinkageMutation(record))) {
        this.#syncTriggerLinkage();
        this.requestUpdate();
      }
    });

    this.#triggerObserver.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['commandfor'],
    });
  }

  #cleanupTriggerObserver(): void {
    this.#triggerObserver?.disconnect();
    this.#triggerObserver = null;
    this.#triggerObserverTarget = null;
  }

  #syncTriggerAvailabilityObserver(triggerEl: HTMLElement | null): void {
    if (triggerEl === this.#observedTrigger) return;

    this.#cleanupTriggerAvailabilityObserver();
    this.#observedTrigger = triggerEl;

    if (!triggerEl) return;

    this.#triggerAvailabilityObserver = new MutationObserver(() => {
      this.#syncTriggerLinkage();
      this.requestUpdate();
    });

    this.#triggerAvailabilityObserver.observe(triggerEl, {
      attributes: true,
      attributeFilter: ['data-availability', 'commandfor'],
    });
  }

  #cleanupTriggerAvailabilityObserver(): void {
    this.#triggerAvailabilityObserver?.disconnect();
    this.#triggerAvailabilityObserver = null;
    this.#observedTrigger = null;
  }

  #isTriggerLinkageMutation(record: MutationRecord): boolean {
    if (record.type === 'attributes') {
      return record.target instanceof HTMLElement && this.#isLinkedTrigger(record.target);
    }

    for (const node of record.addedNodes) {
      if (this.#hasLinkedTrigger(node)) return true;
    }

    for (const node of record.removedNodes) {
      if (this.#hasLinkedTrigger(node)) return true;
    }

    return false;
  }

  #hasLinkedTrigger(node: Node): boolean {
    if (!(node instanceof HTMLElement)) return false;
    if (this.#isLinkedTrigger(node)) return true;
    return !!this.#findLinkedTrigger(node);
  }

  #isLinkedTrigger(element: HTMLElement): boolean {
    return !!this.id && element.getAttribute('commandfor') === this.id;
  }

  #findLinkedTrigger(root: ParentNode): HTMLElement | null {
    if (!this.id) return null;

    if (globalThis.CSS?.escape) {
      const selector = `[commandfor="${globalThis.CSS.escape(this.id)}"]`;
      return root.querySelector<HTMLElement>(selector);
    }

    for (const element of root.querySelectorAll<HTMLElement>('[commandfor]')) {
      if (element.getAttribute('commandfor') === this.id) return element;
    }

    return null;
  }

  #syncTriggerLinkage(): HTMLElement | null {
    const triggerEl = this.#findTrigger();
    this.#observeTriggerLinkage(triggerEl);
    this.#syncTriggerAvailabilityObserver(triggerEl);
    const availableTriggerEl = this.#isTriggerAvailable(triggerEl) ? triggerEl : null;

    this.#syncAvailabilityVisibility(Boolean(availableTriggerEl));
    this.#syncTrigger(availableTriggerEl);

    if (!availableTriggerEl && this.#popover?.input.current.active) {
      this.#popover.close();
    }

    if (!availableTriggerEl) {
      tryHidePopover(this);
      this.#cleanupPositioning();
    }

    return availableTriggerEl;
  }

  #getTriggerObserverTarget(triggerEl: HTMLElement | null): Node | null {
    const root = this.getRootNode();
    const fallbackTarget = root instanceof Document ? (root.body ?? root.documentElement) : root;

    if (!triggerEl) return fallbackTarget;

    return findClosestCommonAncestor(this, triggerEl) ?? fallbackTarget;
  }

  #syncAvailabilityVisibility(available: boolean): void {
    if (!available) {
      if (!this.hidden) {
        this.hidden = true;
        this.#availabilityHidden = true;
      }

      return;
    }

    if (this.#availabilityHidden) {
      this.hidden = false;
      this.#availabilityHidden = false;
    }
  }

  #cleanupTrigger(): void {
    if (this.#currentTrigger) {
      // Remove ARIA attributes and anchor-name style from the old trigger.
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

  #syncPositioning(): void {
    if (supportsAnchorPositioning()) return;

    const triggerEl = this.#currentTrigger;

    if (!triggerEl) return;
    if (this.#positionAbort && this.#positionTrigger === triggerEl) return;

    this.#cleanupPositioning();
    this.#positionAbort = new AbortController();
    this.#positionTrigger = triggerEl;
    const { signal } = this.#positionAbort;

    const reposition = () => {
      cancelAnimationFrame(this.#positionFrame);
      this.#positionFrame = requestAnimationFrame(() => {
        if (signal.aborted) return;
        this.requestUpdate();
      });
    };

    window.addEventListener('scroll', reposition, { capture: true, passive: true, signal });
    window.addEventListener('resize', reposition, { signal });

    if (typeof ResizeObserver === 'function') {
      this.#resizeObserver = new ResizeObserver(() => {
        reposition();
      });
      this.#resizeObserver.observe(triggerEl);
      this.#resizeObserver.observe(this);
    }

    reposition();
  }

  #cleanupPositioning(): void {
    this.#positionAbort?.abort();
    this.#positionAbort = null;
    this.#positionTrigger = null;
    cancelAnimationFrame(this.#positionFrame);
    this.#positionFrame = 0;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }
}

function findClosestCommonAncestor(a: Node, b: Node): Node | null {
  const ancestors = new Set<Node>();
  let current: Node | null = a;

  while (current) {
    ancestors.add(current);
    current = current.parentNode;
  }

  current = b;

  while (current) {
    if (ancestors.has(current)) return current;
    current = current.parentNode;
  }

  return null;
}
