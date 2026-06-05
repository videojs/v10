import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusAnnouncerCore } from '../status-announcer-core';
import { StatusIndicatorCore } from '../status-indicator-core';

describe('StatusIndicatorCore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('honors the optional action filter', () => {
    const core = new StatusIndicatorCore();
    core.setProps({ actions: ['toggleSubtitles'] });

    expect(core.processEvent({ action: 'togglePaused' }, { paused: false })).toBe(false);
    expect(core.processEvent({ action: 'toggleSubtitles' }, { subtitlesShowing: false })).toBe(true);
    expect(core.state.current.status).toBe('captions-on');
  });

  it('increments generation on each accepted trigger', () => {
    const core = new StatusIndicatorCore();

    core.processEvent({ action: 'togglePaused' }, { paused: false });
    core.processEvent({ action: 'togglePaused' }, { paused: false });

    expect(core.state.current.generation).toBe(2);
  });

  it('clears after the configured delay', () => {
    const core = new StatusIndicatorCore();
    core.setProps({ closeDelay: 100 });
    core.processEvent({ action: 'toggleFullscreen' }, { fullscreen: false });

    vi.advanceTimersByTime(100);

    expect(core.state.current.open).toBe(false);
    expect(core.state.current.status).toBeNull();
  });
});

describe('StatusAnnouncerCore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('announces status labels and clears them after the delay', () => {
    const core = new StatusAnnouncerCore();
    core.setProps({ closeDelay: 100 });

    expect(core.processEvent({ action: 'volumeStep', value: 0.1 }, { volume: 0.5, muted: false })).toBe(true);
    expect(core.state.current.label).toBe('Volume 60%');

    vi.advanceTimersByTime(100);
    expect(core.state.current.label).toBeNull();
  });

  it('uses the first snapshot as a baseline only', () => {
    const core = new StatusAnnouncerCore();

    expect(core.processSnapshot({ paused: false, volume: 0.5, muted: false })).toBe(false);
    expect(core.state.current.label).toBeNull();
  });

  it('announces confirmed playback, captions, fullscreen, pip, and playback-rate changes', () => {
    const core = new StatusAnnouncerCore();
    let snapshot = {
      paused: true,
      subtitlesShowing: false,
      subtitlesAvailable: true,
      fullscreen: false,
      pip: false,
      playbackRate: 1,
    };
    const process = (partial: Partial<typeof snapshot>) => {
      snapshot = { ...snapshot, ...partial };
      return core.processSnapshot(snapshot);
    };

    core.processSnapshot(snapshot);

    expect(process({ paused: false })).toBe(true);
    expect(core.state.current.label).toBe('Playing');

    expect(process({ subtitlesShowing: true })).toBe(true);
    expect(core.state.current.label).toBe('Captions on');

    expect(process({ fullscreen: true })).toBe(true);
    expect(core.state.current.label).toBe('Fullscreen');

    expect(process({ pip: true })).toBe(true);
    expect(core.state.current.label).toBe('Picture in picture');

    expect(process({ playbackRate: 1.5 })).toBe(true);
    expect(core.state.current.label).toBe('Playback rate 1.5x');
  });

  it('does not announce captions when captions are unavailable', () => {
    const core = new StatusAnnouncerCore();

    core.processSnapshot({ subtitlesShowing: false, subtitlesAvailable: false });

    expect(core.processSnapshot({ subtitlesShowing: true, subtitlesAvailable: false })).toBe(false);
    expect(core.state.current.label).toBeNull();
  });

  it('debounces volume snapshot announcements to the final value', () => {
    const core = new StatusAnnouncerCore();
    let snapshot = { volume: 0.5, muted: false };
    const process = (partial: Partial<typeof snapshot>) => {
      snapshot = { ...snapshot, ...partial };
      return core.processSnapshot(snapshot);
    };

    core.processSnapshot(snapshot);

    expect(process({ volume: 0.55 })).toBe(true);
    expect(process({ volume: 0.6 })).toBe(true);
    expect(core.state.current.label).toBeNull();

    vi.advanceTimersByTime(199);
    expect(core.state.current.label).toBeNull();

    vi.advanceTimersByTime(1);
    expect(core.state.current.label).toBe('Volume 60%');
  });

  it('announces muted volume snapshots', () => {
    const core = new StatusAnnouncerCore();
    let snapshot = { volume: 0.5, muted: false };
    const process = (partial: Partial<typeof snapshot>) => {
      snapshot = { ...snapshot, ...partial };
      return core.processSnapshot(snapshot);
    };

    core.processSnapshot(snapshot);
    process({ muted: true });

    vi.advanceTimersByTime(200);

    expect(core.state.current.label).toBe('Muted');
  });

  it('ignores regular currentTime updates and announces completed seeks once', () => {
    const core = new StatusAnnouncerCore();
    let snapshot = { currentTime: 10, duration: 120, seeking: false };
    const process = (partial: Partial<typeof snapshot>) => {
      snapshot = { ...snapshot, ...partial };
      return core.processSnapshot(snapshot);
    };

    core.processSnapshot(snapshot);

    expect(process({ currentTime: 11 })).toBe(false);
    expect(core.state.current.label).toBeNull();

    expect(process({ currentTime: 40, seeking: true })).toBe(false);
    expect(process({ currentTime: 45 })).toBe(false);
    expect(process({ seeking: false })).toBe(true);
    expect(core.state.current.label).toBeNull();

    vi.advanceTimersByTime(200);

    expect(core.state.current.label).toBe('Seeked to 45 seconds');
  });

  it('allows seek announcements to be suppressed by callers', () => {
    const core = new StatusAnnouncerCore();
    core.setProps({ shouldAnnounceSeek: () => false });
    let snapshot = { currentTime: 10, duration: 120, seeking: false };
    const process = (partial: Partial<typeof snapshot>) => {
      snapshot = { ...snapshot, ...partial };
      return core.processSnapshot(snapshot);
    };

    core.processSnapshot(snapshot);

    process({ currentTime: 45, seeking: true });
    expect(process({ seeking: false })).toBe(false);

    vi.advanceTimersByTime(200);

    expect(core.state.current.label).toBeNull();
  });

  it('allows volume announcements to be suppressed by callers', () => {
    const core = new StatusAnnouncerCore();
    core.setProps({ shouldAnnounceVolume: () => false });
    let snapshot = { volume: 0.5, muted: false };
    const process = (partial: Partial<typeof snapshot>) => {
      snapshot = { ...snapshot, ...partial };
      return core.processSnapshot(snapshot);
    };

    core.processSnapshot(snapshot);

    expect(process({ volume: 0.75 })).toBe(false);

    vi.advanceTimersByTime(200);

    expect(core.state.current.label).toBeNull();
  });
});
