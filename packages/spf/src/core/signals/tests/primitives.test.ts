import { describe, expect, it } from 'vitest';
import { signal, update } from '../primitives';

describe('update', () => {
  it('merges a partial object into current state', () => {
    const s = signal({ a: 1, b: 2 });
    update(s, { b: 3 });
    expect(s.get()).toEqual({ a: 1, b: 3 });
  });

  it('preserves unmentioned keys when merging partial', () => {
    const s = signal({ x: 10, y: 20, z: 30 });
    update(s, { y: 99 });
    expect(s.get()).toEqual({ x: 10, y: 99, z: 30 });
  });

  it('applies an updater function with the current state', () => {
    const s = signal({ count: 0 });
    update(s, (current) => ({ ...current, count: current.count + 1 }));
    expect(s.get().count).toBe(1);
  });

  it('updater function receives the latest state value', () => {
    const s = signal({ count: 5 });
    update(s, (current) => ({ ...current, count: current.count * 2 }));
    expect(s.get().count).toBe(10);
  });

  it('empty partial leaves state unchanged', () => {
    const s = signal({ a: 1 });
    update(s, {});
    expect(s.get()).toEqual({ a: 1 });
  });
});
