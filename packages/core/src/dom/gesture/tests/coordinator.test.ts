import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getGestureCoordinator } from '../coordinator';
import { createDoubleTapGesture, createTapGesture } from '../create-tap-gesture';

function setup() {
  const container = document.createElement('div');
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: 300,
    width: 300,
    top: 0,
    bottom: 200,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  return container;
}

describe('GestureCoordinator.subscribe', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires subscriber on tap', () => {
    const container = setup();
    const subscriber = vi.fn();

    getGestureCoordinator(container).subscribe(subscriber);
    createTapGesture(container, vi.fn(), { action: 'togglePaused' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(subscriber).toHaveBeenCalledOnce();
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ type: 'tap', action: 'togglePaused' }));
  });

  it('fires subscriber on doubletap', () => {
    const container = setup();
    const subscriber = vi.fn();

    getGestureCoordinator(container).subscribe(subscriber);
    createDoubleTapGesture(container, vi.fn(), { action: 'seekStep', value: 10, region: 'right' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 250 });

    vi.advanceTimersByTime(100);
    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 250 });

    expect(subscriber).toHaveBeenCalledOnce();
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'doubletap', action: 'seekStep', value: 10, region: 'right' })
    );
  });

  it('includes pointer type in subscriber event', () => {
    const container = setup();
    const subscriber = vi.fn();

    getGestureCoordinator(container).subscribe(subscriber);
    createTapGesture(container, vi.fn(), { pointer: 'touch' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'touch', clientX: 150 });

    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ pointer: 'touch' }));
  });

  it('returns unsubscribe function that stops callbacks', () => {
    const container = setup();
    const subscriber = vi.fn();

    const unsubscribe = getGestureCoordinator(container).subscribe(subscriber);
    createTapGesture(container, vi.fn());

    unsubscribe();

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('does not fire subscriber when gesture binding does not match', () => {
    const container = setup();
    const subscriber = vi.fn();

    getGestureCoordinator(container).subscribe(subscriber);
    createTapGesture(container, vi.fn(), { pointer: 'touch' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    // Fire with mouse, but binding is touch-only.
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(subscriber).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pointerDown(target: HTMLElement, init: { button?: number } = {}): void {
  const event = new Event('pointerdown', { bubbles: true });
  Object.defineProperty(event, 'button', { value: init.button ?? 0 });
  target.dispatchEvent(event);
}

function pointerUp(target: HTMLElement, init: { pointerType: string; clientX: number; button?: number }): void {
  const event = new Event('pointerup', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  Object.defineProperty(event, 'clientX', { value: init.clientX });
  Object.defineProperty(event, 'button', { value: init.button ?? 0 });
  target.dispatchEvent(event);
}
