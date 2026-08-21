import { describe, expect, it, vi } from 'vitest';
import { StatusAnnouncerCore } from '../../../core/ui/status-announcer/status-announcer-core';
import { playbackFeature } from '../../store/features/playback';
import { timeFeature } from '../../store/features/time';
import { volumeFeature } from '../../store/features/volume';
import { createTestPlayerStore } from '../../tests/test-helpers';
import { type StatusAnnouncerStore, subscribeToStatusAnnouncer } from '../status-announcer';

describe('subscribeToStatusAnnouncer', () => {
  it('uses attach updates as the snapshot baseline', async () => {
    const core = new StatusAnnouncerCore();
    const resetSnapshot = vi.spyOn(core, 'resetSnapshot');
    const { attach, setState, store } = createStore({ paused: true });
    const unsubscribe = subscribeToStatusAnnouncer(store, core);

    expect(resetSnapshot).toHaveBeenCalledTimes(1);

    attach({ paused: false });
    expect(resetSnapshot).toHaveBeenCalledTimes(2);
    await Promise.resolve();

    expect(resetSnapshot).toHaveBeenCalledTimes(2);

    expect(core.state.current.label).toBeNull();

    setState({ paused: true });

    expect(core.state.current.label).toBe('Paused');
    unsubscribe();
  });

  it('resets the snapshot baseline when the target changes', async () => {
    const core = new StatusAnnouncerCore();
    const { attach, setState, store } = createStore({ paused: true });
    attach({});
    const unsubscribe = subscribeToStatusAnnouncer(store, core);
    await Promise.resolve();

    setState({ paused: false });
    expect(core.state.current.label).toBe('Playing');

    attach({ paused: true });
    await Promise.resolve();

    expect(core.state.current.label).toBeNull();

    setState({ paused: false });
    expect(core.state.current.label).toBe('Playing');
    unsubscribe();
  });
});

function createStore(initialState: Record<string, unknown>) {
  const source = createTestPlayerStore([playbackFeature, volumeFeature, timeFeature], initialState);
  let target: unknown | null = null;
  const listeners = new Set<() => void>();
  const store: StatusAnnouncerStore = {
    get state() {
      return source.state;
    },
    get target() {
      return target;
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };

  const setState = (partial: Record<string, unknown>) => {
    source.setState(partial);
    for (const listener of listeners) listener();
  };

  return {
    store,
    attach(partial: Record<string, unknown>) {
      target = {};
      setState(partial);
    },
    setState,
  };
}
