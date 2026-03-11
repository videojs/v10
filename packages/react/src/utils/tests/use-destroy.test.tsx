import { render, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDestroy } from '../use-destroy';

describe('useDestroy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('destroys instance after unmount', () => {
    const instance = { destroy: vi.fn() };

    const { unmount } = renderHook(() => useDestroy(instance));

    expect(instance.destroy).not.toHaveBeenCalled();

    unmount();
    vi.runAllTimers();

    expect(instance.destroy).toHaveBeenCalledOnce();
  });

  it('does not destroy synchronously in cleanup', () => {
    const instance = { destroy: vi.fn() };

    const { unmount } = renderHook(() => useDestroy(instance));

    unmount();

    // Destroy is deferred — not called yet
    expect(instance.destroy).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(instance.destroy).toHaveBeenCalledOnce();
  });

  it('does not destroy in StrictMode double-mount', () => {
    const instance = { destroy: vi.fn() };

    function TestComponent() {
      useDestroy(instance);
      return null;
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    vi.runAllTimers();

    // StrictMode runs cleanup then re-mount — destroy should be cancelled
    expect(instance.destroy).not.toHaveBeenCalled();
  });

  it('destroys after real unmount in StrictMode', () => {
    const instance = { destroy: vi.fn() };

    function TestComponent() {
      useDestroy(instance);
      return null;
    }

    const { unmount } = render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    vi.runAllTimers();
    expect(instance.destroy).not.toHaveBeenCalled();

    unmount();
    vi.runAllTimers();

    expect(instance.destroy).toHaveBeenCalledOnce();
  });

  it('calls setup once on mount', () => {
    const instance = { destroy: vi.fn() };
    const setup = vi.fn();

    renderHook(() => useDestroy(instance, setup));

    expect(setup).toHaveBeenCalledOnce();
  });

  it('calls setup once in StrictMode (skips re-mount)', () => {
    const instance = { destroy: vi.fn() };
    const setup = vi.fn();

    function TestComponent() {
      useDestroy(instance, setup);
      return null;
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // Setup should only run once — the re-mount skips it
    expect(setup).toHaveBeenCalledOnce();
  });
});
