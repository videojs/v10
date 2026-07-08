import { describe, expect, it, vi } from 'vitest';

import type { MediaTextTrackState } from '../../../media/state';
import { CAPTIONS_OFF_VALUE, CaptionsRadioGroupCore, type CaptionsRadioGroupState } from '../captions-radio-group-core';

function createMediaState(overrides: Partial<MediaTextTrackState> = {}): MediaTextTrackState {
  return {
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    textTrackList: [],
    subtitlesShowing: false,
    toggleSubtitles: vi.fn(() => true),
    selectSubtitlesTrack: vi.fn(),
    ...overrides,
  };
}

function createState(overrides: Partial<CaptionsRadioGroupState> = {}): CaptionsRadioGroupState {
  return {
    tracks: [],
    value: CAPTIONS_OFF_VALUE,
    subtitlesShowing: false,
    disabled: false,
    availability: 'unavailable',
    label: '',
    ...overrides,
  };
}

describe('CaptionsRadioGroupCore', () => {
  describe('getState', () => {
    it('projects caption tracks and the active value', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        subtitlesShowing: true,
        textTrackList: [
          { id: 'subtitles-en', kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
          { id: 'captions-en', kind: 'captions', label: 'CC', language: 'en', mode: 'disabled' },
          { id: 'subtitles-es', kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'disabled' },
        ],
      });
      core.setMedia(media);
      const state = core.getState();

      expect(state.tracks).toEqual([
        { value: 'captions-en', label: 'CC' },
        { value: 'subtitles-en', label: 'English' },
        { value: 'subtitles-es', label: 'Spanish' },
      ]);
      expect(state.value).toBe('subtitles-en');
      expect(state.subtitlesShowing).toBe(true);
    });

    it('marks state disabled when no caption tracks are available', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [{ kind: 'metadata', label: 'thumbnails', language: '', mode: 'hidden' }],
      });
      core.setMedia(media);

      expect(core.getState().disabled).toBe(true);
    });

    it('marks availability unavailable when no caption tracks are available', () => {
      const core = new CaptionsRadioGroupCore();
      core.setMedia(createMediaState());

      expect(core.getState().availability).toBe('unavailable');
    });

    it('marks availability available when caption tracks exist', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
      });
      core.setMedia(media);

      expect(core.getState().availability).toBe('available');
    });

    it('uses off when no track is showing', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [
          { kind: 'captions', label: 'English', language: 'en', mode: 'disabled' },
          { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'disabled' },
        ],
      });
      core.setMedia(media);

      expect(core.getState().value).toBe(CAPTIONS_OFF_VALUE);
    });
  });

  describe('getLabel', () => {
    it('returns default labels based on showing state', () => {
      const core = new CaptionsRadioGroupCore();
      expect(core.getLabel(createState({ subtitlesShowing: false }))).toBe('Enable captions');
      expect(core.getLabel(createState({ subtitlesShowing: true }))).toBe('Disable captions');
    });

    it('returns custom string label', () => {
      const core = new CaptionsRadioGroupCore({ label: 'Captions' });
      expect(core.getLabel(createState())).toBe('Captions');
    });

    it('returns custom function label', () => {
      const core = new CaptionsRadioGroupCore({
        label: (state) => (state.subtitlesShowing ? 'Hide subtitles' : 'Show subtitles'),
      });
      expect(core.getLabel(createState({ subtitlesShowing: true }))).toBe('Hide subtitles');
    });
  });

  describe('getTrackLabel', () => {
    it('formats track labels by default', () => {
      const core = new CaptionsRadioGroupCore();
      expect(
        core.getTrackLabel({
          kind: 'subtitles',
          label: 'English',
          language: 'en',
          mode: 'disabled',
        })
      ).toBe('English');
      expect(core.getTrackLabel({ kind: 'subtitles', label: '', language: 'es', mode: 'disabled' })).toBe('es');
      expect(core.getTrackLabel({ kind: 'captions', label: '', language: '', mode: 'disabled' })).toBe('Captions');
    });

    it('adds default labels for unlabeled tracks', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [
          { id: 'captions-en', kind: 'captions', label: '', language: '', mode: 'disabled' },
          { id: 'subtitles-en', kind: 'subtitles', label: '', language: '', mode: 'disabled' },
        ],
      });

      core.setMedia(media);

      expect(core.getState().tracks).toEqual([
        { value: 'captions-en', label: 'Captions' },
        { value: 'subtitles-en', label: 'Subtitles' },
      ]);
    });

    it('uses a custom formatter', () => {
      const core = new CaptionsRadioGroupCore({
        formatTrack: (track) => `${track.language.toUpperCase()} subtitles`,
      });

      expect(
        core.getTrackLabel({
          kind: 'subtitles',
          label: 'English',
          language: 'en',
          mode: 'disabled',
        })
      ).toBe('EN subtitles');
    });
  });

  describe('select', () => {
    it('selects a track from the available list', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [
          { id: 'subtitles-en', kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
          { id: 'subtitles-es', kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'disabled' },
        ],
      });
      core.select(media, 'subtitles-es');
      expect(media.selectSubtitlesTrack).toHaveBeenCalledWith('subtitles-es');
    });

    it('turns captions off', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' }],
      });
      core.select(media, CAPTIONS_OFF_VALUE);
      expect(media.selectSubtitlesTrack).toHaveBeenCalledWith(CAPTIONS_OFF_VALUE);
    });

    it('does nothing when disabled', () => {
      const core = new CaptionsRadioGroupCore({ disabled: true });
      const media = createMediaState({
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
      });
      core.select(media, 'subtitles-en');
      expect(media.selectSubtitlesTrack).not.toHaveBeenCalled();
    });

    it('does nothing for unavailable tracks', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
      });
      core.select(media, 'subtitles-es');
      expect(media.selectSubtitlesTrack).not.toHaveBeenCalled();
    });
  });
});
