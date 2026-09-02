import { cleanup, render } from '@testing-library/react';
import { logMissingFeature } from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MockErrorBoundary } from '../../../testing/mocks';
import { useLogMissingFeature } from '../use-log-missing-feature';

vi.mock('@videojs/core/dom', () => ({
  logMissingFeature: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useLogMissingFeature', () => {
  it('logs after a render missing the feature commits', () => {
    function Probe() {
      useLogMissingFeature(true, 'Control', 'playback');
      return null;
    }

    render(<Probe />);

    expect(logMissingFeature).toHaveBeenCalledWith('Control', 'playback');
  });

  it('does not log while the feature is present', () => {
    function Probe() {
      useLogMissingFeature(false, 'Control', 'playback');
      return null;
    }

    render(<Probe />);

    expect(logMissingFeature).not.toHaveBeenCalled();
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
      <MockErrorBoundary>
        <Abandoned />
      </MockErrorBoundary>
    );

    expect(logMissingFeature).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
