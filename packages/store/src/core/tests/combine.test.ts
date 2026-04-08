import { describe, expect, it, vi } from 'vitest';

import { combine } from '../combine';
import { defineSlice } from '../slice';

interface Target {
  value: number;
}

const createSlice = defineSlice<Target>();

describe('combine', () => {
  it('merges state from multiple slices', () => {
    const a = createSlice({ state: () => ({ count: 0 }) });
    const b = createSlice({ state: () => ({ label: 'hello' }) });

    const combined = combine(a, b);
    const state = combined.state({ target: () => ({ value: 1 }), signals: {} } as any);

    expect(state).toEqual({ count: 0, label: 'hello' });
  });

  it('calls attach for each slice', () => {
    const attachA = vi.fn();
    const attachB = vi.fn();

    const a = createSlice({ state: () => ({ count: 0 }), attach: attachA });
    const b = createSlice({ state: () => ({ label: '' }), attach: attachB });

    const combined = combine(a, b);
    const ctx = { reportError: vi.fn() } as any;
    combined.attach?.(ctx);

    expect(attachA).toHaveBeenCalledOnce();
    expect(attachB).toHaveBeenCalledOnce();
  });

  it('catches and reports errors from attach', () => {
    const error = new Error('attach failed');
    const a = createSlice({
      state: () => ({ count: 0 }),
      attach: () => {
        throw error;
      },
    });
    const b = createSlice({ state: () => ({ label: '' }) });

    const combined = combine(a, b);
    const reportError = vi.fn();
    combined.attach?.({ reportError } as any);

    expect(reportError).toHaveBeenCalledWith(error);
  });

  it('warns on duplicate state keys in __DEV__ mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const a = createSlice({ state: () => ({ count: 0 }) });
    const b = createSlice({ state: () => ({ count: 1 }) });

    const combined = combine(a, b);
    combined.state({ target: () => ({ value: 1 }), signals: {} } as any);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate state key "count"'));

    warn.mockRestore();
  });
});
