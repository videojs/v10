import { POPUP_HOST_ATTR, PopoverCore, PopoverDataAttrs, type PopoverInput, type PopoverProps } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createPopover,
  createTransition,
  getAnchorNameStyle,
  getAnchorPositionStyle,
  getPopupPositionRect,
  getPositioningBoundaryRect,
  type PopoverApi,
  type PopoverChangeDetails,
  type PopoverOpenChangeReason,
  type PositioningBoundary,
  resolveOffsets,
  resolvePositioningBoundary,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';
import { applyStyles, supportsAnchorPositioning, tryHidePopover, tryShowPopover } from '@videojs/utils/dom';
import { containerContext } from '../../player/context';
import { MediaElement } from '../media-element';
import { PositionController } from '../position-controller';
/** Custom element shell for the `<media-popover>` tag — anchored popover with hover, focus, and command-based triggers. */
export class PopoverElement extends MediaElement {
  /** Custom element tag name. */
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
    boundary: { type: String },
  } satisfies PropertyDeclarationMap<keyof PopoverCore.Props | 'boundary'>;

  /** Controlled open state. */
  open = PopoverCore.defaultProps.open;
  /** Initial open state for uncontrolled usage. */
  defaultOpen = PopoverCore.defaultProps.defaultOpen;
  /** Side of the trigger to anchor the popover to. */
  side = PopoverCore.defaultProps.side;
  /** Alignment of the popover relative to its trigger along the anchor side. */
  align = PopoverCore.defaultProps.align;
  /** Render the popover as a modal — blocks interaction outside it. */
  modal: PopoverProps['modal'] = PopoverCore.defaultProps.modal;
  /** Close the popover when Escape is pressed. */
  closeOnEscape = PopoverCore.defaultProps.closeOnEscape;
  /** Close the popover when the user clicks outside it. */
  closeOnOutsideClick = PopoverCore.defaultProps.closeOnOutsideClick;
  /** Open the popover on pointer hover over the trigger. */
  openOnHover = PopoverCore.defaultProps.openOnHover;
  /** Milliseconds to wait before opening on hover. */
  delay = PopoverCore.defaultProps.delay;
  /** Milliseconds to wait before closing once hover ends. */
  closeDelay = PopoverCore.defaultProps.closeDelay;
  /** Element the popover is constrained to when computing position. */
  boundary: PositioningBoundary = 'container';

  readonly #core = new PopoverCore();
  readonly #containerCtx = new ContextConsumer(this, { context: containerContext, subscribe: true });
  readonly #position = new PositionController(this);
  #popover: PopoverApi | null = null;
  #snapshot: SnapshotController<PopoverInput> | null = null;

  // Cleanup controllers
  #disconnect: AbortController | null = null;
  #triggerAbort: AbortController | null = null;
  #currentTrigger: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.setAttribute(POPUP_HOST_ATTR, '');

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
      group: () => this.#containerCtx.value?.popupGroup,
    });

    // Register self as the popup element — the element IS the popup.
    this.#popover.setPopupElement(this);

    // Apply popup event handlers (pointerenter/leave, focusout) to self.
    applyElementProps(this, this.#popover.popupProps, { signal: this.#disconnect.signal });

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
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  override destroyCallback(): void {
    this.#cleanupTrigger();
    this.#popover?.destroy();
    super.destroyCallback();
  }

  /** Dismiss the popover. Optional `reason` is forwarded to listeners on the `open-change` event. */
  close(reason: PopoverOpenChangeReason = 'imperative-action'): void {
    this.#popover?.close(reason);
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

    // Discover trigger via commandfor linkage.
    const triggerEl = this.#position.findTrigger();
    this.#syncTrigger(triggerEl);

    // Derive state from core + input.
    const input = this.#popover.input.current;
    this.#core.setInput(input);
    const state = this.#core.getState();

    // Apply popup ARIA and data attributes to self.
    applyElementProps(this, this.#core.getPopupAttrs(state));
    applyStateDataAttrs(this, state, PopoverDataAttrs);

    // Show/hide via Popover API AFTER data attributes are applied so
    // `data-starting-style` is present before the first visible frame.
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
      this.#position.cleanup();
      return;
    }

    // Apply positioning styles to self.
    const posOpts = { side: state.side, align: state.align };
    const boundaryElement = this.#getBoundaryElement();
    const triggerRect = this.#currentTrigger?.getBoundingClientRect();
    const boundaryRect = getPositioningBoundaryRect(boundaryElement);
    const offsets = resolveOffsets(this);

    if (supportsAnchorPositioning()) {
      applyStyles(this, getAnchorPositionStyle(this.id, posOpts, triggerRect, undefined, boundaryRect, offsets));
    } else {
      // JS fallback: measure rects and resolve CSS var offsets.
      const selfRect = getPopupPositionRect(this);
      applyStyles(this, getAnchorPositionStyle(this.id, posOpts, triggerRect, selfRect, boundaryRect, offsets));
    }

    this.#position.sync(this.#currentTrigger, boundaryElement);
  }

  // --- Trigger management ---

  #syncTrigger(triggerEl: HTMLElement | null): void {
    if (triggerEl === this.#currentTrigger) return;

    this.#position.cleanup();
    this.#cleanupTrigger();
    this.#currentTrigger = triggerEl;
    this.#popover?.setTriggerElement(triggerEl);

    if (triggerEl && this.#popover) {
      this.#triggerAbort = new AbortController();
      applyElementProps(triggerEl, this.#popover.triggerProps, { signal: this.#triggerAbort.signal });
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

  #getBoundaryElement(): Element | null {
    return resolvePositioningBoundary(this.boundary, {
      container: this.#containerCtx.value?.container ?? null,
      root: this.getRootNode() as Document | ShadowRoot,
    });
  }
}
