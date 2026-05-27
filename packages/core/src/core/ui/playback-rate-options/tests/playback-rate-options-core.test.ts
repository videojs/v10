import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackRateState } from '../../../media/state';
import type { PlaybackRateOptionsState } from '../playback-rate-options-core';
import { PlaybackRateOptionsCore } from '../playback-rate-options-core';

function createMediaState(overrides: Partial<MediaPlaybackRateState> = {}): MediaPlaybackRateState {
  return {
    playbackRates: [0.5, 1, 1.5, 2],
    playbackRate: 1,
    setPlaybackRate: vi.fn(),
    ...overrides,
  };
}

function createState(overrides: Partial<PlaybackRateOptionsState> = {}): PlaybackRateOptionsState {
  return {
    rate: 1,
    rates: [0.5, 1, 1.5, 2],
    disabled: false,
    label: '',
    ...overrides,
  };
}

describe('PlaybackRateOptionsCore', () => {
  describe('getState', () => {
    it('projects playbackRate and playbackRates', () => {
      const core = new PlaybackRateOptionsCore();
      const media = createMediaState({ playbackRate: 1.5, playbackRates: [1, 1.5] });
      core.setMedia(media);
      const state = core.getState();

      expect(state.rate).toBe(1.5);
      expect(state.rates).toEqual([1, 1.5]);
    });

    it('marks state disabled when no rates are available', () => {
      const core = new PlaybackRateOptionsCore();
      const media = createMediaState({ playbackRates: [] });
      core.setMedia(media);

      expect(core.getState().disabled).toBe(true);
    });
  });

  describe('getLabel', () => {
    it('returns default label with rate', () => {
      const core = new PlaybackRateOptionsCore();
      expect(core.getLabel(createState({ rate: 1.5 }))).toBe('Playback rate 1.5');
    });

    it('returns custom string label', () => {
      const core = new PlaybackRateOptionsCore({ label: 'Speed' });
      expect(core.getLabel(createState())).toBe('Speed');
    });

    it('returns custom function label', () => {
      const core = new PlaybackRateOptionsCore({
        label: (state) => `${state.rate}× speed`,
      });
      expect(core.getLabel(createState({ rate: 2 }))).toBe('2× speed');
    });
  });

  describe('getRateLabel', () => {
    it('formats rate labels by default', () => {
      const core = new PlaybackRateOptionsCore();
      expect(core.getRateLabel(1.5)).toBe('1.5×');
    });

    it('uses a custom formatter', () => {
      const core = new PlaybackRateOptionsCore({
        formatRate: (rate) => (rate === 1 ? 'Normal' : `${rate}×`),
      });

      expect(core.getRateLabel(1)).toBe('Normal');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new PlaybackRateOptionsCore();
      const attrs = core.getAttrs(createState({ rate: 1.5 }));
      expect(attrs['aria-label']).toBe('Playback rate 1.5');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new PlaybackRateOptionsCore();
      const attrs = core.getAttrs(createState({ disabled: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('select', () => {
    it('sets a rate from the available list', () => {
      const core = new PlaybackRateOptionsCore();
      const media = createMediaState();
      core.select(media, 1.5);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });

    it('does nothing when disabled', () => {
      const core = new PlaybackRateOptionsCore({ disabled: true });
      const media = createMediaState();
      core.select(media, 1.5);
      expect(media.setPlaybackRate).not.toHaveBeenCalled();
    });

    it('does nothing for unavailable rates', () => {
      const core = new PlaybackRateOptionsCore();
      const media = createMediaState();
      core.select(media, 3);
      expect(media.setPlaybackRate).not.toHaveBeenCalled();
    });
  });

  describe('selectValue', () => {
    it('sets the rate matching a menu value', () => {
      const core = new PlaybackRateOptionsCore();
      const media = createMediaState();
      core.selectValue(media, '2');
      expect(media.setPlaybackRate).toHaveBeenCalledWith(2);
    });

    it('does nothing for an unknown menu value', () => {
      const core = new PlaybackRateOptionsCore();
      const media = createMediaState();
      core.selectValue(media, '3');
      expect(media.setPlaybackRate).not.toHaveBeenCalled();
    });
  });
});
