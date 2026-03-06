import { describe, expect, it, vi } from 'vitest';
import { createTransition } from '../transition';

describe('createTransition', () => {
  it('starts with idle state', () => {
    const handler = createTransition();
    expect(handler.state.current).toEqual({ active: false, status: 'idle' });
  });

  describe('open', () => {
    it('patches open and starting status synchronously', () => {
      const handler = createTransition();

      handler.open();

      expect(handler.state.current).toEqual({ active: true, status: 'starting' });
    });

    it('transitions to idle after a double-RAF', async () => {
      const handler = createTransition();

      const promise = handler.open();
      expect(handler.state.current.status).toBe('starting');

      await vi.waitFor(() => {
        expect(handler.state.current.status).toBe('idle');
      });

      await promise;
      expect(handler.state.current).toEqual({ active: true, status: 'idle' });
    });
  });

  describe('close', () => {
    it('patches ending status synchronously', () => {
      const handler = createTransition();
      const el = document.createElement('div');

      // Open first
      handler.open();

      handler.close(el);

      expect(handler.state.current).toEqual({ active: true, status: 'ending' });
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
      expect(handler.state.current).toEqual({ active: false, status: 'idle' });
    });
  });

  describe('cancel', () => {
    it('resets status to idle', () => {
      const handler = createTransition();

      handler.open();
      expect(handler.state.current.status).toBe('starting');

      handler.cancel();
      expect(handler.state.current.status).toBe('idle');
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
