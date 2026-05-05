import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackRateState } from '../../../media/state';
import type { PlaybackRateButtonState } from '../playback-rate-button-core';
import { PlaybackRateButtonCore } from '../playback-rate-button-core';

function createMediaState(overrides: Partial<MediaPlaybackRateState> = {}): MediaPlaybackRateState {
  return {
    playbackRates: [0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2],
    playbackRate: 1,
    setPlaybackRate: vi.fn(),
    ...overrides,
  };
}

function createState(overrides: Partial<PlaybackRateButtonState> = {}): PlaybackRateButtonState {
  return {
    rate: 1,
    label: '',
    rateMin: 0.2,
    rateMax: 2,
    ...overrides,
  };
}

describe('PlaybackRateButtonCore', () => {
  describe('getState', () => {
    it('projects playbackRate to rate', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRate: 1.5 });
      core.setMedia(media);
      const state = core.getState();

      expect(state.rate).toBe(1.5);
    });

    it('derives rate bounds from playbackRates', () => {
      const core = new PlaybackRateButtonCore();
      core.setMedia(createMediaState());
      const state = core.getState();

      expect(state.rateMin).toBe(0.2);
      expect(state.rateMax).toBe(2);
    });

    it('leaves rate bounds undefined when playbackRates is empty', () => {
      const core = new PlaybackRateButtonCore();
      core.setMedia(createMediaState({ playbackRates: [], playbackRate: 1 }));
      const state = core.getState();

      expect(state.rateMin).toBeUndefined();
      expect(state.rateMax).toBeUndefined();
    });
  });

  describe('getLabel', () => {
    it('returns default label without embedding the rate', () => {
      const core = new PlaybackRateButtonCore();
      expect(core.getLabel(createState({ rate: 1.5 }))).toBe('Playback speed');
    });

    it('returns default label for rate 1', () => {
      const core = new PlaybackRateButtonCore();
      expect(core.getLabel(createState({ rate: 1 }))).toBe('Playback speed');
    });

    it('returns custom string label', () => {
      const core = new PlaybackRateButtonCore({ label: 'Speed' });
      expect(core.getLabel(createState())).toBe('Speed');
    });

    it('returns custom function label', () => {
      const core = new PlaybackRateButtonCore({
        label: (state) => `${state.rate}x speed`,
      });
      expect(core.getLabel(createState({ rate: 2 }))).toBe('2x speed');
    });

    it('falls back to default when function returns empty string', () => {
      const core = new PlaybackRateButtonCore({
        label: () => '',
      });
      expect(core.getLabel(createState({ rate: 1.5 }))).toBe('Playback speed');
    });
  });

  describe('getAttrs', () => {
    it('uses aria-label Playback speed with matching valuenow and valuetext for fractional rates', () => {
      const core = new PlaybackRateButtonCore();
      const attrs = core.getAttrs(createState({ rate: 1.25, rateMin: 0.5, rateMax: 2 }));

      expect(attrs['aria-label']).toBe('Playback speed');
      expect(attrs['aria-valuenow']).toBe('1.25');
      expect(attrs['aria-valuetext']).toBe('1.25×');
    });

    it('exposes spinbutton semantics and value', () => {
      const core = new PlaybackRateButtonCore();
      const attrs = core.getAttrs(createState({ rate: 1.5, rateMin: 0.2, rateMax: 2 }));

      expect(attrs.role).toBe('spinbutton');
      expect(attrs['aria-label']).toBe('Playback speed');
      expect(attrs['aria-valuenow']).toBe('1.5');
      expect(attrs['aria-valuetext']).toBe('1.5×');
      expect(attrs['aria-valuemin']).toBe('0.2');
      expect(attrs['aria-valuemax']).toBe('2');
    });

    it('formats valuemin and valuemax with the same rounding as valuenow', () => {
      const core = new PlaybackRateButtonCore();
      const imprecise = 0.1 + 0.2;
      const attrs = core.getAttrs(createState({ rate: imprecise, rateMin: imprecise, rateMax: 2 }));

      expect(attrs['aria-valuenow']).toBe('0.3');
      expect(attrs['aria-valuemin']).toBe('0.3');
      expect(attrs['aria-valuemax']).toBe('2');
    });

    it('omits valuemin and valuemax when bounds are unknown', () => {
      const core = new PlaybackRateButtonCore();
      const attrs = core.getAttrs(createState({ rate: 1, rateMin: undefined, rateMax: undefined }));

      expect(attrs['aria-valuemin']).toBeUndefined();
      expect(attrs['aria-valuemax']).toBeUndefined();
    });

    it('sets aria-disabled when disabled', () => {
      const core = new PlaybackRateButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('does not set aria-disabled when not disabled', () => {
      const core = new PlaybackRateButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBeUndefined();
    });
  });

  describe('cycle', () => {
    it('advances to the next rate', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRate: 1 });
      core.cycle(media);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(1.2);
    });

    it('wraps to the first rate after the last', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRate: 2 });
      core.cycle(media);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(0.2);
    });

    it('advances through the middle of the list', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRate: 1.5 });
      core.cycle(media);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(1.7);
    });

    it('finds the first rate greater than current when not in list', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRate: 0.3 });
      core.cycle(media);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(0.5);
    });

    it('finds the next greater rate when between list values', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRate: 1.3 });
      core.cycle(media);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });

    it('wraps to first rate when current is above all rates and not in list', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRate: 3 });
      core.cycle(media);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(0.2);
    });

    it('cycles through sub-1x rates', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRate: 0.2 });
      core.cycle(media);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(0.5);
    });

    it('does nothing when disabled', () => {
      const core = new PlaybackRateButtonCore({ disabled: true });
      const media = createMediaState();
      core.cycle(media);
      expect(media.setPlaybackRate).not.toHaveBeenCalled();
    });

    it('does nothing when playbackRates is empty', () => {
      const core = new PlaybackRateButtonCore();
      const media = createMediaState({ playbackRates: [] });
      core.cycle(media);
      expect(media.setPlaybackRate).not.toHaveBeenCalled();
    });
  });
});
