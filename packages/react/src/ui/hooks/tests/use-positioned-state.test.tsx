import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePositionedState } from '../use-positioned-state';

describe('usePositionedState', () => {
  it('uses the preferred side on the first closed render', () => {
    const sides: string[] = [];
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => {
        const positioned = usePositionedState<{ open: boolean; side: 'top' | 'bottom' }>({ open, side: 'top' });
        sides.push(positioned.state.side);
        return positioned;
      },
      { initialProps: { open: true } }
    );

    act(() => result.current.setPositionedSide('bottom'));
    expect(result.current.state.side).toBe('bottom');

    sides.length = 0;
    rerender({ open: false });

    expect(sides[0]).toBe('top');
    expect(result.current.state.side).toBe('top');
  });
});
