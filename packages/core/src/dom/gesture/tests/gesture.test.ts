import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDoubleTapGesture, createTapGesture } from '../gesture';

const DOUBLETAP_WINDOW = 300;

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

describe('createTapGesture', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires on quick pointer down + up', () => {
    const container = setup();
    const handler = vi.fn();
    createTapGesture(container, handler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not fire on long press', () => {
    const container = setup();
    const handler = vi.fn();
    createTapGesture(container, handler);

    pointerDown(container);
    vi.advanceTimersByTime(300);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire when disabled', () => {
    const container = setup();
    const handler = vi.fn();
    createTapGesture(container, handler, { disabled: true });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('fires immediately when no doubletap bindings exist', () => {
    const container = setup();
    const handler = vi.fn();
    createTapGesture(container, handler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('cleanup removes binding', () => {
    const container = setup();
    const handler = vi.fn();
    const cleanup = createTapGesture(container, handler);

    cleanup();

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('double cleanup is safe', () => {
    const container = setup();
    const cleanup = createTapGesture(container, vi.fn());
    cleanup();
    cleanup();
  });
});

describe('createDoubleTapGesture', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires on two quick taps', () => {
    const container = setup();
    const handler = vi.fn();
    createDoubleTapGesture(container, handler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    vi.advanceTimersByTime(100);
    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not fire on single tap', () => {
    const container = setup();
    const handler = vi.fn();
    createDoubleTapGesture(container, handler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    vi.advanceTimersByTime(DOUBLETAP_WINDOW + 50);

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire when taps are too far apart', () => {
    const container = setup();
    const handler = vi.fn();
    createDoubleTapGesture(container, handler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    vi.advanceTimersByTime(DOUBLETAP_WINDOW + 50);
    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('tap/doubletap disambiguation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('delays tap when doubletap bindings exist', () => {
    const container = setup();
    const tapHandler = vi.fn();
    const doubletapHandler = vi.fn();

    createTapGesture(container, tapHandler);
    createDoubleTapGesture(container, doubletapHandler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(tapHandler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DOUBLETAP_WINDOW);
    expect(tapHandler).toHaveBeenCalledOnce();
    expect(doubletapHandler).not.toHaveBeenCalled();
  });

  it('cancels pending tap on doubletap', () => {
    const container = setup();
    const tapHandler = vi.fn();
    const doubletapHandler = vi.fn();

    createTapGesture(container, tapHandler);
    createDoubleTapGesture(container, doubletapHandler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    vi.advanceTimersByTime(100);
    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    expect(doubletapHandler).toHaveBeenCalledOnce();
    expect(tapHandler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DOUBLETAP_WINDOW);
    expect(tapHandler).not.toHaveBeenCalled();
  });

  it('deferred tap does not fire after binding cleanup', () => {
    const container = setup();
    const tapHandler = vi.fn();
    const doubletapHandler = vi.fn();

    const tapCleanup = createTapGesture(container, tapHandler);
    createDoubleTapGesture(container, doubletapHandler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    tapCleanup();

    vi.advanceTimersByTime(DOUBLETAP_WINDOW);
    expect(tapHandler).not.toHaveBeenCalled();
  });
});

describe('pointer filtering', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only fires for matching pointer type', () => {
    const container = setup();
    const touchHandler = vi.fn();
    const mouseHandler = vi.fn();

    createTapGesture(container, touchHandler, { pointer: 'touch' });
    createTapGesture(container, mouseHandler, { pointer: 'mouse' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'touch', clientX: 150 });

    expect(touchHandler).toHaveBeenCalledOnce();
    expect(mouseHandler).not.toHaveBeenCalled();
  });

  it('fires for all pointer types when no filter set', () => {
    const container = setup();
    const handler = vi.fn();
    createTapGesture(container, handler);

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'touch', clientX: 150 });

    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('regions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires region binding in its zone', () => {
    const container = setup();
    const leftHandler = vi.fn();
    const rightHandler = vi.fn();

    createTapGesture(container, leftHandler, { region: 'left' });
    createTapGesture(container, rightHandler, { region: 'right' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 50 });

    expect(leftHandler).toHaveBeenCalledOnce();
    expect(rightHandler).not.toHaveBeenCalled();
  });

  it('region binding takes priority over full-surface', () => {
    const container = setup();
    const regionHandler = vi.fn();
    const fullHandler = vi.fn();

    createTapGesture(container, fullHandler);
    createTapGesture(container, regionHandler, { region: 'left' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 50 });

    expect(regionHandler).toHaveBeenCalledOnce();
    expect(fullHandler).not.toHaveBeenCalled();
  });

  it('full-surface fires outside named regions', () => {
    const container = setup();
    const regionHandler = vi.fn();
    const fullHandler = vi.fn();

    createTapGesture(container, fullHandler);
    createTapGesture(container, regionHandler, { region: 'left' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 250 });

    expect(fullHandler).toHaveBeenCalledOnce();
    expect(regionHandler).not.toHaveBeenCalled();
  });

  it('full-surface tap fires alongside doubletap regions', () => {
    const container = setup();
    const tapHandler = vi.fn();
    const doubletapLeft = vi.fn();
    const doubletapRight = vi.fn();

    createTapGesture(container, tapHandler);
    createDoubleTapGesture(container, doubletapLeft, { region: 'left' });
    createDoubleTapGesture(container, doubletapRight, { region: 'right' });

    pointerDown(container);
    vi.advanceTimersByTime(50);
    pointerUp(container, { pointerType: 'mouse', clientX: 150 });

    vi.advanceTimersByTime(DOUBLETAP_WINDOW);
    expect(tapHandler).toHaveBeenCalledOnce();
    expect(doubletapLeft).not.toHaveBeenCalled();
    expect(doubletapRight).not.toHaveBeenCalled();
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
