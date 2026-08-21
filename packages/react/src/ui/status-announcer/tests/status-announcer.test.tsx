import { act, cleanup, render } from '@testing-library/react';
import { StatusAnnouncerCore } from '@videojs/core';
import type { UnknownStore } from '@videojs/store';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { StatusAnnouncer } from '../status-announcer';

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

describe('StatusAnnouncer', () => {
  it('uses implicit live-region semantics without rendering text content', () => {
    const { getByRole } = renderWithPlayer(<StatusAnnouncer />);

    expect(getByRole('status').hasAttribute('aria-live')).toBe(false);
    expect(getByRole('status').textContent).toBe('');
    expect(getByRole('status').hasAttribute('class')).toBe(false);
  });

  it('updates live text from store snapshots', async () => {
    const { store, setState } = createTestStore({ paused: true });
    const { getByRole } = renderWithPlayer(<StatusAnnouncer />, store);
    await act(async () => {});

    expect(getByRole('status').textContent).toBe('');

    setState({ paused: false });
    await act(async () => {});

    expect(getByRole('status').textContent).toBe('Playing');
  });

  it('replaces live content for repeated announcement labels', async () => {
    vi.useFakeTimers();

    try {
      const { store, setState } = createTestStore({ volume: 0.5, muted: false });
      const { getByRole } = renderWithPlayer(<StatusAnnouncer />, store);
      await act(async () => {});

      setState({ volume: 0 });
      await act(async () => vi.advanceTimersByTime(200));
      const firstContent = getByRole('status').querySelector('[data-status-announcer-content]');

      setState({ muted: true });
      await act(async () => vi.advanceTimersByTime(200));
      const nextContent = getByRole('status').querySelector('[data-status-announcer-content]');

      expect(getByRole('status').textContent).toBe('Muted');
      expect(nextContent).not.toBe(firstContent);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses custom labels', async () => {
    const { store, setState } = createTestStore({ paused: true });
    const { getByRole } = renderWithPlayer(<StatusAnnouncer labels={{ playing: 'Custom playing' }} />, store);
    await act(async () => {});

    setState({ paused: false });
    await act(async () => {});

    expect(getByRole('status').textContent).toBe('Custom playing');
  });

  it('does not publish props from an abandoned render to the retained core', () => {
    const labels: string[] = [];
    const originalSetProps = StatusAnnouncerCore.prototype.setProps;
    const setProps = vi.spyOn(StatusAnnouncerCore.prototype, 'setProps').mockImplementation(function (
      this: StatusAnnouncerCore,
      props
    ) {
      if (typeof props.labels?.playing === 'string') labels.push(props.labels.playing);
      originalSetProps.call(this, props);
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const value = createPlayerContextValue(createTestStore().store);

    function Thrower({ abandon }: { abandon: boolean }) {
      if (abandon) throw new Error('abandon render');
      return null;
    }

    const { rerender } = render(
      <PlayerContextProvider value={value}>
        <Boundary>
          <StatusAnnouncer labels={{ playing: 'Committed' }} />
          <Thrower abandon={false} />
        </Boundary>
      </PlayerContextProvider>
    );

    expect(labels).toContain('Committed');

    rerender(
      <PlayerContextProvider value={value}>
        <Boundary>
          <StatusAnnouncer labels={{ playing: 'Abandoned' }} />
          <Thrower abandon />
        </Boundary>
      </PlayerContextProvider>
    );

    expect(labels).not.toContain('Abandoned');
    setProps.mockRestore();
    consoleError.mockRestore();
  });

  it('uses the next store snapshot as baseline when the store changes', async () => {
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
});

function createTestStore(initialState: Record<string, unknown> = {}) {
  let state = initialState;
  const target = {};
  const listeners = new Set<() => void>();
  const store = {
    get state() {
      return state;
    },
    get target() {
      return target;
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
