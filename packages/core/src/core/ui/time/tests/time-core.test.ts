import type { MediaTimeState } from '@videojs/media';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import { describe, expect, it } from 'vitest';

import { createTranslator, flattenTranslations, translateText, translations } from '../../../i18n';
import { TimeCore } from '../time-core';

const t = createTranslator(flattenTranslations(translations), 'en');

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
      expect(state.phrase).toBe(formatTimeAsPhrase(90));
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
      expect(state.phrase).toBe(formatTimeAsPhrase(300));
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
      expect(state.phrase).toBe(formatTimeAsPhrase(90 - 300));
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

    it('formats digital time with locale digits', () => {
      const core = new TimeCore({ type: 'current' });
      core.setFormatLocale('fa');
      core.setMedia(createMediaState({ currentTime: 90 }));

      expect(core.getState().text).toBe('۱:۳۰');
    });
  });

  describe('getLabel', () => {
    it('returns default label for current', () => {
      const core = new TimeCore({ type: 'current' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toMatchObject({ key: 'time.current', text: 'Current time' });
    });

    it('returns default label for duration', () => {
      const core = new TimeCore({ type: 'duration' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toMatchObject({ key: 'time.duration', text: 'Duration' });
    });

    it('returns default label for remaining', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toMatchObject({ key: 'time.remaining', text: 'Remaining' });
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
      expect(core.getLabel(state)).toMatchObject({
        key: 'time.showRemaining',
        text: 'Show remaining time, {duration}.',
      });
      expect(core.getLabelParams(state)).toEqual({ duration: '1 minute, 30 seconds elapsed' });
      expect(translateText(core.getLabel(state), t, core.getLabelParams(state))).toBe(
        'Show remaining time, 1 minute, 30 seconds elapsed.'
      );
    });

    it.each([
      ['current', { currentTime: 0 }, 'Show remaining time, 0 seconds elapsed.'],
      ['duration', { duration: 0 }, 'Show remaining time, 0 seconds duration.'],
      ['remaining', { currentTime: 300 }, 'Show duration, 0 seconds remaining.'],
    ] as const)('includes zero in the %s toggle label', (type, media, expected) => {
      const core = new TimeCore({ type, toggle: true });
      core.setMedia(createMediaState(media));
      const state = core.getState();

      expect(translateText(core.getLabel(state), t, core.getLabelParams(state))).toBe(expected);
    });

    it('returns toggle label for remaining', () => {
      const core = new TimeCore({ type: 'remaining', toggle: true });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state)).toMatchObject({ key: 'time.showDuration', text: 'Show duration, {duration}.' });
      expect(core.getLabelParams(state)).toEqual({ duration: '3 minutes, 30 seconds remaining' });
      expect(translateText(core.getLabel(state), t, core.getLabelParams(state))).toBe(
        'Show duration, 3 minutes, 30 seconds remaining.'
      );
    });

    it('returns elapsed action when remaining toggles from current', () => {
      const core = new TimeCore({ type: 'remaining', toggle: true });
      core.setMedia(createMediaState());
      const state = core.getState();
      expect(core.getLabel(state, 'current')).toMatchObject({
        key: 'time.showElapsed',
        text: 'Show elapsed time, {duration}.',
      });
      expect(translateText(core.getLabel(state, 'current'), t, core.getLabelParams(state))).toBe(
        'Show elapsed time, 3 minutes, 30 seconds remaining.'
      );
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new TimeCore({ type: 'current' });
      core.setMedia(createMediaState({ currentTime: 90 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toMatchObject({ key: 'time.current', text: 'Current time' });
    });

    it('includes remaining suffix in label', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState({ currentTime: 90, duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toMatchObject({ key: 'time.remaining', text: 'Remaining' });
    });

    it('returns toggle attributes for current time', () => {
      const core = new TimeCore({ type: 'current', toggle: true });
      core.setMedia(createMediaState({ currentTime: 90 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toMatchObject({
        key: 'time.showRemaining',
        text: 'Show remaining time, {duration}.',
      });
      expect(attrs['aria-description']).toMatchObject({
        key: 'time.toggleElapsed',
        text: 'Toggle between elapsed and remaining time.',
      });
      expect(attrs.role).toBe('button');
      expect(attrs.tabIndex).toBe(0);
      expect(core.getLabelParams(state)).toEqual({ duration: '1 minute, 30 seconds elapsed' });
    });

    it('returns toggle attributes for remaining time', () => {
      const core = new TimeCore({ type: 'remaining', toggle: true });
      core.setMedia(createMediaState({ currentTime: 90, duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state, 'current');

      expect(attrs['aria-label']).toMatchObject({
        key: 'time.showElapsed',
        text: 'Show elapsed time, {duration}.',
      });
      expect(attrs['aria-description']).toMatchObject({
        key: 'time.toggleElapsed',
        text: 'Toggle between elapsed and remaining time.',
      });
      expect(attrs.role).toBe('button');
      expect(attrs.tabIndex).toBe(0);
      expect(core.getLabelParams(state)).toEqual({ duration: '3 minutes, 30 seconds remaining' });
    });

    it('returns toggle attributes for duration', () => {
      const core = new TimeCore({ type: 'duration', toggle: true });
      core.setMedia(createMediaState({ duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toMatchObject({
        key: 'time.showRemaining',
        text: 'Show remaining time, {duration}.',
      });
      expect(attrs['aria-description']).toMatchObject({
        key: 'time.toggleDuration',
        text: 'Toggle between duration and remaining time.',
      });
      expect(attrs.role).toBe('button');
      expect(attrs.tabIndex).toBe(0);
      expect(core.getLabelParams(state)).toEqual({ duration: '5 minutes duration' });
    });

    it('does not return a description without toggle', () => {
      const core = new TimeCore({ type: 'duration' });
      core.setMedia(createMediaState({ duration: 300 }));
      const state = core.getState();
      const attrs = core.getAttrs(state);

      expect(attrs['aria-description']).toBeUndefined();
      expect(attrs.role).toBeUndefined();
      expect(attrs.tabIndex).toBeUndefined();
    });

    it('uses the default remaining phrase', () => {
      const core = new TimeCore({ type: 'remaining' });
      core.setMedia(createMediaState({ currentTime: 60, duration: 120 }));
      const state = core.getState();

      expect(state.phrase).toBe(formatTimeAsPhrase(-60));
    });
  });
});
