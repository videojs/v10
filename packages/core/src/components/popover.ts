import { shallowEqual } from '@videojs/utils';
import { contains, getDocument, safePolygon } from '@videojs/utils/dom';
import { map } from 'nanostores';

type Placement = 'top' | 'top-start' | 'top-end';

export interface PopoverState {
  openOnHover: boolean;
  delay: number;
  closeDelay: number;
  placement: Placement;
  sideOffset: number;
  trackCursorAxis: 'x' | undefined;
  collisionPadding: number;
  disableHoverablePopover: boolean;
  _open: boolean;
  _setTriggerElement: (element: HTMLElement | null) => void;
  _triggerElement: HTMLElement | null;
  _setPopoverElement: (element: HTMLElement | null) => void;
  _popoverElement: HTMLElement | null;
  _transitionStatus: 'initial' | 'open' | 'close' | 'unmounted';
  _pointerPosition: { x: number };
  _popoverStyle?: Partial<CSSStyleDeclaration>;
}

export class Popover {
  #hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  #state = map<PopoverState>({
    openOnHover: false,
    delay: 0,
    closeDelay: 0,
    placement: 'top',
    sideOffset: 5,
    trackCursorAxis: undefined,
    collisionPadding: 0,
    disableHoverablePopover: false,
    _open: false,
    _setTriggerElement: this._setTriggerElement.bind(this),
    _triggerElement: null,
    _setPopoverElement: this._setPopoverElement.bind(this),
    _popoverElement: null,
    _transitionStatus: 'initial',
    _pointerPosition: { x: 0 },
  });

  _setPopoverElement(element: HTMLElement | null): void {
    if (!element) {
      this.#clearHoverTimeout();
      this.#popoverElement?.removeEventListener('pointerenter', this);
      this.#popoverElement?.removeEventListener('focusout', this);
      getDocument(this.#popoverElement).documentElement.removeEventListener('pointermove', this);
      return;
    }

    this.setState({ _popoverElement: element });

    element.addEventListener('pointerenter', this);
    element.addEventListener('focusout', this);
  }

  _setTriggerElement(element: HTMLElement | null): void {
    if (!element) {
      this.#triggerElement?.removeEventListener('pointerenter', this);
      this.#triggerElement?.removeEventListener('pointerleave', this);
      this.#triggerElement?.removeEventListener('focusin', this);
      this.#triggerElement?.removeEventListener('focusout', this);
      return;
    }

    this.setState({ _triggerElement: element });

    if (globalThis.matchMedia?.('(hover: hover)')?.matches) {
      element.addEventListener('pointerenter', this);
      element.addEventListener('pointerleave', this);
    }

    element.addEventListener('focusin', this);
    element.addEventListener('focusout', this);
  }

  subscribe(callback: (state: PopoverState) => void): () => void {
    return this.#state.subscribe(callback);
  }

  setState(state: Partial<PopoverState>): void {
    if (shallowEqual(state, this.#state.get())) return;
    this.#state.set({ ...this.#state.get(), ...state });
  }

  getState(): PopoverState {
    const baseState = this.#state.get();
    const { placement, sideOffset, trackCursorAxis, _popoverElement, _pointerPosition } = baseState;
    const [side, alignment] = placement.split('-');

    const _popoverStyle: Partial<CSSStyleDeclaration> = {
      ...(_popoverElement ? { positionAnchor: `--${_popoverElement.id}` } : {}),
      top: `calc(anchor(${side}) - ${sideOffset}px)`,
      translate: trackCursorAxis === 'x' ? '-50% -100%' : '0 -100%',
    };

    if (trackCursorAxis === 'x') {
      _popoverStyle.left = `${_pointerPosition.x}px`;
    } else {
      _popoverStyle.justifySelf = alignment === 'start'
        ? 'anchor-start'
        : alignment === 'end'
          ? 'anchor-end'
          : 'anchor-center';
    }

    return {
      ...baseState,
      _popoverStyle,
    };
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'pointerenter':
        this.#handlePointerEnter(event as PointerEvent);
        break;
      case 'pointerleave':
        this.#handlePointerLeave(event as PointerEvent);
        break;
      case 'pointermove':
        this.#handlePointerMove(event as PointerEvent);
        break;
      case 'focusin':
        this.#handleFocusIn(event as FocusEvent);
        break;
      case 'focusout':
        this.#handleFocusOut(event as FocusEvent);
        break;
      default:
        break;
    }
  }

  get #popoverElement(): HTMLElement | null {
    return this.getState()._popoverElement;
  }

  get #triggerElement(): HTMLElement | null {
    return this.getState()._triggerElement;
  }

  get #open(): boolean {
    return this.getState()._open;
  }

  #setOpen(open: boolean): void {
    if (this.#open === open) return;

    this.setState({ _open: open });

    if (open) {
      this.setState({ _transitionStatus: 'initial' });

      this.#popoverElement?.showPopover();

      requestAnimationFrame(() => {
        this.setState({ _transitionStatus: 'open' });
      });
    } else {
      this.setState({ _transitionStatus: 'close' });

      // This requestAnimationFrame is required for React because the data- attributes are not updated immediately.
      requestAnimationFrame(() => {
        const transitions = this.#popoverElement?.getAnimations().filter(anim => anim instanceof CSSTransition);
        if (transitions && transitions.length > 0) {
          Promise.all(transitions.map(t => t.finished))
            .then(() => this.#popoverElement?.hidePopover())
            .catch(() => this.#popoverElement?.hidePopover());
        } else {
          this.#popoverElement?.hidePopover();
        }
      });
    }
  }

  #clearHoverTimeout(): void {
    if (this.#hoverTimeout) {
      globalThis.clearTimeout(this.#hoverTimeout);
      this.#hoverTimeout = null;
    }
  }

  #handlePointerEnter(event: PointerEvent): void {
    const { openOnHover, trackCursorAxis } = this.getState();
    if (!openOnHover) return;

    this.#clearHoverTimeout();

    if (event.currentTarget === this.#popoverElement || trackCursorAxis === 'x') {
      this.#addPointerMoveListener();
    }

    if (this.getState()._open) {
      return;
    }

    this.#hoverTimeout = globalThis.setTimeout(() => {
      this.#setOpen(true);
    }, this.getState().delay);
  }

  #handlePointerLeave(_event: PointerEvent): void {
    const { disableHoverablePopover, closeDelay } = this.getState();

    if (!disableHoverablePopover) {
      this.#addPointerMoveListener();
    }

    if (disableHoverablePopover) {
      this.#clearHoverTimeout();
      this.#hoverTimeout = globalThis.setTimeout(() => {
        this.#setOpen(false);
      }, closeDelay);
    }
  }

  #addPointerMoveListener(): void {
    if (!globalThis.matchMedia?.('(hover: hover)')?.matches || !this.#popoverElement) return;

    getDocument(this.#popoverElement).documentElement.addEventListener('pointermove', this);
  }

  #handlePointerMove(event: PointerEvent): void {
    const { disableHoverablePopover, openOnHover, trackCursorAxis } = this.getState();
    if (!openOnHover || !this.#triggerElement || !this.#popoverElement) return;

    if (trackCursorAxis === 'x') {
      this.setState({ _pointerPosition: { x: event.clientX } });
    }

    if (disableHoverablePopover) {
      return;
    }

    const close = safePolygon({ blockPointerEvents: true })({
      placement: this.getState().placement,
      elements: {
        domReference: this.#triggerElement,
        floating: this.#popoverElement,
      },
      x: event.clientX,
      y: event.clientY,
      onClose: () => {
        getDocument(this.#popoverElement).documentElement.removeEventListener('pointermove', this);

        this.#clearHoverTimeout();
        this.#hoverTimeout = globalThis.setTimeout(() => {
          this.#setOpen(false);
        }, this.getState().closeDelay);
      },
    });
    close(event);
  }

  #handleFocusIn(_event: FocusEvent): void {
    this.#setOpen(true);
  }

  #handleFocusOut(event: FocusEvent): void {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && contains(this.#popoverElement, relatedTarget)) return;

    this.#setOpen(false);
  };
}
