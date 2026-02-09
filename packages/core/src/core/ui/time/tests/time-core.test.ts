import { describe, expect, it } from 'vitest';

import type { MediaTimeState } from '../../../media/state';
import { TimeCore } from '../time-core';

function createMediaState(overrides: Partial<MediaTimeState> = {}): MediaTimeState {
  return {
    currentTime: 90,
    duration: 300,
    seeking: false,
    seek: async () => 0,
    ...overrides,
  };
}

describe('TimeCore', () => {
  describe('setProps', () => {
    it('uses default props', () => {
      const core = new TimeCore();
      const state = core.getState(createMediaState());
      expect(state.type).toBe('current');
    });

    it('accepts custom props', () => {
      const core = new TimeCore({ type: 'duration' });
      const state = core.getState(createMediaState());
      expect(state.type).toBe('duration');
    });
  });

  describe('getState', () => {
    it('returns current time state', () => {
      const core = new TimeCore({ type: 'current' });
      const state = core.getState(createMediaState({ currentTime: 90 }));

      expect(state.type).toBe('current');
      expect(state.seconds).toBe(90);
      expect(state.negative).toBe(false);
      expect(state.text).toBe('1:30');
      expect(state.phrase).toBe('1 minute, 30 seconds');
      expect(state.datetime).toBe('PT1M30S');
    });

    it('returns duration state', () => {
      const core = new TimeCore({ type: 'duration' });
      const state = core.getState(createMediaState({ duration: 300 }));

      expect(state.type).toBe('duration');
      expect(state.seconds).toBe(300);
      expect(state.negative).toBe(false);
      expect(state.text).toBe('5:00');
      expect(state.phrase).toBe('5 minutes');
      expect(state.datetime).toBe('PT5M');
    });

    it('returns remaining time state', () => {
      const core = new TimeCore({ type: 'remaining' });
      const state = core.getState(createMediaState({ currentTime: 90, duration: 300 }));

      expect(state.type).toBe('remaining');
      expect(state.seconds).toBe(-210); // 90 - 300
      expect(state.negative).toBe(true);
      expect(state.text).toBe('3:30');
      expect(state.phrase).toBe('3 minutes, 30 seconds remaining');
      expect(state.datetime).toBe('PT3M30S');
    });

    it('returns unsigned text regardless of negativeSign prop', () => {
      const core = new TimeCore({ type: 'remaining', negativeSign: '−' });
      const state = core.getState(createMediaState({ currentTime: 90, duration: 300 }));

      expect(state.negative).toBe(true);
      expect(state.text).toBe('3:30');
    });

    it('is not negative when remaining time is zero', () => {
      const core = new TimeCore({ type: 'remaining' });
      const state = core.getState(createMediaState({ currentTime: 300, duration: 300 }));

      expect(state.seconds).toBe(0);
      expect(state.negative).toBe(false);
      expect(state.text).toBe('0:00');
    });

    it('shows hours when duration has hours', () => {
      const core = new TimeCore({ type: 'current' });
      const state = core.getState(createMediaState({ currentTime: 90, duration: 3700 }));

      expect(state.text).toBe('0:01:30');
    });
  });

  describe('getLabel', () => {
    it('returns default label for current', () => {
      const core = new TimeCore({ type: 'current' });
      const state = core.getState(createMediaState());
      expect(core.getLabel(state)).toBe('Current time');
    });

    it('returns default label for duration', () => {
      const core = new TimeCore({ type: 'duration' });
      const state = core.getState(createMediaState());
      expect(core.getLabel(state)).toBe('Duration');
    });

    it('returns default label for remaining', () => {
      const core = new TimeCore({ type: 'remaining' });
      const state = core.getState(createMediaState());
      expect(core.getLabel(state)).toBe('Remaining');
    });

    it('returns custom string label', () => {
      const core = new TimeCore({ type: 'current', label: 'Position' });
      const state = core.getState(createMediaState());
      expect(core.getLabel(state)).toBe('Position');
    });

    it('returns custom function label', () => {
      const core = new TimeCore({
        type: 'current',
        label: (state) => `Time: ${state.text}`,
      });
      const state = core.getState(createMediaState({ currentTime: 90 }));
      expect(core.getLabel(state)).toBe('Time: 1:30');
    });
  });

  describe('getAttrs', () => {
    it('returns aria attributes', () => {
      const core = new TimeCore({ type: 'current' });
      const state = core.getState(createMediaState({ currentTime: 90 }));
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Current time');
      expect(attrs['aria-valuetext']).toBe('1 minute, 30 seconds');
    });

    it('includes remaining suffix in valuetext', () => {
      const core = new TimeCore({ type: 'remaining' });
      const state = core.getState(createMediaState({ currentTime: 90, duration: 300 }));
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Remaining');
      expect(attrs['aria-valuetext']).toBe('3 minutes, 30 seconds remaining');
    });
  });
});
