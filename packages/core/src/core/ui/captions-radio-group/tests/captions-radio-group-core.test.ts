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
          { kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
          { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'disabled' },
        ],
      });
      core.setMedia(media);
      const state = core.getState();

      expect(state.tracks).toEqual([
        { value: '0', label: 'English' },
        { value: '1', label: 'Spanish' },
      ]);
      expect(state.value).toBe('0');
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
      expect(core.getTrackLabel({ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' })).toBe(
        'English'
      );
      expect(core.getTrackLabel({ kind: 'subtitles', label: '', language: 'es', mode: 'disabled' })).toBe('es');
      expect(core.getTrackLabel({ kind: 'captions', label: '', language: '', mode: 'disabled' })).toBe('Captions');
    });

    it('uses a custom formatter', () => {
      const core = new CaptionsRadioGroupCore({
        formatTrack: (track) => `${track.language.toUpperCase()} subtitles`,
      });

      expect(core.getTrackLabel({ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' })).toBe(
        'EN subtitles'
      );
    });
  });

  describe('select', () => {
    it('selects a track from the available list', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [
          { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
          { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'disabled' },
        ],
      });
      core.select(media, '1');
      expect(media.selectSubtitlesTrack).toHaveBeenCalledWith('1');
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
      core.select(media, '0');
      expect(media.selectSubtitlesTrack).not.toHaveBeenCalled();
    });

    it('does nothing for unavailable tracks', () => {
      const core = new CaptionsRadioGroupCore();
      const media = createMediaState({
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
      });
      core.select(media, '2');
      expect(media.selectSubtitlesTrack).not.toHaveBeenCalled();
    });
  });
});
