import { renderHook, waitFor } from '@testing-library/react';
import type { IndicatorLifecycleState, TransitionState } from '@videojs/core';
import { createState } from '@videojs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const transitionMock = vi.hoisted(() => ({
  createTransition: vi.fn(),
}));

vi.mock('@videojs/core/dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@videojs/core/dom')>()),
  createTransition: transitionMock.createTransition,
}));

import { useRenderedIndicatorState } from '../use-rendered-indicator-state';

interface TestIndicatorState extends IndicatorLifecycleState {
  value: string;
}

function makeState(generation: number): TestIndicatorState {
  return {
    open: true,
    generation,
    value: String(generation),
    transitionStarting: false,
    transitionEnding: false,
  };
}

function mockTransition() {
  const state = createState<TransitionState>({ active: false, status: 'idle' });
  const open = vi.fn(() => {
    state.patch({ active: true, status: 'starting' });
    return Promise.resolve();
  });
  const close = vi.fn(() => Promise.resolve());
  const cancel = vi.fn();
  const destroy = vi.fn();

  transitionMock.createTransition.mockReturnValue({ state, open, close, cancel, destroy });

  return { state, open, close, cancel, destroy };
}

beforeEach(() => {
  transitionMock.createTransition.mockReset();
});

describe('useRenderedIndicatorState', () => {
  it('replays the open transition on updates by default', async () => {
    const transition = mockTransition();
    const { rerender } = renderHook(({ current }) => useRenderedIndicatorState(current), {
      initialProps: { current: makeState(1) },
    });

    await waitFor(() => {
      expect(transition.open).toHaveBeenCalledTimes(1);
    });

    rerender({ current: makeState(2) });

    await waitFor(() => {
      expect(transition.open).toHaveBeenCalledTimes(2);
    });
  });

  it('skips replaying the open transition on updates when disabled', async () => {
    const transition = mockTransition();
    const { rerender } = renderHook(({ current }) => useRenderedIndicatorState(current, { replayOnUpdate: false }), {
      initialProps: { current: makeState(1) },
    });

    await waitFor(() => {
      expect(transition.open).toHaveBeenCalledTimes(1);
    });

    rerender({ current: makeState(2) });

    expect(transition.open).toHaveBeenCalledTimes(1);
  });

  it('cancels an ending transition when replay is disabled and an update arrives', async () => {
    const transition = mockTransition();
    const { rerender } = renderHook(({ current }) => useRenderedIndicatorState(current, { replayOnUpdate: false }), {
      initialProps: { current: makeState(1) },
    });

    await waitFor(() => {
      expect(transition.open).toHaveBeenCalledTimes(1);
    });

    transition.state.patch({ active: true, status: 'ending' });
    rerender({ current: makeState(2) });

    expect(transition.open).toHaveBeenCalledTimes(1);
    expect(transition.cancel).toHaveBeenCalledOnce();
  });
});
