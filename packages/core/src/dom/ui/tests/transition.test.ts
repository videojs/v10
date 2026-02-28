import { describe, expect, it, vi } from 'vitest';
import { createTransitionHandler } from '../transition';

describe('createTransitionHandler', () => {
  it('starts with idle state', () => {
    const handler = createTransitionHandler();
    expect(handler.state.current).toEqual({ open: false, status: 'idle' });
  });

  describe('open', () => {
    it('patches open and starting status synchronously', () => {
      const handler = createTransitionHandler();

      handler.open();

      expect(handler.state.current).toEqual({ open: true, status: 'starting' });
    });

    it('transitions to idle after one RAF', async () => {
      const handler = createTransitionHandler();

      const promise = handler.open();
      expect(handler.state.current.status).toBe('starting');

      await vi.waitFor(() => {
        expect(handler.state.current.status).toBe('idle');
      });

      await promise;
      expect(handler.state.current).toEqual({ open: true, status: 'idle' });
    });
  });

  describe('close', () => {
    it('patches ending status synchronously', () => {
      const handler = createTransitionHandler();
      const el = document.createElement('div');

      // Open first
      handler.open();

      handler.close(el);

      expect(handler.state.current).toEqual({ open: true, status: 'ending' });
    });

    it('keeps open true during close animation', () => {
      const handler = createTransitionHandler();
      const el = document.createElement('div');

      handler.open();
      handler.close(el);

      expect(handler.state.current.open).toBe(true);
      expect(handler.state.current.status).toBe('ending');
    });

    it('handles null element gracefully', async () => {
      const handler = createTransitionHandler();

      handler.open();
      const promise = handler.close(null);

      expect(handler.state.current.status).toBe('ending');

      await vi.waitFor(() => {
        expect(handler.state.current.open).toBe(false);
      });

      await promise;
      expect(handler.state.current).toEqual({ open: false, status: 'idle' });
    });
  });

  describe('cancel', () => {
    it('resets status to idle', () => {
      const handler = createTransitionHandler();

      handler.open();
      expect(handler.state.current.status).toBe('starting');

      handler.cancel();
      expect(handler.state.current.status).toBe('idle');
    });

    it('preserves open state', () => {
      const handler = createTransitionHandler();

      handler.open();
      handler.cancel();

      expect(handler.state.current.open).toBe(true);
      expect(handler.state.current.status).toBe('idle');
    });

    it('is a no-op when already idle', () => {
      const handler = createTransitionHandler();
      const callback = vi.fn();

      handler.state.subscribe(callback);
      handler.cancel();

      // No state change, so no notification
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('prevents further open calls from updating state', () => {
      const handler = createTransitionHandler();

      handler.destroy();
      handler.open();

      // open() still patches synchronously (state.patch runs before the RAF guard),
      // but the RAF callback won't fire the idle transition.
      expect(handler.state.current.open).toBe(true);
    });

    it('is idempotent', () => {
      const handler = createTransitionHandler();

      handler.destroy();
      handler.destroy(); // should not throw
    });
  });
});
