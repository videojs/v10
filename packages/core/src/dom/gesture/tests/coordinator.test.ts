import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GestureHandler, GestureOptions } from '../coordinator';
import { GestureCoordinator } from '../coordinator';

const TAP_THRESHOLD = 250;

describe('GestureCoordinator', () => {
  let container: HTMLElement;
  let handler: ReturnType<typeof vi.fn<GestureHandler>>;

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
    handler = vi.fn<GestureHandler>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('tap threshold', () => {
    it('calls handler on quick pointer down + up', () => {
      const coordinator = new GestureCoordinator(container, handler);
      coordinator.add({ type: 'tap', onActivate: vi.fn() });

      pointerDown(container);
      vi.advanceTimersByTime(100);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not call handler on long press', () => {
      const coordinator = new GestureCoordinator(container, handler);
      coordinator.add({ type: 'tap', onActivate: vi.fn() });

      pointerDown(container);
      vi.advanceTimersByTime(TAP_THRESHOLD + 50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not call handler when disabled', () => {
      const coordinator = new GestureCoordinator(container, handler);
      coordinator.add({ type: 'tap', onActivate: vi.fn(), disabled: true });

      pointerDown(container);
      vi.advanceTimersByTime(100);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('pointer filtering', () => {
    it('only matches bindings for the event pointer type', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const touchBinding: GestureOptions = { type: 'tap', onActivate: vi.fn(), pointer: 'touch' };
      const mouseBinding: GestureOptions = { type: 'tap', onActivate: vi.fn(), pointer: 'mouse' };

      coordinator.add(touchBinding);
      coordinator.add(mouseBinding);

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'touch', clientX: 150 });

      expect(handler).toHaveBeenCalledOnce();
      const [, tapMatches] = handler.mock.calls[0]!;
      expect(tapMatches).toHaveLength(1);
      expect(tapMatches[0]).toBe(touchBinding);
    });

    it('matches all pointer types when no filter set', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const binding: GestureOptions = { type: 'tap', onActivate: vi.fn() };

      coordinator.add(binding);

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'pen', clientX: 150 });

      expect(handler).toHaveBeenCalledOnce();
      const [, tapMatches] = handler.mock.calls[0]!;
      expect(tapMatches).toContain(binding);
    });
  });

  describe('regions', () => {
    it('matches region binding in its zone', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const leftBinding: GestureOptions = { type: 'tap', onActivate: vi.fn(), region: 'left' };
      const rightBinding: GestureOptions = { type: 'tap', onActivate: vi.fn(), region: 'right' };

      coordinator.add(leftBinding);
      coordinator.add(rightBinding);

      // Tap in left half
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 50 });

      expect(handler).toHaveBeenCalledOnce();
      const [, tapMatches] = handler.mock.calls[0]!;
      expect(tapMatches).toEqual([leftBinding]);
    });

    it('region takes priority over full-surface', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const fullBinding: GestureOptions = { type: 'tap', onActivate: vi.fn() };
      const regionBinding: GestureOptions = { type: 'tap', onActivate: vi.fn(), region: 'left' };

      coordinator.add(fullBinding);
      coordinator.add(regionBinding);

      // Tap in left region
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 50 });

      const [, tapMatches] = handler.mock.calls[0]!;
      expect(tapMatches).toEqual([regionBinding]);
    });

    it('full-surface matches outside named regions', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const fullBinding: GestureOptions = { type: 'tap', onActivate: vi.fn() };
      const regionBinding: GestureOptions = { type: 'tap', onActivate: vi.fn(), region: 'left' };

      coordinator.add(fullBinding);
      coordinator.add(regionBinding);

      // Tap in right half — no region binding there.
      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 250 });

      const [, tapMatches] = handler.mock.calls[0]!;
      expect(tapMatches).toEqual([fullBinding]);
    });

    it('doubletap regions do not suppress full-surface taps', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const tapBinding: GestureOptions = { type: 'tap', onActivate: vi.fn() };
      const dtLeftBinding: GestureOptions = { type: 'doubletap', onActivate: vi.fn(), region: 'left' };
      const dtRightBinding: GestureOptions = { type: 'doubletap', onActivate: vi.fn(), region: 'right' };

      coordinator.add(tapBinding);
      coordinator.add(dtLeftBinding);
      coordinator.add(dtRightBinding);

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      const [, tapMatches] = handler.mock.calls[0]!;
      expect(tapMatches).toContain(tapBinding);
    });
  });

  describe('matchBindings', () => {
    it('re-matches current bindings', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const binding: GestureOptions = { type: 'tap', onActivate: vi.fn() };

      coordinator.add(binding);

      const matches = coordinator.matchBindings('tap', 'mouse', 150);
      expect(matches).toEqual([binding]);
    });

    it('excludes removed bindings', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const binding: GestureOptions = { type: 'tap', onActivate: vi.fn() };

      const cleanup = coordinator.add(binding);
      cleanup();

      const matches = coordinator.matchBindings('tap', 'mouse', 150);
      expect(matches).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('removes binding on cleanup', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const cleanup = coordinator.add({ type: 'tap', onActivate: vi.fn() });
      cleanup();

      pointerDown(container);
      vi.advanceTimersByTime(50);
      pointerUp(container, { pointerType: 'mouse', clientX: 150 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('double cleanup is safe', () => {
      const coordinator = new GestureCoordinator(container, handler);
      const cleanup = coordinator.add({ type: 'tap', onActivate: vi.fn() });
      cleanup();
      cleanup(); // Should not throw.
    });

    it('destroy clears all bindings', () => {
      const coordinator = new GestureCoordinator(container, handler);
      coordinator.add({ type: 'tap', onActivate: vi.fn() });
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
  const event = new Event('pointerup', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  Object.defineProperty(event, 'clientX', { value: init.clientX });
  target.dispatchEvent(event);
}
