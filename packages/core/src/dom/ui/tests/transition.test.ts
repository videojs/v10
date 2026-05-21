import { describe, expect, it, vi } from 'vitest';
import { createTransition, waitForAnimations } from '../transition';

describe('createTransition', () => {
  it('starts with idle state', () => {
    const handler = createTransition();
    expect(handler.state.current).toEqual({ active: false, status: 'idle', transitioning: false });
  });

  describe('open', () => {
    it('patches open and starting status synchronously', () => {
      const handler = createTransition();

      handler.open();

      expect(handler.state.current).toEqual({ active: true, status: 'starting', transitioning: true });
    });

    it('transitions to idle after a double-RAF', async () => {
      const handler = createTransition();

      const promise = handler.open();
      expect(handler.state.current.status).toBe('starting');

      await vi.waitFor(() => {
        expect(handler.state.current.status).toBe('idle');
      });

      await promise;
      expect(handler.state.current).toEqual({ active: true, status: 'idle', transitioning: false });
    });

    it('keeps transitioning true until open animations settle', async () => {
      const handler = createTransition();
      const el = document.createElement('div');
      let resolveAnimation!: () => void;
      const animation = new Promise<void>((resolve) => {
        resolveAnimation = resolve;
      });

      el.getAnimations = vi.fn(() => [{ finished: animation } as unknown as Animation]);

      const promise = handler.open(el);

      await vi.waitFor(() => {
        expect(handler.state.current.status).toBe('idle');
      });

      expect(handler.state.current.transitioning).toBe(true);

      resolveAnimation();
      await promise;

      expect(handler.state.current.transitioning).toBe(false);
    });

    it('waits for animations on an element registered after open', async () => {
      const handler = createTransition();
      let resolveAnimation!: () => void;
      const animation = new Promise<void>((resolve) => {
        resolveAnimation = resolve;
      });

      const promise = handler.open();

      const el = document.createElement('div');
      el.getAnimations = vi.fn(() => [{ finished: animation } as unknown as Animation]);
      handler.setElement(el);

      await vi.waitFor(() => {
        expect(handler.state.current.status).toBe('idle');
      });

      expect(handler.state.current.transitioning).toBe(true);

      resolveAnimation();
      await promise;

      expect(handler.state.current.transitioning).toBe(false);
    });
  });

  describe('close', () => {
    it('patches ending status synchronously', () => {
      const handler = createTransition();
      const el = document.createElement('div');

      // Open first
      handler.open();

      handler.close(el);

      expect(handler.state.current).toEqual({ active: true, status: 'ending', transitioning: true });
    });

    it('keeps open true during close animation', () => {
      const handler = createTransition();
      const el = document.createElement('div');

      handler.open();
      handler.close(el);

      expect(handler.state.current.active).toBe(true);
      expect(handler.state.current.status).toBe('ending');
    });

    it('handles null element gracefully', async () => {
      const handler = createTransition();

      handler.open();
      const promise = handler.close(null);

      expect(handler.state.current.status).toBe('ending');

      await vi.waitFor(() => {
        expect(handler.state.current.active).toBe(false);
      });

      await promise;
      expect(handler.state.current).toEqual({ active: false, status: 'idle', transitioning: false });
    });

    it('waits for descendant animations via getAnimations({ subtree: true })', async () => {
      const handler = createTransition();
      const el = document.createElement('div');
      let resolveAnimation!: () => void;
      const animation = new Promise<void>((resolve) => {
        resolveAnimation = resolve;
      });
      const pending = { finished: animation } as unknown as Animation;

      el.getAnimations = vi.fn((options?: { subtree?: boolean }) =>
        options?.subtree ? [pending] : []
      ) as HTMLElement['getAnimations'];

      handler.open(el);
      await vi.waitFor(() => {
        expect(handler.state.current.status).toBe('idle');
      });

      const closePromise = handler.close(el);
      expect(handler.state.current.status).toBe('ending');
      expect(handler.state.current.transitioning).toBe(true);
      expect(el.getAnimations).toHaveBeenCalledWith({ subtree: true });

      resolveAnimation();
      await closePromise;

      expect(handler.state.current).toEqual({ active: false, status: 'idle', transitioning: false });
    });
  });

  describe('cancel', () => {
    it('resets status to idle', () => {
      const handler = createTransition();

      handler.open();
      expect(handler.state.current.status).toBe('starting');

      handler.cancel();
      expect(handler.state.current.status).toBe('idle');
      expect(handler.state.current.transitioning).toBe(false);
    });

    it('preserves open state', () => {
      const handler = createTransition();

      handler.open();
      handler.cancel();

      expect(handler.state.current.active).toBe(true);
      expect(handler.state.current.status).toBe('idle');
    });

    it('is a no-op when already idle', () => {
      const handler = createTransition();
      const callback = vi.fn();

      handler.state.subscribe(callback);
      handler.cancel();

      // No state change, so no notification
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('prevents further open calls from updating state', () => {
      const handler = createTransition();

      handler.destroy();
      handler.open();

      // open() still patches synchronously (state.patch runs before the RAF guard),
      // but the RAF callback won't fire the idle transition.
      expect(handler.state.current.active).toBe(true);
    });

    it('is idempotent', () => {
      const handler = createTransition();

      handler.destroy();
      handler.destroy(); // should not throw
    });
  });
});

describe('waitForAnimations', () => {
  it('waits for the CSS transition fallback when a Web Animation is canceled', async () => {
    vi.useFakeTimers();

    try {
      const el = document.createElement('div');
      const canceledAnimation = Promise.reject(new Error('canceled'));
      let settled = false;

      el.style.transitionDuration = '100ms';
      el.getAnimations = vi.fn(() => [{ finished: canceledAnimation } as unknown as Animation]);

      const promise = waitForAnimations(el, { includeCSSTransitions: true }).then(() => {
        settled = true;
      });

      await Promise.resolve();
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(99);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await promise;

      expect(settled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
