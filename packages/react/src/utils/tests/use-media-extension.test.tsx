import { cleanup, render } from '@testing-library/react';
import { getMediaExtensions } from '@videojs/media/dom';
import { MuxDataExtension } from '@videojs/mux-data';
import { MuxVideoAdapter } from '@videojs/mux-video';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { PlayerContextProvider } from '../../player/context';
import { createPlayerWrapper } from '../../testing/mocks';
import { useMediaExtension } from '../use-media-extension';

function Extension() {
  useMediaExtension(MuxDataExtension);
  return null;
}

describe('useMediaExtension', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers on context media, unregisters immediately, and destroys after unmount', () => {
    const media = new MuxVideoAdapter();
    const { value } = createPlayerWrapper();
    const { unmount } = render(
      <PlayerContextProvider value={{ ...value, media }}>
        <Extension />
      </PlayerContextProvider>
    );
    const component = getMediaExtensions(media).get(MuxDataExtension)!;

    expect(component).toBeInstanceOf(MuxDataExtension);
    const destroy = vi.spyOn(component, 'destroy');

    unmount();
    expect(getMediaExtensions(media).get(MuxDataExtension)).toBeUndefined();
    expect(destroy).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(destroy).toHaveBeenCalledOnce();
    media.destroy();
  });

  it('ignores media that is not an adapter', () => {
    const media = document.createElement('video');
    const { value } = createPlayerWrapper();

    render(
      <PlayerContextProvider value={{ ...value, media }}>
        <Extension />
      </PlayerContextProvider>
    );

    // SAFETY: The registry accepts object keys; this probes the non-adapter guard.
    expect(getMediaExtensions(media as any).get(MuxDataExtension)).toBeUndefined();
  });

  it('transfers the same extension on media changes and survives adapter destruction until unmount', () => {
    const first = new MuxVideoAdapter();
    const second = new MuxVideoAdapter();
    const third = new MuxVideoAdapter();
    const { value } = createPlayerWrapper();
    const { rerender, unmount } = render(
      <PlayerContextProvider value={{ ...value, media: first }}>
        <Extension />
      </PlayerContextProvider>
    );
    const component = getMediaExtensions(first).get(MuxDataExtension)!;

    expect(component).toBeInstanceOf(MuxDataExtension);
    const destroy = vi.spyOn(component, 'destroy');

    rerender(
      <PlayerContextProvider value={{ ...value, media: second }}>
        <Extension />
      </PlayerContextProvider>
    );
    expect(getMediaExtensions(first).get(MuxDataExtension)).toBeUndefined();
    expect(getMediaExtensions(second).get(MuxDataExtension)).toBe(component);
    vi.runAllTimers();
    expect(destroy).not.toHaveBeenCalled();

    second.destroy();
    expect(getMediaExtensions(second).get(MuxDataExtension)).toBeUndefined();
    expect(destroy).not.toHaveBeenCalled();

    rerender(
      <PlayerContextProvider value={{ ...value, media: third }}>
        <Extension />
      </PlayerContextProvider>
    );
    expect(getMediaExtensions(third).get(MuxDataExtension)).toBe(component);
    expect(destroy).not.toHaveBeenCalled();

    unmount();
    expect(getMediaExtensions(third).get(MuxDataExtension)).toBeUndefined();
    expect(destroy).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(destroy).toHaveBeenCalledOnce();
    first.destroy();
    third.destroy();
  });
});
