import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Title } from '../title';

afterEach(() => {
  cleanup();
});

function metadataState(contentTitle: string): Record<string, unknown> {
  return {
    contentTitle,
    setContentTitle: vi.fn(),
    setDefaultContentTitle: vi.fn(),
  };
}

function controlsState(controlsVisible: boolean): Record<string, unknown> {
  return {
    userActive: true,
    controlsVisible,
    requestControlsLock: vi.fn(() => vi.fn()),
    toggleControls: vi.fn(() => true),
  };
}

function playbackState(paused: boolean): Record<string, unknown> {
  return {
    paused,
    ended: false,
    started: false,
    waiting: false,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    togglePaused: vi.fn(() => true),
  };
}

describe('Title', () => {
  it('renders the resolved content title as text', () => {
    const { Wrapper } = createPlayerWrapper({
      ...metadataState('Sintel'),
      ...controlsState(true),
      ...playbackState(true),
    });
    const { getByTestId } = render(<Title data-testid="title" />, { wrapper: Wrapper });

    expect(getByTestId('title').textContent).toBe('Sintel');
  });

  it('renders nothing without the metadata feature', () => {
    const { Wrapper } = createPlayerWrapper({ ...controlsState(true), ...playbackState(true) });
    const { queryByTestId } = render(<Title data-testid="title" />, { wrapper: Wrapper });

    expect(queryByTestId('title')).toBeNull();
  });

  it('omits data-has-title when no source supplies a title', () => {
    const { Wrapper } = createPlayerWrapper({
      ...metadataState(''),
      ...controlsState(true),
      ...playbackState(true),
    });
    const { getByTestId } = render(<Title data-testid="title" />, { wrapper: Wrapper });

    const title = getByTestId('title');
    expect(title.textContent).toBe('');
    expect(title.hasAttribute('data-has-title')).toBe(false);
    expect(title.hasAttribute('data-visible')).toBe(false);
  });

  it('is visible while paused', () => {
    const { Wrapper } = createPlayerWrapper({
      ...metadataState('Sintel'),
      ...controlsState(true),
      ...playbackState(true),
    });
    const { getByTestId } = render(<Title data-testid="title" />, { wrapper: Wrapper });

    expect(getByTestId('title').hasAttribute('data-visible')).toBe(true);
  });

  it('is hidden while playing', () => {
    const { Wrapper } = createPlayerWrapper({
      ...metadataState('Sintel'),
      ...controlsState(true),
      ...playbackState(false),
    });
    const { getByTestId } = render(<Title data-testid="title" />, { wrapper: Wrapper });

    expect(getByTestId('title').hasAttribute('data-has-title')).toBe(true);
    expect(getByTestId('title').hasAttribute('data-visible')).toBe(false);
  });

  it('is hidden when controls are hidden', () => {
    const { Wrapper } = createPlayerWrapper({
      ...metadataState('Sintel'),
      ...controlsState(false),
      ...playbackState(true),
    });
    const { getByTestId } = render(<Title data-testid="title" />, { wrapper: Wrapper });

    expect(getByTestId('title').hasAttribute('data-has-title')).toBe(true);
    expect(getByTestId('title').hasAttribute('data-visible')).toBe(false);
  });

  it('keeps the title visible without the controls and playback features', () => {
    const { Wrapper } = createPlayerWrapper(metadataState('Sintel'));
    const { getByTestId } = render(<Title data-testid="title" />, { wrapper: Wrapper });

    const title = getByTestId('title');
    expect(title.textContent).toBe('Sintel');
    expect(title.hasAttribute('data-visible')).toBe(true);
  });

  it('supports className as a function of state', () => {
    const { Wrapper } = createPlayerWrapper({
      ...metadataState('Sintel'),
      ...controlsState(true),
      ...playbackState(true),
    });
    const { getByTestId } = render(
      <Title className={(state) => (state.visible ? 'shown' : 'hidden')} data-testid="title" />,
      { wrapper: Wrapper }
    );

    expect(getByTestId('title').className).toBe('shown');
  });
});
