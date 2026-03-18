import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../../media/state';
import { PlayGestureCore } from '../play-gesture-core';

function createMediaState(overrides: Partial<MediaPlaybackState> = {}): MediaPlaybackState {
  return {
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    play: vi.fn(),
    pause: vi.fn(),
    ...overrides,
  } as MediaPlaybackState;
}

describe('PlayGestureCore', () => {
  it('does nothing when media is not set', () => {
    const core = new PlayGestureCore();

    expect(() => core.handleGesture()).not.toThrow();
  });

  it('calls play when paused', () => {
    const media = createMediaState({ paused: true, ended: false });
    const core = new PlayGestureCore();

    core.setMedia(media);
    core.handleGesture();

    expect(media.play).toHaveBeenCalledTimes(1);
    expect(media.pause).not.toHaveBeenCalled();
  });

  it('calls play when ended', () => {
    const media = createMediaState({ paused: false, ended: true });
    const core = new PlayGestureCore();

    core.setMedia(media);
    core.handleGesture();

    expect(media.play).toHaveBeenCalledTimes(1);
    expect(media.pause).not.toHaveBeenCalled();
  });

  it('calls pause when currently playing', () => {
    const media = createMediaState({ paused: false, ended: false });
    const core = new PlayGestureCore();

    core.setMedia(media);
    core.handleGesture();

    expect(media.pause).toHaveBeenCalledTimes(1);
    expect(media.play).not.toHaveBeenCalled();
  });

  it('accepts props without side effects', () => {
    const core = new PlayGestureCore();

    expect(() => core.setProps({})).not.toThrow();
  });
});
