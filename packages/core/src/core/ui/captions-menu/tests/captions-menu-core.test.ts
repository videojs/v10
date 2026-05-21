import { describe, expect, it, vi } from 'vitest';

import type { MediaTextTrackState } from '../../../media/state';
import type { CaptionsMenuState } from '../captions-menu-core';
import { CaptionsMenuCore } from '../captions-menu-core';

function createMediaState(overrides: Partial<MediaTextTrackState> = {}): MediaTextTrackState {
  return {
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    textTrackList: [],
    subtitlesShowing: false,
    toggleSubtitles: vi.fn(() => true),
    selectTextTrack: vi.fn(() => true),
    ...overrides,
  };
}

function createState(overrides: Partial<CaptionsMenuState> = {}): CaptionsMenuState {
  return {
    tracks: [],
    selectedTrackIndex: null,
    subtitlesShowing: false,
    availability: 'available',
    disabled: false,
    label: '',
    ...overrides,
  };
}

describe('CaptionsMenuCore', () => {
  describe('getState', () => {
    it('projects caption and subtitle tracks with source indexes', () => {
      const core = new CaptionsMenuCore();
      const media = createMediaState({
        textTrackList: [
          { kind: 'metadata', label: 'thumbnails', language: '', mode: 'hidden' },
          { kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
          { kind: 'captions', label: 'CC', language: 'en', mode: 'disabled' },
        ],
        subtitlesShowing: true,
      });

      core.setMedia(media);
      const state = core.getState();

      expect(state.tracks).toEqual([
        { kind: 'subtitles', label: 'English', language: 'en', mode: 'showing', index: 1 },
        { kind: 'captions', label: 'CC', language: 'en', mode: 'disabled', index: 2 },
      ]);
      expect(state.selectedTrackIndex).toBe(1);
      expect(state.subtitlesShowing).toBe(true);
      expect(state.availability).toBe('available');
    });

    it('marks state disabled when no caption or subtitle tracks are available', () => {
      const core = new CaptionsMenuCore();
      core.setMedia(
        createMediaState({ textTrackList: [{ kind: 'metadata', label: '', language: '', mode: 'hidden' }] })
      );

      const state = core.getState();

      expect(state.availability).toBe('unavailable');
      expect(state.disabled).toBe(true);
    });
  });

  describe('getLabel', () => {
    it('returns default label with the selected track', () => {
      const core = new CaptionsMenuCore();
      const state = createState({
        selectedTrackIndex: 0,
        tracks: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'showing', index: 0 }],
      });

      expect(core.getLabel(state)).toBe('Captions, English');
    });

    it('returns default off label when no track is selected', () => {
      const core = new CaptionsMenuCore();
      expect(core.getLabel(createState())).toBe('Captions, Off');
    });

    it('returns custom string label', () => {
      const core = new CaptionsMenuCore({ label: 'Subtitles' });
      expect(core.getLabel(createState())).toBe('Subtitles');
    });

    it('returns custom function label', () => {
      const core = new CaptionsMenuCore({
        label: (state) => (state.subtitlesShowing ? 'Hide captions menu' : 'Show captions menu'),
      });
      expect(core.getLabel(createState({ subtitlesShowing: true }))).toBe('Hide captions menu');
    });
  });

  describe('getTrackLabel', () => {
    it('uses track label by default', () => {
      const core = new CaptionsMenuCore();
      expect(
        core.getTrackLabel({ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled', index: 0 })
      ).toBe('English');
    });

    it('uses a custom formatter', () => {
      const core = new CaptionsMenuCore({
        formatTrack: (track) => `${track.language.toUpperCase()} ${track.kind}`,
      });

      expect(core.getTrackLabel({ kind: 'captions', label: 'CC', language: 'en', mode: 'disabled', index: 0 })).toBe(
        'EN captions'
      );
    });
  });

  describe('getMenuSectionLabel', () => {
    it('returns the default section label', () => {
      expect(new CaptionsMenuCore().getMenuSectionLabel()).toBe('Captions');
    });

    it('returns a custom section label', () => {
      expect(new CaptionsMenuCore({ menuSectionLabel: 'Subtitles' }).getMenuSectionLabel()).toBe('Subtitles');
    });

    it('prefixes the default trigger label using the section label', () => {
      const core = new CaptionsMenuCore({ menuSectionLabel: 'Subtitles' });
      const state = createState({
        selectedTrackIndex: 0,
        tracks: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'showing', index: 0 }],
      });
      expect(core.getLabel(state)).toBe('Subtitles, English');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new CaptionsMenuCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-label']).toBe('Captions, Off');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new CaptionsMenuCore();
      const attrs = core.getAttrs(createState({ disabled: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('select', () => {
    it('selects an available caption track by source index', () => {
      const core = new CaptionsMenuCore();
      const media = createMediaState({
        textTrackList: [
          { kind: 'metadata', label: '', language: '', mode: 'hidden' },
          { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
        ],
      });

      core.select(media, 1);

      expect(media.selectTextTrack).toHaveBeenCalledWith(1);
    });

    it('selects off', () => {
      const core = new CaptionsMenuCore();
      const media = createMediaState();

      core.select(media, null);

      expect(media.selectTextTrack).toHaveBeenCalledWith(null);
    });

    it('does nothing when disabled', () => {
      const core = new CaptionsMenuCore({ disabled: true });
      const media = createMediaState();

      core.select(media, null);

      expect(media.selectTextTrack).not.toHaveBeenCalled();
    });

    it('does nothing for unavailable tracks', () => {
      const core = new CaptionsMenuCore();
      const media = createMediaState({
        textTrackList: [{ kind: 'metadata', label: '', language: '', mode: 'hidden' }],
      });

      core.select(media, 0);

      expect(media.selectTextTrack).not.toHaveBeenCalled();
    });
  });

  describe('selectValue', () => {
    it('selects the track matching a menu value', () => {
      const core = new CaptionsMenuCore();
      const media = createMediaState({
        textTrackList: [
          { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
          { kind: 'captions', label: 'CC', language: 'en', mode: 'disabled' },
        ],
      });

      core.selectValue(media, '1');

      expect(media.selectTextTrack).toHaveBeenCalledWith(1);
    });

    it('selects off from the off menu value', () => {
      const core = new CaptionsMenuCore();
      const media = createMediaState();

      core.selectValue(media, 'off');

      expect(media.selectTextTrack).toHaveBeenCalledWith(null);
    });

    it('does nothing for an unknown menu value', () => {
      const core = new CaptionsMenuCore();
      const media = createMediaState();

      core.selectValue(media, 'unknown');

      expect(media.selectTextTrack).not.toHaveBeenCalled();
    });
  });
});
