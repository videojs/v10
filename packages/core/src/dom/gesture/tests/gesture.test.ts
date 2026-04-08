import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDoubleTapGesture, createTapGesture, findGestureCoordinator } from '../gesture';

describe('createTapGesture', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers a tap gesture and returns cleanup', () => {
    const handler = vi.fn();
    const cleanup = createTapGesture(container, handler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).toHaveBeenCalledOnce();

    cleanup();

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).toHaveBeenCalledOnce(); // Still 1.
  });

  it('passes pointer and region options through', () => {
    const handler = vi.fn();
    createTapGesture(container, handler, { pointer: 'touch', region: 'left' });

    // Mouse tap should not fire.
    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 50 });
    expect(handler).not.toHaveBeenCalled();

    // Touch tap in left region should fire.
    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'touch', clientX: 50 });
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('createDoubleTapGesture', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers a doubletap gesture', () => {
    const handler = vi.fn();
    createDoubleTapGesture(container, handler);

    // First tap
    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    // Second tap
    vi.advanceTimersByTime(100);
    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('findGestureCoordinator', () => {
  it('returns undefined when no gestures registered', () => {
    const el = document.createElement('div');
    expect(findGestureCoordinator(el)).toBeUndefined();
  });

  it('returns coordinator after gesture registered', () => {
    const el = document.createElement('div');
    createTapGesture(el, () => {});
    expect(findGestureCoordinator(el)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pointerDown(target: HTMLElement): void {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

function pointerUp(target: HTMLElement, init: { pointerType: string; clientX: number }): void {
  const event = new Event('pointerup', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  Object.defineProperty(event, 'clientX', { value: init.clientX });
  target.dispatchEvent(event);
}
