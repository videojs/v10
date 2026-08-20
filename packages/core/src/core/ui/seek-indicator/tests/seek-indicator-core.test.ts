import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SeekIndicatorCore } from '../seek-indicator-core';

describe('SeekIndicatorCore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('accumulates rapid seek steps in the same direction', () => {
    const core = new SeekIndicatorCore();

    core.processEvent({ action: 'seekStep', value: 10 }, { currentTime: 30, duration: 120 });
    core.processEvent({ action: 'seekStep', value: 10 }, { currentTime: 30, duration: 120 });

    expect(core.state.current.count).toBe(2);
    expect(core.state.current.seekTotal).toBe(20);
    expect(core.state.current.value).toBe('20s');
  });

  it('clamps accumulated seek steps to the available media range', () => {
    const core = new SeekIndicatorCore();
    const snapshot = { currentTime: 115, duration: 120 };

    core.processEvent({ action: 'seekStep', value: 10 }, snapshot);
    core.processEvent({ action: 'seekStep', value: 10 }, snapshot);

    expect(core.state.current.seekTotal).toBe(10);
  });

  it('infers seek-to-percent direction and always keeps current-time text', () => {
    const core = new SeekIndicatorCore();

    core.processEvent({ action: 'seekToPercent', key: '8' }, { currentTime: 30, duration: 120 });

    expect(core.state.current.direction).toBe('forward');
    expect(core.state.current.value).toBeNull();
    expect(core.state.current.currentTime).toBe('0:30');
  });

  it('closes and resets accumulation after the configured delay', () => {
    const core = new SeekIndicatorCore();
    core.setProps({ closeDelay: 100 });
    core.processEvent({ action: 'seekStep', value: -10 }, { currentTime: 30, duration: 120 });

    vi.advanceTimersByTime(100);

    expect(core.state.current.open).toBe(false);
    expect(core.state.current.count).toBe(0);
  });
});
