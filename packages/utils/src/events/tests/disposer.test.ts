import { describe, expect, it, vi } from 'vitest';

import { Disposer } from '../disposer';

describe('disposer', () => {
  describe('constructor', () => {
    it('creates a disposer with size 0', () => {
      const disposer = new Disposer();
      expect(disposer.size).toBe(0);
    });

    it('tracks size as cleanups are added', () => {
      const disposer = new Disposer();
      disposer.add(() => {});
      expect(disposer.size).toBe(1);
      disposer.add(() => {});
      expect(disposer.size).toBe(2);
    });
  });

  describe('add', () => {
    it('adds cleanup functions', () => {
      const disposer = new Disposer();
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      disposer.add(cleanup1);
      disposer.add(cleanup2);

      expect(disposer.size).toBe(2);
    });

    it('does not call cleanups when adding', () => {
      const disposer = new Disposer();
      const cleanup = vi.fn();

      disposer.add(cleanup);

      expect(cleanup).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('calls all cleanup functions', () => {
      const disposer = new Disposer();
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();

      disposer.add(cleanup1);
      disposer.add(cleanup2);
      disposer.add(cleanup3);

      disposer.dispose();

      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
      expect(cleanup3).toHaveBeenCalledOnce();
    });

    it('clears the disposer after dispose', () => {
      const disposer = new Disposer();
      disposer.add(() => {});
      disposer.add(() => {});

      expect(disposer.size).toBe(2);
      disposer.dispose();
      expect(disposer.size).toBe(0);
    });

    it('can be called multiple times safely', () => {
      const disposer = new Disposer();
      const cleanup = vi.fn();

      disposer.add(cleanup);
      disposer.dispose();
      disposer.dispose();

      expect(cleanup).toHaveBeenCalledOnce();
    });

    it('allows adding new cleanups after dispose', () => {
      const disposer = new Disposer();
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      disposer.add(cleanup1);
      disposer.dispose();

      disposer.add(cleanup2);
      disposer.dispose();

      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
    });
  });

  describe('disposeAsync', () => {
    it('calls all cleanup functions', async () => {
      const disposer = new Disposer();
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      disposer.add(cleanup1);
      disposer.add(cleanup2);

      await disposer.disposeAsync();

      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
    });

    it('awaits async cleanup functions', async () => {
      const disposer = new Disposer();
      const order: string[] = [];

      disposer.add(async () => {
        await Promise.resolve();
        order.push('async1');
      });

      disposer.add(() => {
        order.push('sync');
      });

      disposer.add(async () => {
        await Promise.resolve();
        order.push('async2');
      });

      await disposer.disposeAsync();

      expect(order).toContain('async1');
      expect(order).toContain('sync');
      expect(order).toContain('async2');
    });

    it('clears the disposer after disposeAsync', async () => {
      const disposer = new Disposer();
      disposer.add(async () => {});

      expect(disposer.size).toBe(1);
      await disposer.disposeAsync();
      expect(disposer.size).toBe(0);
    });

    it('handles mixed sync and async cleanups', async () => {
      const disposer = new Disposer();
      const results: number[] = [];

      disposer.add(() => {
        results.push(1);
      });
      disposer.add(async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(2);
      });
      disposer.add(() => {
        results.push(3);
      });

      await disposer.disposeAsync();

      expect(results).toHaveLength(3);
      expect(results).toContain(1);
      expect(results).toContain(2);
      expect(results).toContain(3);
    });
  });

  describe('integration', () => {
    it('works with real-world cleanup patterns', () => {
      const disposer = new Disposer();

      // Simulating event listener cleanup
      const listeners = new Map<string, () => void>();
      const addEventListener = (type: string, handler: () => void) => {
        listeners.set(type, handler);
        return () => {
          listeners.delete(type);
        };
      };

      disposer.add(addEventListener('click', () => {}));
      disposer.add(addEventListener('keydown', () => {}));

      expect(listeners.size).toBe(2);
      disposer.dispose();
      expect(listeners.size).toBe(0);
    });

    it('works with timer cleanup patterns', () => {
      vi.useFakeTimers();

      const disposer = new Disposer();
      let timerFired = false;

      const id = setTimeout(() => {
        timerFired = true;
      }, 1000);

      disposer.add(() => clearTimeout(id));

      disposer.dispose();
      vi.advanceTimersByTime(2000);

      expect(timerFired).toBe(false);

      vi.useRealTimers();
    });
  });
});
