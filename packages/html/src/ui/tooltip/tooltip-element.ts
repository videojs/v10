import { type ButtonState, TooltipCore, TooltipCSSVars, TooltipDataAttrs, type TooltipInput } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createTooltip,
  createTransition,
  getAnchorNameStyle,
  getAnchorPositionStyle,
  getPopupPositionRect,
  resolveOffsets,
  type TooltipApi,
  type TooltipChangeDetails,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import type { State } from '@videojs/store';
import { SnapshotController } from '@videojs/store/html';
import { applyStyles, supportsAnchorPositioning, tryHidePopover, tryShowPopover } from '@videojs/utils/dom';

import { MediaElement } from '../media-element';
import { PositionController } from '../position-controller';
import { tooltipGroupContext } from './context';

type TriggerElement = HTMLElement & {
  getLabel(): string | undefined;
  $state: State<ButtonState>;
};

function isLabelTrigger(el: HTMLElement): el is TriggerElement {
  return '$state' in el;
}

export class TooltipElement extends MediaElement {
  static readonly tagName = 'media-tooltip';

  static override properties = {
    open: { type: Boolean },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    side: { type: String },
    align: { type: String },
    delay: { type: Number },
    closeDelay: { type: Number, attribute: 'close-delay' },
    disableHoverablePopup: { type: Boolean, attribute: 'disable-hoverable-popup' },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<keyof TooltipCore.Props>;

  open = TooltipCore.defaultProps.open;
  defaultOpen = TooltipCore.defaultProps.defaultOpen;
  side = TooltipCore.defaultProps.side;
  align = TooltipCore.defaultProps.align;
  delay = TooltipCore.defaultProps.delay;
  closeDelay = TooltipCore.defaultProps.closeDelay;
  disableHoverablePopup = TooltipCore.defaultProps.disableHoverablePopup;
  disabled = TooltipCore.defaultProps.disabled;

  readonly #core = new TooltipCore();
  readonly #groupConsumer = new ContextConsumer(this, { context: tooltipGroupContext });
  readonly #position = new PositionController(this);
  #tooltip: TooltipApi | null = null;
  #snapshot: SnapshotController<TooltipInput> | null = null;

  // Cleanup controllers
  #disconnect: AbortController | null = null;
  #triggerAbort: AbortController | null = null;
  #currentTrigger: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();

    this.#tooltip = createTooltip({
      transition: createTransition(),
      onOpenChange: (nextOpen: boolean, details: TooltipChangeDetails) => {
        this.open = nextOpen;
        this.dispatchEvent(new CustomEvent('open-change', { detail: { open: nextOpen, ...details } }));
      },
      delay: () => this.delay,
      closeDelay: () => this.closeDelay,
      disableHoverablePopup: () => this.disableHoverablePopup,
      disabled: () => this.disabled,
      // Lazy getter — group may arrive after connect via context.
      group: () => this.#groupConsumer.value,
    });

    // Register self as the popup element — the element IS the popup.
    this.#tooltip.setPopupElement(this);

    // Apply popup event handlers (pointerenter/leave, focusout) to self.
    applyElementProps(this, this.#tooltip.popupProps, { signal: this.#disconnect.signal });

    // Subscribe to interaction state for reactive updates.
    if (this.#snapshot) {
      this.#snapshot.track(this.#tooltip.input);
    } else {
      this.#snapshot = new SnapshotController(this, this.#tooltip.input);
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);

    // Uncontrolled mode: open if `defaultOpen` is set. Controlled `open`
    // is already synced by `willUpdate` on the first render cycle.
    if (this.defaultOpen && !this.open) {
      this.#tooltip?.open();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupTrigger();
    this.#tooltip?.destroy();
    this.#tooltip = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);

    // Sync controlled open state
    if (this.#tooltip && changed.has('open')) {
      const { active: interactionOpen } = this.#tooltip.input.current;
      if (this.open !== interactionOpen) {
        if (this.open) {
          this.#tooltip.open();
        } else {
          this.#tooltip.close();
        }
      }
    }
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    if (!this.#tooltip) return;

    // Discover trigger via commandfor linkage.
    const triggerEl = this.#position.findTrigger();
    this.#syncTrigger(triggerEl);

    // Derive state from core + input.
    const input = this.#tooltip.input.current;
    this.#core.setInput(input);
    const state = this.#core.getState();

    // Apply popup ARIA and data attributes to self.
    applyElementProps(this, this.#core.getPopupAttrs(state));
    applyStateDataAttrs(this, state, TooltipDataAttrs);

    // Show/hide via Popover API AFTER data attributes are applied so
    // `data-starting-style` is present before the first visible frame.
    if (state.open) {
      tryShowPopover(this);
    } else {
      tryHidePopover(this);
    }

    // Apply anchor-name to the discovered trigger for CSS positioning.
    if (this.#currentTrigger) {
      applyStyles(this.#currentTrigger, getAnchorNameStyle(this.id));
    }

    // Skip positioning when closed — no rects to measure.
    if (!state.open) {
      this.#position.cleanup();
      return;
    }

    // Apply positioning styles to self.
    const posOpts = { side: state.side, align: state.align };

    if (supportsAnchorPositioning()) {
      // Native CSS Anchor Positioning — no JS rect measurements needed.
      applyStyles(
        this,
        getAnchorPositionStyle(this.id, posOpts, undefined, undefined, undefined, undefined, TooltipCSSVars)
      );
    } else {
      // JS fallback: measure rects and resolve CSS var offsets.
      const triggerRect = this.#currentTrigger?.getBoundingClientRect();
      const selfRect = getPopupPositionRect(this);
      const boundaryRect = document.documentElement.getBoundingClientRect();
      const offsets = resolveOffsets(this, TooltipCSSVars);
      applyStyles(
        this,
        getAnchorPositionStyle(this.id, posOpts, triggerRect, selfRect, boundaryRect, offsets, TooltipCSSVars)
      );
    }

    this.#position.sync(this.#currentTrigger);
  }

  // --- Trigger management ---

  #syncTrigger(triggerEl: HTMLElement | null): void {
    if (triggerEl === this.#currentTrigger) return;

    this.#position.cleanup();
    this.#cleanupTrigger();
    this.#currentTrigger = triggerEl;
    this.#tooltip?.setTriggerElement(triggerEl);

    if (triggerEl && this.#tooltip) {
      this.#triggerAbort = new AbortController();
      applyElementProps(triggerEl, this.#tooltip.triggerProps, { signal: this.#triggerAbort.signal });

      if (isLabelTrigger(triggerEl)) {
        this.#syncContent(triggerEl);
        triggerEl.$state.subscribe(() => this.#syncContent(triggerEl), {
          signal: this.#triggerAbort.signal,
        });
      }
    }
  }

  #syncContent(triggerEl: TriggerElement): void {
    this.textContent = triggerEl.getLabel() ?? '';
  }

  #cleanupTrigger(): void {
    if (this.#currentTrigger) {
      this.#currentTrigger.style.removeProperty('anchor-name');
    }

    this.#triggerAbort?.abort();
    this.#triggerAbort = null;
    this.#currentTrigger = null;
  }
}
