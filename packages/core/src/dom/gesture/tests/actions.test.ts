import { describe, expect, it, vi } from 'vitest';

import type { GestureActionContext } from '../actions';
import { resolveGestureAction } from '../actions';

describe('resolveGestureAction', () => {
  it('returns a resolver for override actions', () => {
    expect(resolveGestureAction('seekStep')).toBeTypeOf('function');
    expect(resolveGestureAction('volumeStep')).toBeTypeOf('function');
    expect(resolveGestureAction('speedUp')).toBeTypeOf('function');
    expect(resolveGestureAction('speedDown')).toBeTypeOf('function');
  });

  it('returns a resolver for direct store actions', () => {
    expect(resolveGestureAction('togglePaused')).toBeTypeOf('function');
    expect(resolveGestureAction('toggleMuted')).toBeTypeOf('function');
    expect(resolveGestureAction('toggleFullscreen')).toBeTypeOf('function');
    expect(resolveGestureAction('toggleSubtitles')).toBeTypeOf('function');
    expect(resolveGestureAction('togglePictureInPicture')).toBeTypeOf('function');
    expect(resolveGestureAction('toggleControls')).toBeTypeOf('function');
  });

  it('always returns a resolver (warns for unknown in __DEV__)', () => {
    const resolver = resolveGestureAction('nonexistent');
    expect(resolver).toBeTypeOf('function');

    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolver!(ctx({}));
    expect(spy).toHaveBeenCalledWith('[vjs-gesture] Unknown action: "nonexistent"');
    spy.mockRestore();
  });
});

describe('direct store actions', () => {
  it('calls togglePaused on store state', () => {
    const togglePaused = vi.fn();
    resolveGestureAction('togglePaused')!(ctx({ togglePaused }));
    expect(togglePaused).toHaveBeenCalledOnce();
  });

  it('calls toggleMuted on store state', () => {
    const toggleMuted = vi.fn();
    resolveGestureAction('toggleMuted')!(ctx({ toggleMuted }));
    expect(toggleMuted).toHaveBeenCalledOnce();
  });

  it('calls toggleFullscreen on store state', () => {
    const toggleFullscreen = vi.fn();
    resolveGestureAction('toggleFullscreen')!(ctx({ toggleFullscreen }));
    expect(toggleFullscreen).toHaveBeenCalledOnce();
  });

  it('calls toggleControls on store state', () => {
    const toggleControls = vi.fn();
    resolveGestureAction('toggleControls')!(ctx({ toggleControls }));
    expect(toggleControls).toHaveBeenCalledOnce();
  });

  it('calls toggleSubtitles on store state', () => {
    const toggleSubtitles = vi.fn();
    resolveGestureAction('toggleSubtitles')!(ctx({ toggleSubtitles }));
    expect(toggleSubtitles).toHaveBeenCalledOnce();
  });

  it('calls togglePictureInPicture on store state', () => {
    const togglePictureInPicture = vi.fn();
    resolveGestureAction('togglePictureInPicture')!(ctx({ togglePictureInPicture }));
    expect(togglePictureInPicture).toHaveBeenCalledOnce();
  });
});

describe('seekStep', () => {
  it('seeks by value offset', () => {
    const seek = vi.fn();
    resolveGestureAction('seekStep')!(ctx({ currentTime: 10, duration: 60, seeking: false, seek }, 5));
    expect(seek).toHaveBeenCalledWith(15);
  });

  it('does nothing without value', () => {
    const seek = vi.fn();
    resolveGestureAction('seekStep')!(ctx({ currentTime: 10, duration: 60, seeking: false, seek }));
    expect(seek).not.toHaveBeenCalled();
  });
});

describe('volumeStep', () => {
  it('adjusts volume by value offset', () => {
    const setVolume = vi.fn();
    resolveGestureAction('volumeStep')!(
      ctx({ volume: 0.5, muted: false, volumeAvailability: 'available', setVolume, toggleMuted: vi.fn() }, 0.1)
    );
    expect(setVolume).toHaveBeenCalledWith(0.6);
  });
});

describe('speedUp', () => {
  it('cycles to next playback rate', () => {
    const setPlaybackRate = vi.fn();
    resolveGestureAction('speedUp')!(ctx({ playbackRates: [0.5, 1, 1.5, 2], playbackRate: 1, setPlaybackRate }));
    expect(setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it('wraps to first rate at end', () => {
    const setPlaybackRate = vi.fn();
    resolveGestureAction('speedUp')!(ctx({ playbackRates: [0.5, 1, 2], playbackRate: 2, setPlaybackRate }));
    expect(setPlaybackRate).toHaveBeenCalledWith(0.5);
  });
});

describe('speedDown', () => {
  it('cycles to previous playback rate', () => {
    const setPlaybackRate = vi.fn();
    resolveGestureAction('speedDown')!(ctx({ playbackRates: [0.5, 1, 1.5, 2], playbackRate: 1.5, setPlaybackRate }));
    expect(setPlaybackRate).toHaveBeenCalledWith(1);
  });

  it('wraps to last rate at beginning', () => {
    const setPlaybackRate = vi.fn();
    resolveGestureAction('speedDown')!(ctx({ playbackRates: [0.5, 1, 2], playbackRate: 0.5, setPlaybackRate }));
    expect(setPlaybackRate).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ctx(stateProps: Record<string, unknown>, value?: number): GestureActionContext {
  return {
    store: { state: stateProps } as unknown as GestureActionContext['store'],
    value,
    event: new Event('pointerup') as PointerEvent,
  };
}
