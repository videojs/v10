import { describe, expect, it, vi } from 'vitest';

import type { GestureActionContext } from '../actions';
import { resolveGestureAction } from '../actions';

describe('resolveGestureAction', () => {
  it('returns a resolver for known actions', () => {
    expect(resolveGestureAction('togglePaused')).toBeTypeOf('function');
    expect(resolveGestureAction('toggleMuted')).toBeTypeOf('function');
    expect(resolveGestureAction('toggleFullscreen')).toBeTypeOf('function');
    expect(resolveGestureAction('toggleSubtitles')).toBeTypeOf('function');
    expect(resolveGestureAction('togglePiP')).toBeTypeOf('function');
    expect(resolveGestureAction('toggleControls')).toBeTypeOf('function');
    expect(resolveGestureAction('seekStep')).toBeTypeOf('function');
    expect(resolveGestureAction('volumeStep')).toBeTypeOf('function');
    expect(resolveGestureAction('speedUp')).toBeTypeOf('function');
    expect(resolveGestureAction('speedDown')).toBeTypeOf('function');
  });

  it('returns undefined for unknown actions', () => {
    expect(resolveGestureAction('nonexistent')).toBeUndefined();
  });

  it('warns in __DEV__ for unknown actions', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveGestureAction('nonexistent');
    expect(spy).toHaveBeenCalledWith('[vjs-gesture] Unknown action: "nonexistent"');
    spy.mockRestore();
  });
});

describe('togglePaused', () => {
  it('calls play when paused', () => {
    const play = vi.fn();
    const resolver = resolveGestureAction('togglePaused')!;
    resolver(ctx({ paused: true, ended: false, started: false, waiting: false, play, pause: vi.fn() }));
    expect(play).toHaveBeenCalledOnce();
  });

  it('calls pause when playing', () => {
    const pause = vi.fn();
    const resolver = resolveGestureAction('togglePaused')!;
    resolver(ctx({ paused: false, ended: false, started: true, waiting: false, play: vi.fn(), pause }));
    expect(pause).toHaveBeenCalledOnce();
  });
});

describe('toggleMuted', () => {
  it('calls toggleMuted on volume state', () => {
    const toggleMuted = vi.fn();
    const resolver = resolveGestureAction('toggleMuted')!;
    resolver(ctx({ volume: 1, muted: false, volumeAvailability: 'available', setVolume: vi.fn(), toggleMuted }));
    expect(toggleMuted).toHaveBeenCalledOnce();
  });
});

describe('toggleFullscreen', () => {
  it('calls requestFullscreen when not fullscreen', () => {
    const requestFullscreen = vi.fn();
    const resolver = resolveGestureAction('toggleFullscreen')!;
    resolver(
      ctx({
        fullscreen: false,
        fullscreenAvailability: 'available',
        requestFullscreen,
        exitFullscreen: vi.fn(),
      })
    );
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it('calls exitFullscreen when fullscreen', () => {
    const exitFullscreen = vi.fn();
    const resolver = resolveGestureAction('toggleFullscreen')!;
    resolver(
      ctx({ fullscreen: true, fullscreenAvailability: 'available', requestFullscreen: vi.fn(), exitFullscreen })
    );
    expect(exitFullscreen).toHaveBeenCalledOnce();
  });
});

describe('toggleControls', () => {
  it('calls toggleControls on controls state', () => {
    const toggleControls = vi.fn();
    const resolver = resolveGestureAction('toggleControls')!;
    resolver(ctx({ userActive: true, controlsVisible: true, toggleControls }));
    expect(toggleControls).toHaveBeenCalledOnce();
  });
});

describe('seekStep', () => {
  it('seeks by value offset', () => {
    const seek = vi.fn();
    const resolver = resolveGestureAction('seekStep')!;
    resolver(ctx({ currentTime: 10, duration: 60, seeking: false, seek }, 5));
    expect(seek).toHaveBeenCalledWith(15);
  });

  it('does nothing without value', () => {
    const seek = vi.fn();
    const resolver = resolveGestureAction('seekStep')!;
    resolver(ctx({ currentTime: 10, duration: 60, seeking: false, seek }));
    expect(seek).not.toHaveBeenCalled();
  });
});

describe('volumeStep', () => {
  it('adjusts volume by value offset', () => {
    const setVolume = vi.fn();
    const resolver = resolveGestureAction('volumeStep')!;
    resolver(ctx({ volume: 0.5, muted: false, volumeAvailability: 'available', setVolume, toggleMuted: vi.fn() }, 0.1));
    expect(setVolume).toHaveBeenCalledWith(0.6);
  });
});

describe('speedUp', () => {
  it('cycles to next playback rate', () => {
    const setPlaybackRate = vi.fn();
    const resolver = resolveGestureAction('speedUp')!;
    resolver(ctx({ playbackRates: [0.5, 1, 1.5, 2], playbackRate: 1, setPlaybackRate }));
    expect(setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it('wraps to first rate at end', () => {
    const setPlaybackRate = vi.fn();
    const resolver = resolveGestureAction('speedUp')!;
    resolver(ctx({ playbackRates: [0.5, 1, 2], playbackRate: 2, setPlaybackRate }));
    expect(setPlaybackRate).toHaveBeenCalledWith(0.5);
  });
});

describe('speedDown', () => {
  it('cycles to previous playback rate', () => {
    const setPlaybackRate = vi.fn();
    const resolver = resolveGestureAction('speedDown')!;
    resolver(ctx({ playbackRates: [0.5, 1, 1.5, 2], playbackRate: 1.5, setPlaybackRate }));
    expect(setPlaybackRate).toHaveBeenCalledWith(1);
  });

  it('wraps to last rate at beginning', () => {
    const setPlaybackRate = vi.fn();
    const resolver = resolveGestureAction('speedDown')!;
    resolver(ctx({ playbackRates: [0.5, 1, 2], playbackRate: 0.5, setPlaybackRate }));
    expect(setPlaybackRate).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock GestureActionContext. The state object's keys are spread directly
 * so selectors (which check `firstKey in state`) find them.
 */
function ctx(stateProps: Record<string, unknown>, value?: number): GestureActionContext {
  return {
    store: { state: stateProps } as unknown as GestureActionContext['store'],
    value,
    event: new Event('pointerup') as PointerEvent,
  };
}
