import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TapRecognizer } from '../tap';

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

      recognizer.up(false, onTap, null);

      expect(onTap).toHaveBeenCalledOnce();
    });
  });

  describe('tap with doubletap', () => {
    it('defers tap when doubletap bindings exist', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();
      const onDoubleTap = vi.fn();

      recognizer.up(true, onTap, onDoubleTap);

      // Not fired yet — waiting for doubletap window.
      expect(onTap).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(onTap).toHaveBeenCalledOnce();
      expect(onDoubleTap).not.toHaveBeenCalled();
    });

    it('fires doubletap on two quick taps', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();
      const onDoubleTap = vi.fn();

      // First tap
      recognizer.up(true, onTap, onDoubleTap);

      // Second tap within window
      vi.advanceTimersByTime(100);
      recognizer.up(true, onTap, onDoubleTap);

      expect(onDoubleTap).toHaveBeenCalledOnce();
      expect(onTap).not.toHaveBeenCalled();

      // Deferred tap should not fire after doubletap.
      vi.advanceTimersByTime(300);
      expect(onTap).not.toHaveBeenCalled();
    });

    it('does not fire doubletap when taps are too far apart', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();
      const onDoubleTap = vi.fn();

      // First tap
      recognizer.up(true, onTap, onDoubleTap);

      // Wait for doubletap window to expire (tap fires).
      vi.advanceTimersByTime(300);
      expect(onTap).toHaveBeenCalledOnce();

      // Second tap outside window — new deferred tap, not doubletap.
      vi.advanceTimersByTime(100);
      recognizer.up(true, onTap, onDoubleTap);

      expect(onDoubleTap).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears pending tap timer', () => {
      const recognizer = new TapRecognizer();
      const onTap = vi.fn();

      recognizer.up(true, onTap, null);

      recognizer.reset();

      vi.advanceTimersByTime(300);
      expect(onTap).not.toHaveBeenCalled();
    });

    it('clears doubletap state', () => {
      const recognizer = new TapRecognizer();
      const onDoubleTap = vi.fn();

      // First tap
      recognizer.up(true, null, onDoubleTap);

      recognizer.reset();

      // Second tap after reset — should not count as doubletap.
      vi.advanceTimersByTime(50);
      recognizer.up(true, null, onDoubleTap);

      expect(onDoubleTap).not.toHaveBeenCalled();
    });
  });
});
