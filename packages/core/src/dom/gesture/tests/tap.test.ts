import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GestureMatchResult, GestureType } from '../gesture';
import { TapRecognizer } from '../tap';

const DOUBLETAP_WINDOW = 300;

const NOOP_RECOGNIZER = { handleUp: () => {}, reset: () => {} };

function createMatches(handlers: Partial<Record<GestureType, (() => void) | null>>): GestureMatchResult {
  return {
    resolve(type) {
      const handler = handlers[type];
      if (!handler) return [];
      return [{ type, recognizer: NOOP_RECOGNIZER, onActivate: handler }];
    },
  };
}

function fakeEvent(): PointerEvent {
  return new Event('pointerup') as PointerEvent;
}

describe('TapRecognizer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('tap without doubletap', () => {
    it('fires tap immediately when no doubletap bindings', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();

      recognizer.handleUp(createMatches({ tap: onTap }), fakeEvent());

      expect(onTap).toHaveBeenCalledOnce();
    });
  });

  describe('tap with doubletap', () => {
    it('defers tap when doubletap bindings exist', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();
      const onDoubleTap = vi.fn();

      recognizer.handleUp(createMatches({ tap: onTap, doubletap: onDoubleTap }), fakeEvent());

      // Not fired yet — waiting for doubletap window.
      expect(onTap).not.toHaveBeenCalled();

      vi.advanceTimersByTime(DOUBLETAP_WINDOW);
      expect(onTap).toHaveBeenCalledOnce();
      expect(onDoubleTap).not.toHaveBeenCalled();
    });

    it('fires doubletap on two quick taps', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();
      const onDoubleTap = vi.fn();

      const matches = createMatches({ tap: onTap, doubletap: onDoubleTap });

      // First tap
      recognizer.handleUp(matches, fakeEvent());

      // Second tap within window
      vi.advanceTimersByTime(100);
      recognizer.handleUp(matches, fakeEvent());

      expect(onDoubleTap).toHaveBeenCalledOnce();
      expect(onTap).not.toHaveBeenCalled();

      // Deferred tap should not fire after doubletap.
      vi.advanceTimersByTime(DOUBLETAP_WINDOW);
      expect(onTap).not.toHaveBeenCalled();
    });

    it('does not fire doubletap when taps are too far apart', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();
      const onDoubleTap = vi.fn();

      const matches = createMatches({ tap: onTap, doubletap: onDoubleTap });

      // First tap
      recognizer.handleUp(matches, fakeEvent());

      // Wait for doubletap window to expire (tap fires).
      vi.advanceTimersByTime(DOUBLETAP_WINDOW);
      expect(onTap).toHaveBeenCalledOnce();

      // Second tap outside window — new deferred tap, not doubletap.
      vi.advanceTimersByTime(100);
      recognizer.handleUp(matches, fakeEvent());

      expect(onDoubleTap).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears pending tap timer', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();

      recognizer.handleUp(createMatches({ tap: onTap, doubletap: vi.fn() }), fakeEvent());

      recognizer.reset();

      vi.advanceTimersByTime(DOUBLETAP_WINDOW);
      expect(onTap).not.toHaveBeenCalled();
    });

    it('clears doubletap state', () => {
      const recognizer = new TapRecognizer();
      const onDoubleTap = vi.fn();

      // First tap
      recognizer.handleUp(createMatches({ doubletap: onDoubleTap }), fakeEvent());

      recognizer.reset();

      // Second tap after reset — should not count as doubletap.
      vi.advanceTimersByTime(50);
      recognizer.handleUp(createMatches({ doubletap: onDoubleTap }), fakeEvent());

      expect(onDoubleTap).not.toHaveBeenCalled();
    });
  });
});
