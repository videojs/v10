import { applyStyles, getPositionedSide, rafThrottle, supportsAnchorPositioning } from '@videojs/utils/dom';
import { kebabCase } from '@videojs/utils/string';
import { PopoverCSSVars } from '../../../core/ui/popover/popover-css-vars';
import { isEventWithinElement } from '../../utils/event';
import { getPositioningBoundaryRect, type PositioningBoundary, resolvePositioningBoundary } from '../../utils/layout';
import {
  getAnchorPositionStyle,
  getPopupPositionRect,
  type PositioningCSSVars,
  type PositioningOptions,
  resolveOffsets,
} from './popover-positioning';

export interface PopupPositionerOptions {
  anchorName: string;
  position: PositioningOptions | null;
  trigger: HTMLElement | null;
  popup: HTMLElement | null;
  boundary?: PositioningBoundary;
  container?: Element | null;
  cssVars?: PositioningCSSVars;
  onSideChange?: (side: PositioningOptions['side']) => void;
}

interface InlineStyleValue {
  value: string;
  priority: string;
}

const POPUP_STYLE_PROPS = [
  'position',
  'inset',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'justify-self',
  'align-self',
  'margin-inline-start',
  'margin-block-start',
  'translate',
  'top',
  'right',
  'bottom',
  'left',
] as const;

/** Positions a popup and tracks layout changes while it is active. */
export class PopupPositioner {
  #options: PopupPositionerOptions | null = null;
  #boundaryElement: Element | null = null;
  #abort: AbortController | null = null;
  #observer: ResizeObserver | null = null;
  #triggerAnchorName: string | null = null;
  #triggerAnchorAdded = false;
  #popupAnchor: InlineStyleValue | null = null;
  #popupStyles = new Map<string, InlineStyleValue>();
  readonly #reposition = rafThrottle(() => this.#position());

  sync(options: PopupPositionerOptions): void {
    const { anchorName, position, trigger, popup, boundary, container, cssVars = PopoverCSSVars } = options;

    if (!position || !trigger || !popup) {
      this.cleanup();
      return;
    }

    const boundaryElement = resolvePositioningBoundary(boundary, {
      container: container ?? null,
      root: popup.getRootNode() as Document | ShadowRoot,
    });
    const previous = this.#options;
    const trackingChanged =
      !previous ||
      previous.anchorName !== anchorName ||
      previous.trigger !== trigger ||
      previous.popup !== popup ||
      (previous.cssVars ?? PopoverCSSVars) !== cssVars ||
      this.#boundaryElement !== boundaryElement;

    if (trackingChanged) {
      if (previous?.popup) this.#restorePopupStyles(previous.popup);
      this.#stopTracking();
      this.#options = { ...options, cssVars };
      this.#boundaryElement = boundaryElement;
      this.#startTracking();
    } else {
      this.#options = { ...options, cssVars };
    }

    this.#position();
  }

  cleanup(): void {
    if (!this.#options) return;
    if (this.#options.popup) this.#restorePopupStyles(this.#options.popup);
    this.#stopTracking();
    this.#options = null;
    this.#boundaryElement = null;
  }

  #startTracking(): void {
    const options = this.#options;
    if (!options?.trigger || !options.popup) return;

    this.#applyAnchorStyles(options.trigger, options.popup, options.anchorName);
    this.#abort = new AbortController();
    const { signal } = this.#abort;

    window.addEventListener('scroll', this.#schedule, { capture: true, passive: true, signal });
    window.addEventListener('resize', this.#schedule, { signal });

    if (typeof ResizeObserver === 'function') {
      this.#observer = new ResizeObserver(() => this.#schedule());
      this.#observer.observe(options.trigger);
      this.#observer.observe(options.popup);
      if (this.#boundaryElement) this.#observer.observe(this.#boundaryElement);
    }
  }

  #stopTracking(): void {
    this.#abort?.abort();
    this.#abort = null;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#reposition.cancel();
    this.#restoreAnchorStyles();
  }

  #schedule = (event?: Event): void => {
    const popup = this.#options?.popup;
    if (!popup || (event && isEventWithinElement(event, popup))) return;

    this.#reposition();
  };

  #position(): void {
    const options = this.#options;
    if (!options?.position || !options.trigger || !options.popup) return;

    const triggerRect = options.trigger.getBoundingClientRect();
    const boundaryRect = getPositioningBoundaryRect(this.#boundaryElement);
    const offsets = resolveOffsets(options.popup, options.cssVars);
    const popupRect = getPopupPositionRect(options.popup, options.position.side);
    const side = getPositionedSide(triggerRect, popupRect, boundaryRect, options.position, offsets);
    const { positionAnchor: _, ...style } = getAnchorPositionStyle(
      options.anchorName,
      { ...options.position, side },
      triggerRect,
      supportsAnchorPositioning() ? undefined : popupRect,
      boundaryRect,
      offsets,
      options.cssVars
    );

    this.#capturePopupStyles(options.popup, options.cssVars ?? PopoverCSSVars);
    applyStyles(options.popup, style);
    options.onSideChange?.(side);
  }

  #capturePopupStyles(popup: HTMLElement, cssVars: PositioningCSSVars): void {
    if (this.#popupStyles.size > 0) return;

    const props = [
      ...POPUP_STYLE_PROPS,
      cssVars.anchorWidth,
      cssVars.anchorHeight,
      cssVars.availableWidth,
      cssVars.availableHeight,
    ];

    for (const prop of props) {
      this.#popupStyles.set(prop, this.#readStyle(popup, prop));
    }
  }

  #restorePopupStyles(popup: HTMLElement): void {
    for (const [prop, style] of this.#popupStyles) {
      this.#writeStyle(popup, prop, style);
    }
    this.#popupStyles.clear();
  }

  #applyAnchorStyles(trigger: HTMLElement, popup: HTMLElement, anchorName: string): void {
    if (!supportsAnchorPositioning()) return;

    const generatedName = `--${anchorName}`;
    const triggerAnchor = this.#readStyle(trigger, 'anchor-name');
    this.#popupAnchor = this.#readStyle(popup, 'position-anchor');

    const authoredNames = triggerAnchor.value.trim();
    const names = authoredNames && authoredNames !== 'none' ? authoredNames.split(',').map((name) => name.trim()) : [];
    this.#triggerAnchorName = generatedName;
    this.#triggerAnchorAdded = !names.includes(generatedName);
    if (this.#triggerAnchorAdded) names.push(generatedName);

    trigger.style.setProperty('anchor-name', names.join(', '), triggerAnchor.priority);
    popup.style.setProperty('position-anchor', generatedName);
  }

  #restoreAnchorStyles(): void {
    const options = this.#options;
    if (!options?.trigger || !options.popup) return;

    if (this.#triggerAnchorName && this.#triggerAnchorAdded) {
      const current = this.#readStyle(options.trigger, 'anchor-name');
      const names = current.value
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name && name !== this.#triggerAnchorName);
      this.#writeStyle(options.trigger, 'anchor-name', { value: names.join(', '), priority: current.priority });
    }
    if (this.#popupAnchor) this.#writeStyle(options.popup, 'position-anchor', this.#popupAnchor);
    this.#triggerAnchorName = null;
    this.#triggerAnchorAdded = false;
    this.#popupAnchor = null;
  }

  #readStyle(element: HTMLElement, prop: string): InlineStyleValue {
    const name = prop.startsWith('--') ? prop : kebabCase(prop);
    return {
      value: element.style.getPropertyValue(name),
      priority: element.style.getPropertyPriority(name),
    };
  }

  #writeStyle(element: HTMLElement, prop: string, style: InlineStyleValue): void {
    const name = prop.startsWith('--') ? prop : kebabCase(prop);
    if (style.value) {
      element.style.setProperty(name, style.value, style.priority);
    } else {
      element.style.removeProperty(name);
    }
  }
}
