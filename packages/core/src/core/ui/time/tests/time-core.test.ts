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
      expect(TimeCore.defaultProps.toggle).toBe(false);
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
      expect(state.phrase).toBe('1 minute, 30 seconds');
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
      expect(state.phrase).toBe('5 minutes');
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
      expect(state.phrase).toBe('3 minutes, 30 seconds remaining');
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
      expect(core.getLabel(state)).toBe('1 minute, 30 seconds');
    });

    it('returns default label for duration', () => {
      const core = new TimeCore({ type: 'duration' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toBe('5 minutes');
    });

    it('returns default label for remaining', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toBe('3 minutes, 30 seconds remaining');
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

    it('returns toggle label for current', () => {
      const core = new TimeCore({ type: 'current', toggle: true });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toBe('1 minute, 30 seconds. Show remaining time.');
    });

    it('returns toggle label for remaining', () => {
      const core = new TimeCore({ type: 'remaining', toggle: true });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toBe('3 minutes, 30 seconds remaining. Show duration.');
    });

    it('returns elapsed action when remaining toggles from current', () => {
      const core = new TimeCore({ type: 'remaining', toggle: true });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state, 'current')).toBe('3 minutes, 30 seconds remaining. Show elapsed time.');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new TimeCore({ type: 'current' });
      core.setMedia(createMediaState({ currentTime: 90 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('1 minute, 30 seconds');
      expect(attrs).not.toHaveProperty('aria-valuetext');
    });

    it('includes remaining suffix in label', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState({ currentTime: 90, duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('3 minutes, 30 seconds remaining');
      expect(attrs).not.toHaveProperty('aria-valuetext');
    });

    it('returns button attributes when current time is toggleable', () => {
      const core = new TimeCore({ type: 'current', toggle: true });
      core.setMedia(createMediaState({ currentTime: 90 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs.role).toBe('button');
      expect(attrs.tabIndex).toBe(0);
      expect(attrs['aria-label']).toBe('1 minute, 30 seconds. Show remaining time.');
      expect(attrs).not.toHaveProperty('aria-valuetext');
    });

    it('returns button attributes when remaining time is toggleable', () => {
      const core = new TimeCore({ type: 'remaining', toggle: true });
      core.setMedia(createMediaState({ currentTime: 90, duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state, 'current');

      expect(attrs.role).toBe('button');
      expect(attrs.tabIndex).toBe(0);
      expect(attrs['aria-label']).toBe('3 minutes, 30 seconds remaining. Show elapsed time.');
      expect(attrs).not.toHaveProperty('aria-valuetext');
    });

    it('returns button attributes when duration is toggleable', () => {
      const core = new TimeCore({ type: 'duration', toggle: true });
      core.setMedia(createMediaState({ duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs.role).toBe('button');
      expect(attrs.tabIndex).toBe(0);
      expect(attrs['aria-label']).toBe('5 minutes. Show remaining time.');
    });

    it('does not return button attributes without toggle', () => {
      const core = new TimeCore({ type: 'duration' });
      core.setMedia(createMediaState({ duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs.role).toBeUndefined();
      expect(attrs.tabIndex).toBeUndefined();
    });
  });
});
