import { cleanup, render } from '@testing-library/react';
import { logMissingFeature } from '@videojs/core/dom';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLogMissingFeature } from '../use-log-missing-feature';

vi.mock('@videojs/core/dom', () => ({
  logMissingFeature: vi.fn(),
}));

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useLogMissingFeature', () => {
  it('logs only after a missing feature render commits', () => {
    function Probe() {
      useLogMissingFeature(true, 'Control', 'playback');
      return null;
    }

    render(<Probe />);

    expect(logMissingFeature).toHaveBeenCalledWith('Control', 'playback');
  });

  it('does not log during server rendering', () => {
    function Probe() {
      useLogMissingFeature(true, 'Control', 'playback');
      return null;
    }

    renderToString(<Probe />);

    expect(logMissingFeature).not.toHaveBeenCalled();
  });

  it('does not log from an abandoned render', () => {
    function Abandoned(): ReactNode {
      useLogMissingFeature(true, 'Control', 'playback');
      throw new Error('abandon render');
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <Boundary>
        <Abandoned />
      </Boundary>
    );

    expect(logMissingFeature).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
