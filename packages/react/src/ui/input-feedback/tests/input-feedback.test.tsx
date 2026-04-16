import { cleanup, render, waitFor } from '@testing-library/react';
import type { InputFeedbackDataState, InputFeedbackVolumeLevel } from '@videojs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { InputFeedbackRootProvider } from '../context';
import { InputFeedbackIcon } from '../input-feedback-icon';
import { InputFeedbackItem } from '../input-feedback-item';
import { InputFeedbackRoot } from '../input-feedback-root';
import { InputFeedbackValue } from '../input-feedback-value';

afterEach(cleanup);

const DEFAULT_STATE: InputFeedbackDataState = {
  active: false,
  action: null,
  region: null,
  direction: null,
  count: 0,
  seekTotal: 0,
  generation: 0,
  label: null,
  paused: null,
  volumeLevel: null,
  fullscreen: null,
  captions: null,
  pip: null,
  boundary: null,
  volumeLabel: null,
  captionsLabel: null,
  transitionStarting: false,
  transitionEnding: false,
};

function renderWithRoot(
  ui: React.ReactNode,
  state: InputFeedbackDataState = DEFAULT_STATE,
  volumePercentage = '55%',
  currentVolumeLevel: InputFeedbackVolumeLevel | null = 'high',
  currentValues = {
    volume: '55%',
    captions: 'Captions off',
    seek: '0:00',
    playback: 'Paused',
  }
) {
  return {
    ...render(
      <InputFeedbackRootProvider value={{ state, volumePercentage, currentVolumeLevel, currentValues }}>
        {ui}
      </InputFeedbackRootProvider>
    ),
  };
}

describe('InputFeedbackItem', () => {
  it('exposes item-local data attributes for a matching group', () => {
    const state: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'volumeStep',
      volumeLevel: 'high',
      volumeLabel: '80%',
      label: '80%',
    };
    const { container } = renderWithRoot(
      <InputFeedbackItem group="volume">
        <InputFeedbackValue />
      </InputFeedbackItem>,
      state
    );

    const item = container.firstElementChild as HTMLElement;

    expect(item.hasAttribute('data-action')).toBe(false);
    expect(item.getAttribute('data-group')).toBe('volume');
    expect(item.getAttribute('data-region')).toBe('center');
    expect(item.getAttribute('data-value')).toBe('80%');
    expect(item.getAttribute('data-volume-level')).toBe('high');
    expect(item.style.getPropertyValue('--media-volume-percentage')).toBe('55%');
    expect(item.textContent).toBe('80%');
  });

  it('does not add the volume CSS variable to non-volume items', () => {
    const state: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'toggleSubtitles',
      captions: true,
      captionsLabel: 'Captions on',
      label: 'Captions on',
    };
    const { container } = renderWithRoot(
      <InputFeedbackItem group="captions">
        <InputFeedbackValue />
      </InputFeedbackItem>,
      state
    );

    const item = container.firstElementChild as HTMLElement;
    expect(item.style.getPropertyValue('--media-volume-percentage')).toBe('');
  });

  it('does not mount items while they are idle', () => {
    const { container } = renderWithRoot(<InputFeedbackItem group="volume" />, DEFAULT_STATE, '55%', 'low');

    expect(container.firstElementChild).toBeNull();
  });

  it('does not add feedback data attributes to the root', () => {
    const playerContextValue = {
      store: {
        state: {},
        subscribe: () => () => {},
      },
      media: null,
      setMedia: vi.fn(),
      container: null,
      setContainer: vi.fn(),
    } as unknown as PlayerContextValue;
    const { container } = render(
      <PlayerContextProvider value={playerContextValue}>
        <InputFeedbackRoot className="media-input-feedback" />
      </PlayerContextProvider>
    );
    const root = container.firstElementChild as HTMLElement;

    expect(root.hasAttribute('data-count')).toBe(false);
    expect(root.hasAttribute('data-action')).toBe(false);
    expect(root.hasAttribute('data-direction')).toBe(false);
    expect(root.hasAttribute('data-volume-level')).toBe(false);
  });

  it('matches every action inside a group', () => {
    const state: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'seekToPercent',
      direction: 'forward',
    };
    const { container } = renderWithRoot(<InputFeedbackItem group="seek" />, state);

    const item = container.firstElementChild as HTMLElement;
    expect(item.getAttribute('data-action')).toBe('seekToPercent');
    expect(item.getAttribute('data-group')).toBe('seek');
    expect(item.getAttribute('data-region')).toBe('right');
  });

  it('adds starting-style on the item during enter transitions', async () => {
    const state: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'togglePaused',
      paused: true,
    };
    const rafCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrameMock = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });
    const cancelAnimationFrameMock = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { container } = renderWithRoot(<InputFeedbackItem group="playback" />, state);
    const item = container.firstElementChild as HTMLElement;

    await waitFor(() => {
      expect(item.hasAttribute('data-starting-style')).toBe(true);
    });

    requestAnimationFrameMock.mockRestore();
    cancelAnimationFrameMock.mockRestore();
  });

  it('does not activate an exact-action item for a different action', () => {
    const state: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'volumeStep',
      volumeLevel: 'low',
      volumeLabel: '40%',
      label: '40%',
    };
    const { container } = renderWithRoot(
      <InputFeedbackItem action="toggleMuted">
        <InputFeedbackValue />
      </InputFeedbackItem>,
      state
    );

    expect(container.firstElementChild).toBeNull();
  });

  it('renders the current playback label when an active item has no transient value', () => {
    const state: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'togglePaused',
      paused: true,
    };
    const { container } = renderWithRoot(
      <InputFeedbackItem group="playback">
        <InputFeedbackValue />
      </InputFeedbackItem>,
      state,
      '55%',
      'high',
      {
        volume: '55%',
        captions: 'Captions off',
        seek: '0:00',
        playback: 'Paused',
      }
    );

    const item = container.firstElementChild as HTMLElement;
    expect(item.textContent).toBe('Paused');
  });

  it('keeps the matched payload during the ending transition', async () => {
    const activeState: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'togglePaused',
      paused: true,
    };
    const idleState: InputFeedbackDataState = {
      ...DEFAULT_STATE,
    };
    const { container, rerender } = render(
      <InputFeedbackRootProvider
        value={{
          state: activeState,
          volumePercentage: '55%',
          currentVolumeLevel: 'high',
          currentValues: {
            volume: '55%',
            captions: 'Captions off',
            seek: '0:00',
            playback: 'Paused',
          },
        }}
      >
        <InputFeedbackItem group="playback" />
      </InputFeedbackRootProvider>
    );

    const item = container.firstElementChild as HTMLElement;
    let resolveAnimation!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    Object.defineProperty(item, 'getAnimations', {
      value: () => [{ finished }] as unknown as Animation[],
    });

    rerender(
      <InputFeedbackRootProvider
        value={{
          state: idleState,
          volumePercentage: '55%',
          currentVolumeLevel: 'high',
          currentValues: {
            volume: '55%',
            captions: 'Captions off',
            seek: '0:00',
            playback: 'Paused',
          },
        }}
      >
        <InputFeedbackItem group="playback" />
      </InputFeedbackRootProvider>
    );

    await waitFor(() => {
      expect(item.hasAttribute('data-ending-style')).toBe(true);
    });

    expect(item.hasAttribute('data-active')).toBe(false);
    expect(item.hasAttribute('data-action')).toBe(false);
    expect(item.getAttribute('data-group')).toBe('playback');
    expect(item.hasAttribute('data-paused')).toBe(true);

    resolveAnimation();
  });

  it('unmounts the item after the ending transition completes', async () => {
    const activeState: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'togglePaused',
      paused: true,
    };
    const { container, rerender } = render(
      <InputFeedbackRootProvider
        value={{
          state: activeState,
          volumePercentage: '55%',
          currentVolumeLevel: 'high',
          currentValues: {
            volume: '55%',
            captions: 'Captions off',
            seek: '0:00',
            playback: 'Paused',
          },
        }}
      >
        <InputFeedbackItem group="playback" />
      </InputFeedbackRootProvider>
    );

    const item = container.firstElementChild as HTMLElement;
    let resolveAnimation!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    Object.defineProperty(item, 'getAnimations', {
      value: () => [{ finished }] as unknown as Animation[],
    });

    rerender(
      <InputFeedbackRootProvider
        value={{
          state: DEFAULT_STATE,
          volumePercentage: '55%',
          currentVolumeLevel: 'high',
          currentValues: {
            volume: '55%',
            captions: 'Captions off',
            seek: '0:00',
            playback: 'Paused',
          },
        }}
      >
        <InputFeedbackItem group="playback" />
      </InputFeedbackRootProvider>
    );

    resolveAnimation();

    await waitFor(() => {
      expect(container.firstElementChild).toBeNull();
    });
  });
});

describe('InputFeedback child compounds', () => {
  it('replays its icon subtree when the item generation changes', () => {
    const initialState: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'seekStep',
      direction: 'forward',
      seekTotal: 10,
      generation: 1,
    };
    const repeatedState: InputFeedbackDataState = {
      ...initialState,
      seekTotal: 20,
      generation: 2,
    };
    const { container, rerender } = render(
      <InputFeedbackRootProvider
        value={{
          state: initialState,
          volumePercentage: '55%',
          currentVolumeLevel: 'high',
          currentValues: {
            volume: '55%',
            captions: 'Captions off',
            seek: '0:10',
            playback: 'Paused',
          },
        }}
      >
        <InputFeedbackItem group="seek">
          <InputFeedbackIcon data-testid="icon">
            <span className="marker">Seek</span>
          </InputFeedbackIcon>
        </InputFeedbackItem>
      </InputFeedbackRootProvider>
    );

    const firstIcon = container.querySelector('[data-testid="icon"]');

    rerender(
      <InputFeedbackRootProvider
        value={{
          state: repeatedState,
          volumePercentage: '55%',
          currentVolumeLevel: 'high',
          currentValues: {
            volume: '55%',
            captions: 'Captions off',
            seek: '0:20',
            playback: 'Paused',
          },
        }}
      >
        <InputFeedbackItem group="seek">
          <InputFeedbackIcon data-testid="icon">
            <span className="marker">Seek</span>
          </InputFeedbackIcon>
        </InputFeedbackItem>
      </InputFeedbackRootProvider>
    );

    const secondIcon = container.querySelector('[data-testid="icon"]');

    expect(secondIcon).not.toBe(firstIcon);
  });

  it('throws when used outside InputFeedback.Item', () => {
    expect(() => renderWithRoot(<InputFeedbackValue />)).toThrow(
      'InputFeedback child compounds must be used within an InputFeedback.Item'
    );
  });

  it('throws when icon is used outside InputFeedback.Item', () => {
    expect(() => renderWithRoot(<InputFeedbackIcon />)).toThrow(
      'InputFeedback child compounds must be used within an InputFeedback.Item'
    );
  });
});
