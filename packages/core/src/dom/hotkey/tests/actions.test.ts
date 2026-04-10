import { describe, expect, it, vi } from 'vitest';

import type { HotkeyActionContext } from '../actions';
import { isHotkeyToggleAction, resolveHotkeyAction } from '../actions';

function mockStore(state: Record<string, unknown>) {
  return { state } as HotkeyActionContext['store'];
}

describe('resolveHotkeyAction', () => {
  it('returns resolver for known actions', () => {
    expect(resolveHotkeyAction('togglePaused')).toBeTypeOf('function');
    expect(resolveHotkeyAction('seekStep')).toBeTypeOf('function');
    expect(resolveHotkeyAction('seekToPercent')).toBeTypeOf('function');
  });

  it('returns undefined for unknown actions', () => {
    expect(resolveHotkeyAction('nonexistent')).toBeUndefined();
  });

  it('warns in __DEV__ for unknown actions', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    resolveHotkeyAction('nonexistent');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain('Unknown action');

    spy.mockRestore();
  });
});

describe('isHotkeyToggleAction', () => {
  it('returns true for toggle actions', () => {
    expect(isHotkeyToggleAction('togglePaused')).toBe(true);
    expect(isHotkeyToggleAction('toggleMuted')).toBe(true);
    expect(isHotkeyToggleAction('toggleFullscreen')).toBe(true);
    expect(isHotkeyToggleAction('toggleSubtitles')).toBe(true);
    expect(isHotkeyToggleAction('togglePiP')).toBe(true);
  });

  it('returns false for non-toggle actions', () => {
    expect(isHotkeyToggleAction('seekStep')).toBe(false);
    expect(isHotkeyToggleAction('volumeStep')).toBe(false);
    expect(isHotkeyToggleAction('speedUp')).toBe(false);
    expect(isHotkeyToggleAction('seekToPercent')).toBe(false);
  });
});

describe('togglePaused', () => {
  it('calls play() when paused', () => {
    const play = vi.fn();
    const store = mockStore({ paused: true, ended: false, started: false, waiting: false, play, pause: vi.fn() });

    resolveHotkeyAction('togglePaused')!({ store, key: '' });

    expect(play).toHaveBeenCalledOnce();
  });

  it('calls pause() when playing', () => {
    const pause = vi.fn();
    const store = mockStore({ paused: false, ended: false, started: true, waiting: false, play: vi.fn(), pause });

    resolveHotkeyAction('togglePaused')!({ store, key: '' });

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

    resolveHotkeyAction('toggleMuted')!({ store, key: '' });

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

    resolveHotkeyAction('toggleFullscreen')!({ store, key: '' });

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

    resolveHotkeyAction('toggleFullscreen')!({ store, key: '' });

    expect(exitFullscreen).toHaveBeenCalledOnce();
  });
});

describe('seekStep', () => {
  it('seeks forward by value', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 10, duration: 100, seeking: false, seek });

    resolveHotkeyAction('seekStep')!({ store, value: 5, key: '' });

    expect(seek).toHaveBeenCalledWith(15);
  });

  it('seeks backward by negative value', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 10, duration: 100, seeking: false, seek });

    resolveHotkeyAction('seekStep')!({ store, value: -5, key: '' });

    expect(seek).toHaveBeenCalledWith(5);
  });

  it('no-ops without value', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 10, duration: 100, seeking: false, seek });

    resolveHotkeyAction('seekStep')!({ store, key: '' });

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

    resolveHotkeyAction('volumeStep')!({ store, value: 0.05, key: '' });

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

    resolveHotkeyAction('volumeStep')!({ store, value: -0.05, key: '' });

    expect(setVolume).toHaveBeenCalledWith(0.45);
  });
});

describe('speedUp', () => {
  it('steps to next rate', () => {
    const setPlaybackRate = vi.fn();
    const store = mockStore({ playbackRates: [1, 1.5, 2], playbackRate: 1, setPlaybackRate });

    resolveHotkeyAction('speedUp')!({ store, key: '' });

    expect(setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it('wraps to first rate at end', () => {
    const setPlaybackRate = vi.fn();
    const store = mockStore({ playbackRates: [1, 1.5, 2], playbackRate: 2, setPlaybackRate });

    resolveHotkeyAction('speedUp')!({ store, key: '' });

    expect(setPlaybackRate).toHaveBeenCalledWith(1);
  });
});

describe('speedDown', () => {
  it('steps to previous rate', () => {
    const setPlaybackRate = vi.fn();
    const store = mockStore({ playbackRates: [1, 1.5, 2], playbackRate: 1.5, setPlaybackRate });

    resolveHotkeyAction('speedDown')!({ store, key: '' });

    expect(setPlaybackRate).toHaveBeenCalledWith(1);
  });

  it('wraps to last rate at beginning', () => {
    const setPlaybackRate = vi.fn();
    const store = mockStore({ playbackRates: [1, 1.5, 2], playbackRate: 1, setPlaybackRate });

    resolveHotkeyAction('speedDown')!({ store, key: '' });

    expect(setPlaybackRate).toHaveBeenCalledWith(2);
  });
});

describe('seekToPercent', () => {
  it('seeks to explicit value percentage', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 0, duration: 200, seeking: false, seek });

    resolveHotkeyAction('seekToPercent')!({ store, value: 50, key: '' });

    expect(seek).toHaveBeenCalledWith(100);
  });

  it('derives percentage from digit key', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 0, duration: 200, seeking: false, seek });

    resolveHotkeyAction('seekToPercent')!({ store, key: '3' });

    expect(seek).toHaveBeenCalledWith(60);
  });

  it('no-ops for non-digit key without value', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 0, duration: 200, seeking: false, seek });

    resolveHotkeyAction('seekToPercent')!({ store, key: 'k' });

    expect(seek).not.toHaveBeenCalled();
  });

  it('no-ops when duration is 0', () => {
    const seek = vi.fn();
    const store = mockStore({ currentTime: 0, duration: 0, seeking: false, seek });

    resolveHotkeyAction('seekToPercent')!({ store, value: 50, key: '' });

    expect(seek).not.toHaveBeenCalled();
  });
});
