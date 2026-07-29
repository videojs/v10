'use client';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { AirPlayButton } from '../airplay-button';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAirPlayButton() {
  const { Wrapper } = createPlayerWrapper({
    remotePlaybackState: 'disconnected',
    remotePlaybackAvailability: 'available',
    toggleRemotePlayback: vi.fn(),
  });

  render(<AirPlayButton data-testid="airplay" />, { wrapper: Wrapper });
}

describe('AirPlayButton', () => {
  it('is hidden outside WebKit', () => {
    renderAirPlayButton();

    expect(screen.queryByTestId('airplay')).toBeNull();
  });

  it('renders when AirPlay is available in WebKit', () => {
    vi.stubGlobal('WebKitPlaybackTargetAvailabilityEvent', class {});

    renderAirPlayButton();

    expect(screen.getByTestId('airplay')).toBeDefined();
  });
});
