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
});
