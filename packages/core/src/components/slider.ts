import { shallowEqual } from '@videojs/utils';

import { map } from 'nanostores';

export interface SliderState {
  _setRootElement: (element: HTMLElement | null) => void;
  _rootElement: HTMLElement | null;
  _setTrackElement: (element: HTMLElement | null) => void;
  _trackElement: HTMLElement | null;
  _pointerRatio: number;
  _hovering: boolean;
  _dragging: boolean;
  _keying: boolean;
  _fillWidth: number;
  _pointerWidth: number;
  _stepSize: number;
}

export class Slider {
  #abortController: AbortController | null = null;
  #state = map<SliderState>({
    _setRootElement: this._setRootElement.bind(this),
    _rootElement: null,
    _setTrackElement: (element: HTMLElement | null) => this.setState({ _trackElement: element }),
    _trackElement: null,
    _pointerRatio: 0,
    _hovering: false,
    _dragging: false,
    _keying: false,
    _fillWidth: 0,
    _pointerWidth: 0,
    _stepSize: 0.01,
  });

  _setRootElement(element: HTMLElement | null): void {
    this.setState({ _rootElement: element });

    if (!element) {
      this.#abortController?.abort();
      this.#abortController = null;
      return;
    }

    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    element.addEventListener('pointerdown', this, { signal });
    element.addEventListener('pointermove', this, { signal });
    element.addEventListener('pointerup', this, { signal });
    element.addEventListener('pointerenter', this, { signal });
    element.addEventListener('pointerleave', this, { signal });
    element.addEventListener('keydown', this, { signal });
    element.addEventListener('keyup', this, { signal });
  }

  subscribe(callback: (state: SliderState) => void): () => void {
    return this.#state.subscribe(callback);
  }

  setState(state: Partial<SliderState>): void {
    if (shallowEqual(state, this.#state.get())) return;
    this.#state.set({ ...this.#state.get(), ...state });
  }

  getState(): SliderState {
    const state = this.#state.get();

    let _pointerWidth = 0;
    if (state._hovering) {
      _pointerWidth = state._pointerRatio;
    }

    return { ...state, _pointerWidth };
  }

  handleEvent(event: Event): void {
    const { type } = event;
    switch (type) {
      case 'pointerdown':
        this.#handlePointerDown(event as PointerEvent);
        break;
      case 'pointermove':
        this.#handlePointerMove(event as PointerEvent);
        break;
      case 'pointerup':
        this.#handlePointerUp(event as PointerEvent);
        break;
      case 'pointerenter':
        this.#handlePointerEnter(event as PointerEvent);
        break;
      case 'pointerleave':
        this.#handlePointerLeave(event as PointerEvent);
        break;
      case 'keydown':
        this.#handleKeyDown(event as KeyboardEvent);
        break;
      case 'keyup':
        this.#handleKeyUp(event as KeyboardEvent);
        break;
    }
  }

  getPointerRatio(evt: PointerEvent): number {
    const { _trackElement } = this.#state.get();
    if (!_trackElement) return 0;

    const rect = _trackElement.getBoundingClientRect();
    return getPointProgressOnLine(
      evt.clientX,
      evt.clientY,
      { x: rect.left, y: rect.bottom },
      { x: rect.right, y: rect.top },
    );
  }

  #handlePointerDown(event: PointerEvent) {
    this.#state.get()._rootElement?.setPointerCapture(event.pointerId);
    this.setState({ _pointerRatio: this.getPointerRatio(event), _dragging: true });
  }

  #handlePointerMove(event: PointerEvent) {
    this.setState({ _pointerRatio: this.getPointerRatio(event) });
  }

  #handlePointerUp(event: PointerEvent) {
    this.setState({ _pointerRatio: this.getPointerRatio(event), _dragging: false });
    this.#state.get()._rootElement?.releasePointerCapture(event.pointerId);
  }

  #handlePointerEnter(_event: PointerEvent) {
    this.setState({ _hovering: true });
  }

  #handlePointerLeave(_event: PointerEvent) {
    this.setState({ _hovering: false });
  }

  #handleKeyDown(event: KeyboardEvent) {
    const { key } = event;
    const { _pointerRatio, _stepSize } = this.#state.get();

    let newRatio = _pointerRatio;

    switch (key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        newRatio = Math.max(0, _pointerRatio - _stepSize);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        newRatio = Math.min(1, _pointerRatio + _stepSize);
        break;
      case 'Home':
        event.preventDefault();
        newRatio = 0;
        break;
      case 'End':
        event.preventDefault();
        newRatio = 1;
        break;
      default:
        return; // Don't update state for other keys
    }

    this.setState({ _pointerRatio: newRatio, _keying: true });
  }

  #handleKeyUp(_event: KeyboardEvent) {
    this.setState({ _keying: false });
  }

  setStepSize(stepSize: number): void {
    this.setState({ _stepSize: Math.max(0.001, Math.min(1, stepSize)) });
  }
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Get progress ratio of a point on a line segment.
 * @param x - The x coordinate of the point.
 * @param y - The y coordinate of the point.
 * @param p1 - The first point of the line segment.
 * @param p2 - The second point of the line segment.
 */
export function getPointProgressOnLine(x: number, y: number, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return 0; // Avoid division by zero if p1 === p2

  const projection = ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSquared;

  return Math.max(0, Math.min(1, projection)); // Clamp between 0 and 1
}

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}
