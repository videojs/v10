import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { SeekIndicatorCore, StatusIndicatorCore, VolumeIndicatorCore } from '@videojs/core';
import type { UnknownStore } from '@videojs/store';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { SeekIndicator } from '../../seek-indicator';
import { SeekIndicatorProvider } from '../../seek-indicator/context';
import { StatusAnnouncer } from '../../status-announcer/status-announcer';
import { StatusIndicator } from '../../status-indicator';
import { StatusIndicatorProvider } from '../../status-indicator/context';
import { VolumeIndicator } from '../../volume-indicator';
import { VolumeIndicatorProvider } from '../../volume-indicator/context';
import { useIndicatorVisibility } from '../use-indicator-visibility';

afterEach(cleanup);

describe('input indicators', () => {
  it('renders status values from the nearest status item context', () => {
    const state: StatusIndicatorCore.State = {
      open: true,
      generation: 1,
      status: 'captions-on',
      label: 'Captions on',
      value: null,
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <StatusIndicatorProvider value={{ state }}>
        <StatusIndicator.Value data-testid="value" />
      </StatusIndicatorProvider>
    );

    expect(getByTestId('value').textContent).toBe('Captions on');
  });

  it('uses implicit StatusAnnouncer live-region semantics without rendering text content', () => {
    const { getByRole } = renderWithPlayer(<StatusAnnouncer />);

    expect(getByRole('status').hasAttribute('aria-live')).toBe(false);
    expect(getByRole('status').textContent).toBe('');
  });

  it('updates StatusAnnouncer live text from store snapshots', async () => {
    const { store, setState } = createTestStore({ paused: true });
    const { getByRole } = renderWithPlayer(<StatusAnnouncer />, store);
    await act(async () => {});

    expect(getByRole('status').textContent).toBe('');

    setState({ paused: false });
    await act(async () => {});

    expect(getByRole('status').textContent).toBe('Playing');
  });

  it('uses the next store snapshot as baseline when StatusAnnouncer store changes', async () => {
    const first = createTestStore({ paused: false });
    const second = createTestStore({ paused: false });
    const { getByRole, rerender } = render(
      <PlayerContextProvider value={createPlayerContextValue(first.store)}>
        <StatusAnnouncer />
      </PlayerContextProvider>
    );
    await act(async () => {});

    first.setState({ paused: true });
    await act(async () => {});
    expect(getByRole('status').textContent).toBe('Paused');

    rerender(
      <PlayerContextProvider value={createPlayerContextValue(second.store)}>
        <StatusAnnouncer />
      </PlayerContextProvider>
    );
    await act(async () => {});

    expect(getByRole('status').textContent).toBe('');
  });

  it.each([
    {
      name: 'completed seeks',
      initialState: { currentTime: 10, duration: 120, seeking: false },
      update: async (setState: (partial: Record<string, unknown>) => void) => {
        setState({ currentTime: 45, seeking: true });
        await act(async () => {});
        setState({ seeking: false });
      },
    },
    {
      name: 'volume changes',
      initialState: { volume: 0.5, muted: false },
      update: async (setState: (partial: Record<string, unknown>) => void) => {
        setState({ volume: 0.75 });
      },
    },
  ])('does not announce $name while a slider inside the player is focused', async ({ initialState, update }) => {
    vi.useFakeTimers();
    const { container, cleanup: cleanupSlider } = focusSliderInContainer();

    try {
      const { store, setState } = createTestStore(initialState);
      const { getByRole } = renderWithPlayer(<StatusAnnouncer />, store, container);
      await act(async () => {});

      await update(setState);
      await act(async () => {});
      act(() => vi.advanceTimersByTime(200));

      expect(getByRole('status').textContent).toBe('');
    } finally {
      cleanupSlider();
      vi.useRealTimers();
    }
  });

  it('announces volume changes when a slider outside the player is focused', async () => {
    vi.useFakeTimers();
    const { cleanup: cleanupSlider } = focusSliderInContainer();

    try {
      const { store, setState } = createTestStore({ volume: 0.5, muted: false });
      const { getByRole } = renderWithPlayer(<StatusAnnouncer />, store);
      await act(async () => {});

      setState({ volume: 0.75 });
      await act(async () => {});
      await act(async () => vi.advanceTimersByTime(200));

      expect(getByRole('status').textContent).toBe('Volume 75%');
    } finally {
      cleanupSlider();
      vi.useRealTimers();
    }
  });

  it('uses StatusAnnouncer suppression props without passing them to the DOM', async () => {
    vi.useFakeTimers();
    const { store, setState } = createTestStore({ volume: 0.5, muted: false });
    const shouldAnnounceVolume = vi.fn(() => false);
    const { getByRole } = renderWithPlayer(<StatusAnnouncer shouldAnnounceVolume={shouldAnnounceVolume} />, store);
    await act(async () => {});

    setState({ volume: 0.75 });
    await act(async () => {});
    act(() => vi.advanceTimersByTime(200));

    expect(shouldAnnounceVolume).toHaveBeenCalled();
    expect(getByRole('status').textContent).toBe('');
    expect(getByRole('status').hasAttribute('shouldAnnounceVolume')).toBe(false);

    vi.useRealTimers();
  });

  it('scopes the volume CSS variable to VolumeIndicator.Fill', () => {
    const state: VolumeIndicatorCore.State = {
      open: true,
      generation: 1,
      level: 'high',
      value: '60%',
      fill: '60%',
      min: false,
      max: false,
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <VolumeIndicatorProvider value={{ state }}>
        <div data-testid="root">
          <VolumeIndicator.Fill data-testid="fill">
            <VolumeIndicator.Value data-testid="value" />
          </VolumeIndicator.Fill>
        </div>
      </VolumeIndicatorProvider>
    );

    expect(getByTestId('root').style.getPropertyValue('--media-volume-fill')).toBe('');
    expect(getByTestId('fill').style.getPropertyValue('--media-volume-fill')).toBe('60%');
    expect(getByTestId('value').textContent).toBe('60%');
  });

  it('keeps seek value content populated while mounted', () => {
    const state: SeekIndicatorCore.State = {
      open: true,
      generation: 1,
      direction: 'forward',
      count: 1,
      seekTotal: 10,
      value: null,
      currentTime: '0:30',
      transitionStarting: false,
      transitionEnding: false,
    };

    const { getByTestId } = render(
      <SeekIndicatorProvider value={{ state }}>
        <SeekIndicator.Value data-testid="value" />
      </SeekIndicatorProvider>
    );

    expect(getByTestId('value').textContent).toBe('0:30');
  });

  it('closes the previous visual indicator when a new one is shown', () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    const { getByTestId } = renderWithPlayer(
      <>
        <VisibilityProbe close={firstClose} id="first" />
        <VisibilityProbe close={secondClose} id="second" />
      </>
    );

    fireEvent.click(getByTestId('second'));

    expect(firstClose).toHaveBeenCalledOnce();
    expect(secondClose).not.toHaveBeenCalled();
  });
});

function VisibilityProbe({ close, id }: { close: () => void; id: string }) {
  const show = useIndicatorVisibility(close);
  return (
    <button data-testid={id} onClick={show} type="button">
      {id}
    </button>
  );
}

function createTestStore(initialState: Record<string, unknown> = {}) {
  let state = initialState;
  const listeners = new Set<() => void>();
  const store = {
    get state() {
      return state;
    },
    subscribe(callback: () => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  } as unknown as UnknownStore;

  const setState = (partial: Record<string, unknown>) => {
    act(() => {
      state = { ...state, ...partial };
      for (const listener of listeners) listener();
    });
  };

  return { store, setState };
}

function createPlayerContextValue(
  store: UnknownStore,
  container: HTMLElement = document.createElement('div')
): PlayerContextValue {
  return {
    store,
    media: null,
    setMedia: vi.fn(),
    container,
    setContainer: vi.fn(),
  } as unknown as PlayerContextValue;
}

function renderWithPlayer(ui: ReactNode, store: UnknownStore = createTestStore().store, container?: HTMLElement) {
  return render(<PlayerContextProvider value={createPlayerContextValue(store, container)}>{ui}</PlayerContextProvider>);
}

function focusSliderInContainer(container = document.createElement('div')) {
  const slider = document.createElement('button');
  slider.setAttribute('role', 'slider');
  container.append(slider);
  document.body.append(container);
  slider.focus();

  return {
    container,
    cleanup: () => container.remove(),
  };
}
