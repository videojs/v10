import { act, cleanup, render } from '@testing-library/react';
import { BufferingIndicatorCore } from '@videojs/core';
import { flush } from '@videojs/store';
import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { BufferingIndicator } from '../buffering-indicator';

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {}

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function setup(waiting: boolean) {
  return createPlayerWrapper({
    paused: false,
    ended: false,
    started: true,
    waiting,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    togglePaused: vi.fn(() => true),
  });
}

afterEach(() => {
  cleanup();
  if (vi.isFakeTimers()) {
    act(() => {
      vi.runOnlyPendingTimers();
      flush();
    });
  }
  vi.useRealTimers();
});

describe('BufferingIndicator', () => {
  it('starts its delay after commit and becomes visible when it elapses', () => {
    vi.useFakeTimers();
    const { Wrapper } = setup(true);
    const { getByTestId } = render(<BufferingIndicator data-testid="buffering" delay={100} />, { wrapper: Wrapper });

    expect(getByTestId('buffering').hasAttribute('data-visible')).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
      flush();
    });

    expect(getByTestId('buffering').hasAttribute('data-visible')).toBe(true);
  });

  it('keeps one effective delay under StrictMode effect replay', () => {
    vi.useFakeTimers();
    const { Wrapper } = setup(true);
    const { getByTestId } = render(
      <StrictMode>
        <Wrapper>
          <BufferingIndicator data-testid="buffering" delay={100} />
        </Wrapper>
      </StrictMode>
    );

    act(() => {
      vi.advanceTimersByTime(100);
      flush();
    });

    expect(getByTestId('buffering').hasAttribute('data-visible')).toBe(true);
  });

  it('does not update its core during server rendering', () => {
    const setProps = vi.spyOn(BufferingIndicatorCore.prototype, 'setProps');
    const update = vi.spyOn(BufferingIndicatorCore.prototype, 'update');
    const { Wrapper } = setup(true);

    renderToString(
      <Wrapper>
        <BufferingIndicator />
      </Wrapper>
    );

    expect(setProps).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    setProps.mockRestore();
    update.mockRestore();
  });

  it('does not update its core from an abandoned render', () => {
    const setProps = vi.spyOn(BufferingIndicatorCore.prototype, 'setProps');
    const update = vi.spyOn(BufferingIndicatorCore.prototype, 'update');
    const { store, Wrapper } = setup(false);

    function Throw({ fail = false }: { fail?: boolean }) {
      if (fail) throw new Error('abandon render');
      return null;
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <Boundary>
        <Wrapper>
          <BufferingIndicator />
          <Throw />
        </Wrapper>
      </Boundary>
    );
    setProps.mockClear();
    update.mockClear();
    store.state.waiting = true;

    rerender(
      <Boundary>
        <Wrapper>
          <BufferingIndicator />
          <Throw fail />
        </Wrapper>
      </Boundary>
    );

    expect(setProps).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    consoleError.mockRestore();
    setProps.mockRestore();
    update.mockRestore();
  });
});
