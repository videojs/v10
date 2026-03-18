import { describe, expect, it, vi } from 'vitest';

import type { HotkeysMedia } from '../hotkeys-core';
import { HotkeysCore } from '../hotkeys-core';

function createMedia(overrides: HotkeysMedia = {}): Required<HotkeysMedia> {
  return {
    // playback
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    playbackRate: 1,
    playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    play: vi.fn(),
    pause: vi.fn(),
    setPlaybackRate: vi.fn(),

    // time
    currentTime: 100,
    duration: 1000,
    seeking: false,
    seek: vi.fn(),

    // buffer (seekable range)
    buffered: [],
    seekable: [[0, 1000]],

    // volume
    volume: 0.5,
    muted: false,
    setVolume: vi.fn(),
    toggleMuted: vi.fn(),

    // fullscreen
    fullscreen: false,
    requestFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),

    // text tracks
    subtitles: false,
    toggleSubtitles: vi.fn(),

    ...overrides,
  } as Required<HotkeysMedia>;
}

describe('HotkeysCore', () => {
  it('toggles play when paused/ended on space and k', () => {
    const core = new HotkeysCore();
    const media = createMedia({ paused: true, ended: false });

    core.setMedia(media);

    expect(core.handleKeydown(' ')).toBe(true);
    expect(media.play).toHaveBeenCalledTimes(1);

    expect(core.handleKeydown('k')).toBe(true);
    expect(media.play).toHaveBeenCalledTimes(2);
    expect(media.pause).not.toHaveBeenCalled();
  });

  it('toggles pause when currently playing', () => {
    const core = new HotkeysCore();
    const media = createMedia({ paused: false, ended: false });

    core.setMedia(media);

    expect(core.handleKeydown('k')).toBe(true);
    expect(media.pause).toHaveBeenCalledTimes(1);
    expect(media.play).not.toHaveBeenCalled();
  });

  it('seeks with arrow and j/l shortcuts', () => {
    const core = new HotkeysCore();
    const media = createMedia({ currentTime: 100 });

    core.setMedia(media);

    expect(core.handleKeydown('ArrowLeft')).toBe(true);
    expect(media.seek).toHaveBeenCalledWith(95);

    expect(core.handleKeydown('ArrowRight')).toBe(true);
    expect(media.seek).toHaveBeenCalledWith(105);

    expect(core.handleKeydown('j')).toBe(true);
    expect(media.seek).toHaveBeenCalledWith(90);

    expect(core.handleKeydown('l')).toBe(true);
    expect(media.seek).toHaveBeenCalledWith(110);
  });

  it('changes volume and clamps between 0 and 1', () => {
    const core = new HotkeysCore();
    const low = createMedia({ volume: 0.01 });
    const high = createMedia({ volume: 0.99 });

    core.setMedia(low);
    expect(core.handleKeydown('ArrowDown')).toBe(true);
    expect(low.setVolume).toHaveBeenCalledWith(0);

    core.setMedia(high);
    expect(core.handleKeydown('ArrowUp')).toBe(true);
    expect(high.setVolume).toHaveBeenCalledWith(1);
  });

  it('toggles muted with m', () => {
    const core = new HotkeysCore();
    const media = createMedia();

    core.setMedia(media);

    expect(core.handleKeydown('m')).toBe(true);
    expect(media.toggleMuted).toHaveBeenCalledTimes(1);
  });

  it('toggles fullscreen with f', () => {
    const core = new HotkeysCore();
    const off = createMedia({ fullscreen: false });
    const on = createMedia({ fullscreen: true });

    core.setMedia(off);
    expect(core.handleKeydown('f')).toBe(true);
    expect(off.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(off.exitFullscreen).not.toHaveBeenCalled();

    core.setMedia(on);
    expect(core.handleKeydown('f')).toBe(true);
    expect(on.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(on.requestFullscreen).not.toHaveBeenCalled();
  });

  it('toggles captions with c', () => {
    const core = new HotkeysCore();
    const media = createMedia();

    core.setMedia(media);

    expect(core.handleKeydown('c')).toBe(true);
    expect(media.toggleSubtitles).toHaveBeenCalledTimes(1);
  });

  it('changes playback rate with < and > and clamps range', () => {
    const core = new HotkeysCore();
    const min = createMedia({ playbackRate: 0.25 });
    const max = createMedia({ playbackRate: 2 });

    core.setMedia(min);
    expect(core.handleKeydown('<')).toBe(true);
    expect(min.setPlaybackRate).toHaveBeenCalledWith(0.25);

    core.setMedia(max);
    expect(core.handleKeydown('>')).toBe(true);
    expect(max.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('returns false for unknown keys', () => {
    const core = new HotkeysCore();
    const media = createMedia();

    core.setMedia(media);

    expect(core.handleKeydown('x')).toBe(false);
  });

  it('returns false when required media methods are missing', () => {
    const core = new HotkeysCore();

    core.setMedia({ paused: true, ended: false });
    expect(core.handleKeydown('k')).toBe(false);

    core.setMedia({ currentTime: 10 });
    expect(core.handleKeydown('ArrowRight')).toBe(false);

    core.setMedia({ volume: 0.5 });
    expect(core.handleKeydown('ArrowUp')).toBe(false);

    core.setMedia({ fullscreen: false });
    expect(core.handleKeydown('f')).toBe(false);

    core.setMedia({ playbackRate: 1 });
    expect(core.handleKeydown('>')).toBe(false);
  });
});
