import { cleanup, render } from '@testing-library/react';
import type { IndicatorLifecycleState } from '@videojs/core';
import { createState } from '@videojs/store';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createPlayerWrapper, MockErrorBoundary } from '../../../testing/mocks';
import { useInputIndicatorRoot } from '../use-input-indicator-root';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createCore() {
  return {
    state: createState<IndicatorLifecycleState>({
      open: false,
      generation: 0,
      transitionStarting: false,
      transitionEnding: false,
    }),
    setProps: vi.fn(),
    destroy: vi.fn(),
    close: vi.fn(),
    processEvent: vi.fn(() => false),
  };
}

function Thrower({ abandon }: { abandon: boolean }): ReactNode {
  if (abandon) throw new Error('abandon render');

  return null;
}

describe('useInputIndicatorRoot', () => {
  it('does not publish props from an abandoned render to the retained core', () => {
    const core = createCore();
    const { Wrapper } = createPlayerWrapper();

    vi.spyOn(console, 'error').mockImplementation(() => {});

    function Probe({ value }: { value: string }) {
      useInputIndicatorRoot(() => core, { value });
      return null;
    }

    const { rerender } = render(
      <Wrapper>
        <MockErrorBoundary>
          <Probe value="committed" />
          <Thrower abandon={false} />
        </MockErrorBoundary>
      </Wrapper>
    );

    expect(core.setProps).toHaveBeenCalledWith({ value: 'committed' });

    rerender(
      <Wrapper>
        <MockErrorBoundary>
          <Probe value="abandoned" />
          <Thrower abandon />
        </MockErrorBoundary>
      </Wrapper>
    );

    expect(core.setProps).not.toHaveBeenCalledWith({ value: 'abandoned' });
  });

  it('publishes the latest committed props under StrictMode', () => {
    const core = createCore();
    const { Wrapper } = createPlayerWrapper();

    function Probe({ value }: { value: string }) {
      useInputIndicatorRoot(() => core, { value });
      return null;
    }

    const { rerender } = render(
      <StrictMode>
        <Wrapper>
          <Probe value="first" />
        </Wrapper>
      </StrictMode>
    );

    expect(core.setProps).toHaveBeenLastCalledWith({ value: 'first' });

    rerender(
      <StrictMode>
        <Wrapper>
          <Probe value="second" />
        </Wrapper>
      </StrictMode>
    );

    expect(core.setProps).toHaveBeenLastCalledWith({ value: 'second' });
  });
});
