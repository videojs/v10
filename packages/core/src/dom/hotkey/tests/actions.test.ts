import { describe, expect, it, vi } from 'vitest';

import type { HotkeyActionContext } from '../actions';
import { isToggleAction, resolveAction } from '../actions';

function mockStore(state: Record<string, unknown>) {
  return { state } as HotkeyActionContext['store'];
}

describe('resolveAction', () => {
  it('returns resolver for known actions', () => {
    expect(resolveAction('togglePaused')).toBeTypeOf('function');
    expect(resolveAction('seekStep')).toBeTypeOf('function');
    expect(resolveAction('seekToPercent')).toBeTypeOf('function');
  });

  it('returns undefined for unknown actions', () => {
    expect(resolveAction('nonexistent')).toBeUndefined();
  });

  it('warns in __DEV__ for unknown actions', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    resolveAction('nonexistent');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain('Unknown action');

    spy.mockRestore();
  });
});

describe('isToggleAction', () => {
  it('returns true for toggle actions', () => {
    expect(isToggleAction('togglePaused')).toBe(true);
    expect(isToggleAction('toggleMuted')).toBe(true);
    expect(isToggleAction('toggleFullscreen')).toBe(true);
    expect(isToggleAction('toggleSubtitles')).toBe(true);
    expect(isToggleAction('togglePiP')).toBe(true);
  });

  it('returns false for non-toggle actions', () => {
    expect(isToggleAction('seekStep')).toBe(false);
    expect(isToggleAction('volumeStep')).toBe(false);
    expect(isToggleAction('speedUp')).toBe(false);
    expect(isToggleAction('seekToPercent')).toBe(false);
  });
});

describe('togglePaused', () => {
  it('calls play() when paused', () => {
    const play = vi.fn();
    const store = mockStore({ paused: true, ended: false, started: false, waiting: false, play, pause: vi.fn() });

    resolveAction('togglePaused')!({ store, key: '' });

    expect(play).toHaveBeenCalledOnce();
  });

  it('calls pause() when playing', () => {
    const pause = vi.fn();
    const store = mockStore({ paused: false, ended: false, started: true, waiting: false, play: vi.fn(), pause });

    resolveAction('togglePaused')!({ store, key: '' });

    expect(pause).toHaveBeenCalledOnce();
  });
});

describe('toggleMuted', () => {
  it('calls toggleMuted()', () => {
    const toggleMuted = vi.fn();
    const store = mockStore({
      volume: 1,
      muted: false,
      volumeAvailability: 'available',
      setVolume: vi.fn(),
      toggleMuted,
    });

    resolveAction('toggleMuted')!({ store, key: '' });

    expect(toggleMuted).toHaveBeenCalledOnce();
  });
});

describe('toggleFullscreen', () => {
  it('calls requestFullscreen() when not fullscreen', () => {
    const requestFullscreen = vi.fn();
    const store = mockStore({
      fullscreen: false,
      fullscreenAvailability: 'available',
      requestFullscreen,
      exitFullscreen: vi.fn(),
    });

    resolveAction('toggleFullscreen')!({ store, key: '' });

    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it('calls exitFullscreen() when fullscreen', () => {
    const exitFullscreen = vi.fn();
    const store = mockStore({
      fullscreen: true,
      fullscreenAvailability: 'available',
      requestFullscreen: vi.fn(),
      exitFullscreen,
    });

    resolveAction('toggleFullscreen')!({ store, key: '' });

    expect(exitFullscreen).toHaveBeenCalledOnce();
  });
});

describe('seekStep', () => {
  it('seeks forward by value', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 10, duration: 100, seeking: false, seek });

    resolveAction('seekStep')!({ store, value: 5, key: '' });

    expect(seek).toHaveBeenCalledWith(15);
  });

  it('seeks backward by negative value', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 10, duration: 100, seeking: false, seek });

    resolveAction('seekStep')!({ store, value: -5, key: '' });

    expect(seek).toHaveBeenCalledWith(5);
  });

  it('no-ops without value', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 10, duration: 100, seeking: false, seek });

    resolveAction('seekStep')!({ store, key: '' });

    expect(seek).not.toHaveBeenCalled();
  });
});

describe('volumeStep', () => {
  it('increases volume by value', () => {
    const setVolume = vi.fn();
    const store = mockStore({
      volume: 0.5,
      muted: false,
      volumeAvailability: 'available',
      setVolume,
      toggleMuted: vi.fn(),
    });

    resolveAction('volumeStep')!({ store, value: 0.05, key: '' });

    expect(setVolume).toHaveBeenCalledWith(0.55);
  });

  it('decreases volume by negative value', () => {
    const setVolume = vi.fn();
    const store = mockStore({
      volume: 0.5,
      muted: false,
      volumeAvailability: 'available',
      setVolume,
      toggleMuted: vi.fn(),
    });

    resolveAction('volumeStep')!({ store, value: -0.05, key: '' });

    expect(setVolume).toHaveBeenCalledWith(0.45);
  });
});

describe('speedUp', () => {
  it('steps to next rate', () => {
    const setPlaybackRate = vi.fn();
    const store = mockStore({ playbackRates: [1, 1.5, 2], playbackRate: 1, setPlaybackRate });

    resolveAction('speedUp')!({ store, key: '' });

    expect(setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it('wraps to first rate at end', () => {
    const setPlaybackRate = vi.fn();
    const store = mockStore({ playbackRates: [1, 1.5, 2], playbackRate: 2, setPlaybackRate });

    resolveAction('speedUp')!({ store, key: '' });

    expect(setPlaybackRate).toHaveBeenCalledWith(1);
  });
});

describe('speedDown', () => {
  it('steps to previous rate', () => {
    const setPlaybackRate = vi.fn();
    const store = mockStore({ playbackRates: [1, 1.5, 2], playbackRate: 1.5, setPlaybackRate });

    resolveAction('speedDown')!({ store, key: '' });

    expect(setPlaybackRate).toHaveBeenCalledWith(1);
  });

  it('wraps to last rate at beginning', () => {
    const setPlaybackRate = vi.fn();
    const store = mockStore({ playbackRates: [1, 1.5, 2], playbackRate: 1, setPlaybackRate });

    resolveAction('speedDown')!({ store, key: '' });

    expect(setPlaybackRate).toHaveBeenCalledWith(2);
  });
});

describe('seekToPercent', () => {
  it('seeks to explicit value percentage', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 0, duration: 200, seeking: false, seek });

    resolveAction('seekToPercent')!({ store, value: 50, key: '' });

    expect(seek).toHaveBeenCalledWith(100);
  });

  it('derives percentage from digit key', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 0, duration: 200, seeking: false, seek });

    resolveAction('seekToPercent')!({ store, key: '3' });

    expect(seek).toHaveBeenCalledWith(60);
  });

  it('no-ops for non-digit key without value', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 0, duration: 200, seeking: false, seek });

    resolveAction('seekToPercent')!({ store, key: 'k' });

    expect(seek).not.toHaveBeenCalled();
  });

  it('no-ops when duration is 0', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 0, duration: 0, seeking: false, seek });

    resolveAction('seekToPercent')!({ store, value: 50, key: '' });

    expect(seek).not.toHaveBeenCalled();
  });
});
