import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { FeatureAvailability } from '../feature-availability';

function createWrapper(volumeAvailability: 'available' | 'unsupported') {
  return createPlayerWrapper({
    volume: 0.5,
    muted: false,
    volumeAvailability,
    setVolume: vi.fn(),
    toggleMuted: vi.fn(),
  });
}

afterEach(() => {
  cleanup();
});

describe('FeatureAvailability', () => {
  it('renders children when the availability matches when', () => {
    const { Wrapper } = createWrapper('unsupported');

    render(
      <Wrapper>
        <FeatureAvailability is="volume" when="unsupported">
          <div data-testid="fallback">Fallback</div>
        </FeatureAvailability>
      </Wrapper>
    );

    expect(screen.getByTestId('fallback')).not.toBeNull();
  });

  it('omits children when the availability does not match when', () => {
    const { Wrapper } = createWrapper('available');

    render(
      <Wrapper>
        <FeatureAvailability is="volume" when="unsupported">
          <div data-testid="fallback">Fallback</div>
        </FeatureAvailability>
      </Wrapper>
    );

    expect(screen.queryByTestId('fallback')).toBeNull();
  });

  it('renders children when the availability is not excepted', () => {
    const { Wrapper } = createWrapper('available');

    render(
      <Wrapper>
        <FeatureAvailability is="volume" except="unsupported">
          <div data-testid="popover">Popover</div>
        </FeatureAvailability>
      </Wrapper>
    );

    expect(screen.getByTestId('popover')).not.toBeNull();
  });

  it('omits children when the availability is excepted', () => {
    const { Wrapper } = createWrapper('unsupported');

    render(
      <Wrapper>
        <FeatureAvailability is="volume" except="unsupported">
          <div data-testid="popover">Popover</div>
        </FeatureAvailability>
      </Wrapper>
    );

    expect(screen.queryByTestId('popover')).toBeNull();
  });
});
