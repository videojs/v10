import { describe, expect, it, vi } from 'vitest';

import { combine } from '../combine';
import { defineSlice } from '../slice';
import { createStore } from '../store';

class MockTarget extends EventTarget {
  value = 0;
}

const slice = defineSlice<MockTarget>();

describe('combine', () => {
  it('merges state from multiple slices', () => {
    const a = slice({ state: () => ({ count: 0 }) });
    const b = slice({ state: () => ({ label: 'hello' }) });

    const store = createStore<MockTarget>()(combine(a, b));

    expect(store.state).toMatchObject({ count: 0, label: 'hello' });
  });

  it('calls attach for each slice', () => {
    const attachA = vi.fn();
    const attachB = vi.fn();

    const a = slice({ state: () => ({ count: 0 }), attach: attachA });
    const b = slice({ state: () => ({ label: '' }), attach: attachB });

    const store = createStore<MockTarget>()(combine(a, b));
    store.attach(new MockTarget());

    expect(attachA).toHaveBeenCalledOnce();
    expect(attachB).toHaveBeenCalledOnce();
  });

  it('catches and reports attach errors via onError callback', () => {
    const error = new Error('attach failed');
    const onError = vi.fn();

    const a = slice({
      state: () => ({ count: 0 }),
      attach: () => {
        throw error;
      },
    });
    const b = slice({ state: () => ({ label: '' }) });

    const store = createStore<MockTarget>()(combine(a, b), { onError });
    store.attach(new MockTarget());

    expect(onError).toHaveBeenCalled();
  });

  it('warns on duplicate state keys in __DEV__ mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const a = slice({ state: () => ({ count: 0 }) });
    const b = slice({ state: () => ({ count: 1 }) });

    createStore<MockTarget>()(combine(a, b));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate state key "count"'));

    warn.mockRestore();
  });
});
