import { cleanup, render } from '@testing-library/react';
import type { IndicatorLifecycleState } from '@videojs/core';
import { createState } from '@videojs/store';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { useInputIndicatorRoot } from '../use-input-indicator-root';

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

afterEach(cleanup);

describe('useInputIndicatorRoot', () => {
  it('does not publish props from an abandoned render to the retained core', () => {
    const setProps = vi.fn();
    const core = {
      state: createState<IndicatorLifecycleState>({
        open: false,
        generation: 0,
        transitionStarting: false,
        transitionEnding: false,
      }),
      setProps,
      destroy: vi.fn(),
      close: vi.fn(),
      processEvent: vi.fn(() => false),
    };
    const { Wrapper } = createPlayerWrapper();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    function Probe({ value }: { value: string }) {
      useInputIndicatorRoot(() => core, { value });
      return null;
    }

    function Thrower({ abandon }: { abandon: boolean }) {
      if (abandon) throw new Error('abandon render');
      return null;
    }

    const { rerender } = render(
      <Wrapper>
        <Boundary>
          <Probe value="committed" />
          <Thrower abandon={false} />
        </Boundary>
      </Wrapper>
    );

    expect(setProps).toHaveBeenCalledWith({ value: 'committed' });

    rerender(
      <Wrapper>
        <Boundary>
          <Probe value="abandoned" />
          <Thrower abandon />
        </Boundary>
      </Wrapper>
    );

    expect(setProps).not.toHaveBeenCalledWith({ value: 'abandoned' });
    consoleError.mockRestore();
  });
});
