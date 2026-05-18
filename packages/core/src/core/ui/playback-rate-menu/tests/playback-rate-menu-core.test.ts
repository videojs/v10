import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackRateState } from '../../../media/state';
import type { PlaybackRateMenuState } from '../playback-rate-menu-core';
import { PlaybackRateMenuCore } from '../playback-rate-menu-core';

function createMediaState(overrides: Partial<MediaPlaybackRateState> = {}): MediaPlaybackRateState {
  return {
    playbackRates: [0.5, 1, 1.5, 2],
    playbackRate: 1,
    setPlaybackRate: vi.fn(),
    ...overrides,
  };
}

function createState(overrides: Partial<PlaybackRateMenuState> = {}): PlaybackRateMenuState {
  return {
    rate: 1,
    rates: [0.5, 1, 1.5, 2],
    disabled: false,
    label: '',
    ...overrides,
  };
}

describe('PlaybackRateMenuCore', () => {
  describe('getState', () => {
    it('projects playbackRate and playbackRates', () => {
      const core = new PlaybackRateMenuCore();
      const media = createMediaState({ playbackRate: 1.5, playbackRates: [1, 1.5] });
      core.setMedia(media);
      const state = core.getState();

      expect(state.rate).toBe(1.5);
      expect(state.rates).toEqual([1, 1.5]);
    });

    it('marks state disabled when no rates are available', () => {
      const core = new PlaybackRateMenuCore();
      const media = createMediaState({ playbackRates: [] });
      core.setMedia(media);

      expect(core.getState().disabled).toBe(true);
    });
  });

  describe('getLabel', () => {
    it('returns default label with rate', () => {
      const core = new PlaybackRateMenuCore();
      expect(core.getLabel(createState({ rate: 1.5 }))).toBe('Playback rate 1.5');
    });

    it('returns custom string label', () => {
      const core = new PlaybackRateMenuCore({ label: 'Speed' });
      expect(core.getLabel(createState())).toBe('Speed');
    });

    it('returns custom function label', () => {
      const core = new PlaybackRateMenuCore({
        label: (state) => `${state.rate}× speed`,
      });
      expect(core.getLabel(createState({ rate: 2 }))).toBe('2× speed');
    });
  });

  describe('getRateLabel', () => {
    it('formats rate labels by default', () => {
      const core = new PlaybackRateMenuCore();
      expect(core.getRateLabel(1.5)).toBe('1.5×');
    });

    it('uses a custom formatter', () => {
      const core = new PlaybackRateMenuCore({
        formatRate: (rate) => (rate === 1 ? 'Normal' : `${rate}×`),
      });

      expect(core.getRateLabel(1)).toBe('Normal');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new PlaybackRateMenuCore();
      const attrs = core.getAttrs(createState({ rate: 1.5 }));
      expect(attrs['aria-label']).toBe('Playback rate 1.5');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new PlaybackRateMenuCore();
      const attrs = core.getAttrs(createState({ disabled: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('select', () => {
    it('sets a rate from the available list', () => {
      const core = new PlaybackRateMenuCore();
      const media = createMediaState();
      core.select(media, 1.5);
      expect(media.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });

    it('does nothing when disabled', () => {
      const core = new PlaybackRateMenuCore({ disabled: true });
      const media = createMediaState();
      core.select(media, 1.5);
      expect(media.setPlaybackRate).not.toHaveBeenCalled();
    });

    it('does nothing for unavailable rates', () => {
      const core = new PlaybackRateMenuCore();
      const media = createMediaState();
      core.select(media, 3);
      expect(media.setPlaybackRate).not.toHaveBeenCalled();
    });
  });

  describe('selectValue', () => {
    it('sets the rate matching a menu value', () => {
      const core = new PlaybackRateMenuCore();
      const media = createMediaState();
      core.selectValue(media, '2');
      expect(media.setPlaybackRate).toHaveBeenCalledWith(2);
    });

    it('does nothing for an unknown menu value', () => {
      const core = new PlaybackRateMenuCore();
      const media = createMediaState();
      core.selectValue(media, '3');
      expect(media.setPlaybackRate).not.toHaveBeenCalled();
    });
  });
});
