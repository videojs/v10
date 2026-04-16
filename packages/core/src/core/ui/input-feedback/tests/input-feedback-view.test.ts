import { describe, expect, it } from 'vitest';

import { InputFeedbackCore } from '../input-feedback-core';
import type { InputFeedbackItemDataState } from '../input-feedback-item';
import {
  getCurrentInputFeedbackVolumeLevel,
  getInputFeedbackPredictedVolumeState,
  getInputFeedbackRootDerivedState,
  getInputFeedbackValueText,
} from '../input-feedback-view';

const DEFAULT_CURRENT_VALUES = {
  volume: '55%',
  captions: 'Captions off',
  seek: '0:30',
  playback: 'Paused',
};

const DEFAULT_ITEM_STATE: InputFeedbackItemDataState = {
  active: false,
  action: null,
  group: null,
  generation: 0,
  region: 'center',
  direction: null,
  paused: null,
  volumeLevel: null,
  captions: null,
  boundary: null,
  value: null,
  transitionStarting: false,
  transitionEnding: false,
};

describe('input-feedback-view', () => {
  describe('getInputFeedbackPredictedVolumeState', () => {
    it('uses the last rendered volume label during rapid keyboard repeats', () => {
      const result = getInputFeedbackPredictedVolumeState(
        { action: 'volumeStep', value: 0.05 },
        {
          active: true,
          action: 'volumeStep',
          region: null,
          direction: 'forward',
          count: 1,
          seekTotal: 0,
          generation: 1,
          label: '60%',
          paused: null,
          volumeLevel: 'high',
          fullscreen: null,
          captions: null,
          pip: null,
          boundary: null,
          volumeLabel: '60%',
          captionsLabel: null,
        },
        { volume: 0.5, muted: false }
      );

      expect(result).toEqual({ volume: 0.6, muted: false });
    });

    it('falls back to the live volume state for non-volume actions', () => {
      const result = getInputFeedbackPredictedVolumeState(
        { action: 'togglePaused' },
        {
          active: true,
          action: 'togglePaused',
          region: null,
          direction: null,
          count: 1,
          seekTotal: 0,
          generation: 1,
          label: null,
          paused: true,
          volumeLevel: null,
          fullscreen: null,
          captions: null,
          pip: null,
          boundary: null,
          volumeLabel: '60%',
          captionsLabel: null,
        },
        { volume: 0.5, muted: false }
      );

      expect(result).toEqual({ volume: 0.5, muted: false });
    });
  });

  describe('getInputFeedbackRootDerivedState', () => {
    it('keeps the active volume label for the displayed progress', () => {
      const result = getInputFeedbackRootDerivedState(
        {
          active: true,
          action: 'volumeStep',
          region: 'center',
          direction: 'forward',
          count: 1,
          seekTotal: 0,
          generation: 1,
          label: '80%',
          paused: null,
          volumeLevel: 'high',
          fullscreen: null,
          captions: null,
          pip: null,
          boundary: null,
          volumeLabel: '80%',
          captionsLabel: null,
        },
        InputFeedbackCore.defaultLabels,
        {
          playback: { paused: false },
          textTrack: { subtitlesShowing: true },
          time: { currentTime: 30, duration: 120 },
          volume: { volume: 0.55, muted: false },
        }
      );

      expect(result.volumePercentage).toBe('80%');
      expect(result.currentVolumeLevel).toBe('high');
      expect(result.currentValues).toEqual({
        volume: '55%',
        captions: 'Captions on',
        seek: '0:30',
        playback: 'Playing',
      });
    });
  });

  describe('getInputFeedbackValueText', () => {
    it('falls back to the live current value for the item group', () => {
      expect(
        getInputFeedbackValueText(
          {
            ...DEFAULT_ITEM_STATE,
            group: 'captions',
          },
          DEFAULT_CURRENT_VALUES
        )
      ).toBe('Captions off');
    });

    it('prefers the item payload value when present', () => {
      expect(
        getInputFeedbackValueText(
          {
            ...DEFAULT_ITEM_STATE,
            group: 'seek',
            value: '20s',
          },
          DEFAULT_CURRENT_VALUES
        )
      ).toBe('20s');
    });
  });

  describe('getCurrentInputFeedbackVolumeLevel', () => {
    it('maps muted volume to off', () => {
      expect(getCurrentInputFeedbackVolumeLevel({ volume: 0.5, muted: true })).toBe('off');
    });
  });
});
