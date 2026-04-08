import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GestureCoordinator } from '../coordinator';

const TAP_THRESHOLD = 250;
const DOUBLETAP_WINDOW = 300;

describe('GestureCoordinator', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    // Give the container a width for region testing.
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

  describe('tap', () => {
    it('fires on quick pointer down + up', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: handler });

      pointerDown(container);
      vi.advanceTimersByTime(100);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not fire on long press', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: handler });

      pointerDown(container);
      vi.advanceTimersByTime(TAP_THRESHOLD + 50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire when disabled', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: handler, disabled: true });

      pointerDown(container);
      vi.advanceTimersByTime(100);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('fires immediately when no doubletap bindings exist', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: handler });

      pointerDown(container);
      vi.advanceTimersByTime(100);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      // Fires immediately — no delay.
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('doubletap', () => {
    it('fires on two quick taps', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'doubletap', onActivate: handler });

      // First tap
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      // Second tap within window
      vi.advanceTimersByTime(100);
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not fire on single tap', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'doubletap', onActivate: handler });

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      vi.advanceTimersByTime(DOUBLETAP_WINDOW + 50);

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire when taps are too far apart', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'doubletap', onActivate: handler });

      // First tap
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      // Second tap outside window
      vi.advanceTimersByTime(DOUBLETAP_WINDOW + 50);
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('tap/doubletap disambiguation', () => {
    it('delays tap when doubletap bindings exist', () => {
      const coordinator = new GestureCoordinator(container);
      const tapHandler = vi.fn();
      const doubletapHandler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: tapHandler });
      coordinator.add({ type: 'doubletap', onActivate: doubletapHandler });

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      // Tap should NOT fire immediately.
      expect(tapHandler).not.toHaveBeenCalled();

      // After doubletap window, tap fires.
      vi.advanceTimersByTime(DOUBLETAP_WINDOW);
      expect(tapHandler).toHaveBeenCalledOnce();
      expect(doubletapHandler).not.toHaveBeenCalled();
    });

    it('cancels pending tap on doubletap', () => {
      const coordinator = new GestureCoordinator(container);
      const tapHandler = vi.fn();
      const doubletapHandler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: tapHandler });
      coordinator.add({ type: 'doubletap', onActivate: doubletapHandler });

      // First tap
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      // Second tap (doubletap)
      vi.advanceTimersByTime(100);
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(doubletapHandler).toHaveBeenCalledOnce();
      expect(tapHandler).not.toHaveBeenCalled();

      // Even after timeout, tap should not fire.
      vi.advanceTimersByTime(DOUBLETAP_WINDOW);
      expect(tapHandler).not.toHaveBeenCalled();
    });
  });

  describe('pointer filtering', () => {
    it('only fires for matching pointer type', () => {
      const coordinator = new GestureCoordinator(container);
      const touchHandler = vi.fn();
      const mouseHandler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: touchHandler, pointer: 'touch' });
      coordinator.add({ type: 'tap', onActivate: mouseHandler, pointer: 'mouse' });

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'touch', clientX: 150 });

      expect(touchHandler).toHaveBeenCalledOnce();
      expect(mouseHandler).not.toHaveBeenCalled();
    });

    it('fires for all pointer types when no filter set', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: handler });

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'touch', clientX: 150 });

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('regions', () => {
    it('fires region binding in its zone', () => {
      const coordinator = new GestureCoordinator(container);
      const leftHandler = vi.fn();
      const rightHandler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: leftHandler, region: 'left' });
      coordinator.add({ type: 'tap', onActivate: rightHandler, region: 'right' });

      // Tap in left half
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 50 });

      expect(leftHandler).toHaveBeenCalledOnce();
      expect(rightHandler).not.toHaveBeenCalled();
    });

    it('region binding takes priority over full-surface', () => {
      const coordinator = new GestureCoordinator(container);
      const regionHandler = vi.fn();
      const fullHandler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: fullHandler });
      coordinator.add({ type: 'tap', onActivate: regionHandler, region: 'left' });

      // Tap in left region
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 50 });

      expect(regionHandler).toHaveBeenCalledOnce();
      expect(fullHandler).not.toHaveBeenCalled();
    });

    it('full-surface fires outside named regions', () => {
      const coordinator = new GestureCoordinator(container);
      const regionHandler = vi.fn();
      const fullHandler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: fullHandler });
      coordinator.add({ type: 'tap', onActivate: regionHandler, region: 'left' });

      // Tap in right half (no region binding there — only left exists,
      // so right side has no named region match → full-surface fires).
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 250 });

      expect(fullHandler).toHaveBeenCalledOnce();
      expect(regionHandler).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes binding on cleanup', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      const cleanup = coordinator.add({ type: 'tap', onActivate: handler });
      cleanup();

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('double cleanup is safe', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      const cleanup = coordinator.add({ type: 'tap', onActivate: handler });
      cleanup();
      cleanup(); // Should not throw.
    });

    it('destroy clears all bindings', () => {
      const coordinator = new GestureCoordinator(container);
      const handler = vi.fn();

      coordinator.add({ type: 'tap', onActivate: handler });
      coordinator.destroy();

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pointerDown(target: HTMLElement): void {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

function pointerUp(target: HTMLElement, init: { pointerType: string; clientX: number }): void {
  const event = new Event('pointerup', { bubbles: true }) as Event & {
    pointerType: string;
    clientX: number;
  };
  Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  Object.defineProperty(event, 'clientX', { value: init.clientX });
  target.dispatchEvent(event);
}
