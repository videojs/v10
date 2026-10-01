import { render } from '@testing-library/react';
import type { MutableRefObject, RefObject } from 'react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { composeRefs, useComposedRefs } from '../use-composed-refs';

// Helper to create a mutable ref object for testing (without using deprecated createRef)
function createMutableRef<T>(initialValue: T | null = null): MutableRefObject<T | null> {
  return { current: initialValue };
}

describe('composeRefs', () => {
  it('sets value on multiple refs', () => {
    const callbackRef = vi.fn();
    const refObject = createMutableRef<string>();
    const composed = composeRefs(callbackRef, refObject);

    composed('test-value');

    expect(callbackRef).toHaveBeenCalledWith('test-value');
    expect(refObject.current).toBe('test-value');
  });

  it('handles undefined refs', () => {
    const callbackRef = vi.fn();
    const composed = composeRefs(undefined, callbackRef, undefined);

    composed('test-value');

    expect(callbackRef).toHaveBeenCalledWith('test-value');
  });

  it('never returns a cleanup, which React 18 would warn about', () => {
    const composed = composeRefs(
      vi.fn(() => vi.fn()),
      createMutableRef<string>()
    );

    expect(composed('test-value')).toBeUndefined();
  });

  it('on null, runs cleanups inner refs returned and clears the rest', () => {
    const cleanup = vi.fn();
    const cleanupRef = vi.fn().mockReturnValue(cleanup);
    const callbackRef = vi.fn();
    const refObject = createMutableRef<string>();
    const composed = composeRefs(cleanupRef, callbackRef, refObject);

    composed('test-value');
    composed(null);

    expect(cleanup).toHaveBeenCalledOnce();
    expect(cleanupRef).toHaveBeenCalledExactlyOnceWith('test-value');
    expect(callbackRef).toHaveBeenLastCalledWith(null);
    expect(refObject.current).toBeNull();
  });

  it('runs a previous cleanup before handing over a new value', () => {
    const cleanup = vi.fn();
    const callbackRef = vi.fn().mockReturnValue(cleanup);
    const composed = composeRefs(callbackRef);

    composed('first');
    composed('second');

    expect(cleanup).toHaveBeenCalledOnce();
    expect(callbackRef).toHaveBeenLastCalledWith('second');
  });
});

describe('useComposedRefs', () => {
  it('returns a stable callback ref', () => {
    let composedRef1: ((value: HTMLDivElement | null) => void) | null = null;
    let composedRef2: ((value: HTMLDivElement | null) => void) | null = null;

    function TestComponent() {
      const ref1 = useRef<HTMLDivElement>(null);
      const ref2 = useRef<HTMLDivElement>(null);
      const composed = useComposedRefs(ref1, ref2);

      if (!composedRef1) {
        composedRef1 = composed;
      } else {
        composedRef2 = composed;
      }

      return <div ref={composed}>Test</div>;
    }

    const { rerender } = render(<TestComponent />);

    rerender(<TestComponent />);

    // Same refs should produce same composed ref
    expect(composedRef1).toBe(composedRef2);
  });

  it('works with forwardRef pattern', () => {
    const externalRef = createMutableRef<HTMLDivElement>();

    function TestComponent({ forwardedRef }: { forwardedRef: RefObject<HTMLDivElement | null> }) {
      const internalRef = useRef<HTMLDivElement>(null);
      const composedRef = useComposedRefs(forwardedRef, internalRef);

      return <div ref={composedRef}>Test</div>;
    }

    render(<TestComponent forwardedRef={externalRef} />);

    expect(externalRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
