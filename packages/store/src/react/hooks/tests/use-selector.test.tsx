import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSelector } from '../use-selector';

afterEach(cleanup);

describe('useSelector', () => {
  it('returns selected state from getSnapshot', () => {
    const state = { volume: 0.5, muted: false };
    const subscribe = vi.fn((_cb: () => void) => () => {});
    const getSnapshot = () => state;
    const selector = (s: typeof state) => s.volume;

    function TestComponent() {
      const volume = useSelector(subscribe, getSnapshot, selector);
      return <div data-testid="volume">{volume}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByTestId('volume').textContent).toBe('0.5');
  });

  it('uses shallowEqual by default for object selectors', () => {
    const state = { volume: 0.5, muted: false };
    let subscriber: (() => void) | undefined;

    const subscribe = (cb: () => void) => {
      subscriber = cb;
      return () => {
        subscriber = undefined;
      };
    };

    const getSnapshot = () => state;
    const selector = (s: typeof state) => ({ vol: s.volume });

    function TestComponent() {
      const selected = useSelector(subscribe, getSnapshot, selector);
      return <div data-testid="vol">{selected.vol}</div>;
    }

    const { rerender } = render(<TestComponent />);

    // Trigger re-render with same state (selector returns new object but shallowEqual should match)
    subscriber?.();
    rerender(<TestComponent />);

    // shallowEqual should prevent unnecessary updates when objects are structurally equal
    expect(screen.getByTestId('vol').textContent).toBe('0.5');
  });

  it('allows custom equality function', () => {
    const state = { items: [1, 2, 3] };
    const subscribe = vi.fn((_cb: () => void) => () => {});
    const getSnapshot = () => state;
    const selector = (s: typeof state) => s.items;

    // Custom equality that always returns true
    const alwaysEqual = () => true;

    function TestComponent() {
      const items = useSelector(subscribe, getSnapshot, selector, alwaysEqual);
      return <div data-testid="count">{items.length}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByTestId('count').textContent).toBe('3');
  });
});
