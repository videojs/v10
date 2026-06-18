import { formatDuration } from '@videojs/utils/time';
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
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(state.type).toBe('current');
    });

    it('accepts custom props', () => {
      const core = new TimeCore({ type: 'duration' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(state.type).toBe('duration');
    });
  });

  describe('getState', () => {
    it('returns current time state', () => {
      const core = new TimeCore({ type: 'current' });
      core.setMedia(createMediaState({ currentTime: 90 }));
      const state = core.getState();

      expect(state.type).toBe('current');
      expect(state.seconds).toBe(90);
      expect(state.negative).toBe(false);
      expect(state.text).toBe('1:30');
      expect(state.phrase).toBe(formatDuration(90));
      expect(state.datetime).toBe('PT1M30S');
    });

    it('returns duration state', () => {
      const core = new TimeCore({ type: 'duration' });
      core.setMedia(createMediaState({ duration: 300 }));
      const state = core.getState();

      expect(state.type).toBe('duration');
      expect(state.seconds).toBe(300);
      expect(state.negative).toBe(false);
      expect(state.text).toBe('5:00');
      expect(state.phrase).toBe(formatDuration(300));
      expect(state.datetime).toBe('PT5M');
    });

    it('returns remaining time state', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState({ currentTime: 90, duration: 300 }));
      const state = core.getState();

      expect(state.type).toBe('remaining');
      expect(state.seconds).toBe(-210); // 90 - 300
      expect(state.negative).toBe(true);
      expect(state.text).toBe('3:30');
      expect(state.phrase).toBe(formatDuration(90 - 300));
      expect(state.datetime).toBe('PT3M30S');
    });

    it('returns unsigned text regardless of negativeSign prop', () => {
      const core = new TimeCore({ type: 'remaining', negativeSign: '−' });
      core.setMedia(createMediaState({ currentTime: 90, duration: 300 }));
      const state = core.getState();

      expect(state.negative).toBe(true);
      expect(state.text).toBe('3:30');
    });

    it('is not negative when remaining time is zero', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState({ currentTime: 300, duration: 300 }));
      const state = core.getState();

      expect(state.seconds).toBe(0);
      expect(state.negative).toBe(false);
      expect(state.text).toBe('0:00');
    });

    it('shows hours when duration has hours', () => {
      const core = new TimeCore({ type: 'current' });
      core.setMedia(createMediaState({ currentTime: 90, duration: 3700 }));
      const state = core.getState();

      expect(state.text).toBe('0:01:30');
    });
  });

  describe('getLabel', () => {
    it('returns default label for current', () => {
      const core = new TimeCore({ type: 'current' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toBe('timeCurrent');
    });

    it('returns default label for duration', () => {
      const core = new TimeCore({ type: 'duration' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toBe('timeDuration');
    });

    it('returns default label for remaining', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toBe('timeRemaining');
    });

    it('returns custom string label', () => {
      const core = new TimeCore({ type: 'current', label: 'Position' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toBe('Position');
    });

    it('returns custom function label', () => {
      const core = new TimeCore({
        type: 'current',
        label: (state) => `Time: ${state.text}`,
      });
      core.setMedia(createMediaState({ currentTime: 90 }));
      const state = core.getState();
      expect(core.getLabel(state)).toBe('Time: 1:30');
    });
  });

  describe('getAttrs', () => {
    it('returns aria attributes', () => {
      const core = new TimeCore({ type: 'current' });
      core.setMedia(createMediaState({ currentTime: 90 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('timeCurrent');
      expect(attrs['aria-valuetext']).toBe(formatDuration(90));
    });

    it('includes remaining suffix in valuetext', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState({ currentTime: 90, duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('timeRemaining');
      expect(attrs['aria-valuetext']).toBe(formatDuration(90 - 300));
    });

    it('uses formatRemaining for remaining phrase when provided', () => {
      const core = new TimeCore({
        type: 'remaining',
        formatOptions: {
          locale: 'en',
          formatRemaining: (duration) => `quedan ${duration}`,
        },
      });
      core.setMedia(createMediaState({ currentTime: 60, duration: 120 }));
      const state = core.getState();

      expect(state.phrase.startsWith('quedan ')).toBe(true);
    });
  });
});
