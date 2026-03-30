import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../signals/primitives';
import type { AddressableObject, Presentation } from '../../types';
import { syncPreloadAttribute } from '../sync-preload-attribute';

describe('syncPreloadAttribute', () => {
  it('syncs preload from mediaElement to state', async () => {
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    interface Owners {
      mediaElement?: HTMLMediaElement | undefined;
    }

    const state = signal<State>({
      presentation: undefined,
      preload: undefined,
    });

    // Start with media element already set
    const video = { preload: 'auto' } as HTMLMediaElement;
    const owners = signal<Owners>({
      mediaElement: video,
    });

    // Sync should pick up existing mediaElement on first effect fire (synchronous)
    const cleanup = syncPreloadAttribute({ state, owners });

    expect(state.get().preload).toBe('auto');

    cleanup();
  });

  it('does not override preload when mediaElement changes and preload is already set', async () => {
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    interface Owners {
      mediaElement?: HTMLMediaElement | undefined;
    }

    const state = signal<State>({
      presentation: undefined,
      preload: undefined,
    });

    const video = { preload: 'auto' } as HTMLMediaElement;
    const owners = signal<Owners>({
      mediaElement: video,
    });

    // Start syncing — initial inference from element (synchronous)
    const cleanup = syncPreloadAttribute({ state, owners });

    expect(state.get().preload).toBe('auto');

    // Swap to a different mediaElement with a different preload value.
    // Since preload is already set, the new element's value is ignored.
    const updatedVideo = { preload: 'metadata' } as HTMLMediaElement;
    owners.set({ ...owners.get(), mediaElement: updatedVideo });

    await vi.waitFor(() => {
      // preload should remain 'auto' — new element's value is not applied once preload is set
      expect(state.get().preload).toBe('auto');
    });

    cleanup();
  });

  it('does not clear preload when mediaElement is removed and preload is already set', async () => {
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    interface Owners {
      mediaElement?: HTMLMediaElement | undefined;
    }

    const state = signal<State>({
      presentation: undefined,
      preload: 'auto',
    });

    const owners = signal<Owners>({
      mediaElement: undefined,
    });

    const cleanup = syncPreloadAttribute({ state, owners });

    owners.set({ ...owners.get(), mediaElement: undefined });

    // Preload was already set — removing the element does not clear it.
    expect(state.get().preload).toBe('auto');

    cleanup();
  });
});
