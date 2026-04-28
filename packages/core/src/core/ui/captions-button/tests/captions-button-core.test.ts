import { describe, expect, it, vi } from 'vitest';

import type { MediaTextTrackState } from '../../../media/state';
import type { CaptionsButtonState } from '../captions-button-core';
import { CaptionsButtonCore } from '../captions-button-core';

function createMediaState(overrides: Partial<MediaTextTrackState> = {}): MediaTextTrackState {
  return {
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    textTrackList: [],
    subtitlesShowing: false,
    toggleSubtitles: vi.fn(() => true),
    ...overrides,
  };
}

function createState(overrides: Partial<CaptionsButtonState> = {}): CaptionsButtonState {
  return {
    subtitlesShowing: false,
    availability: 'available',
    disabled: false,
    hidden: false,
    label: '',
    ...overrides,
  };
}

describe('CaptionsButtonCore', () => {
  describe('getState', () => {
    it('projects captions', () => {
      const core = new CaptionsButtonCore();
      const media = createMediaState({
        subtitlesShowing: true,
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' }],
      });
      core.setMedia(media);
      const state = core.getState();

      expect(state.subtitlesShowing).toBe(true);
    });

    it('returns available when subtitles exist', () => {
      const core = new CaptionsButtonCore();
      core.setMedia(
        createMediaState({
          textTrackList: [
            { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
            { kind: 'metadata', label: 'thumbnails', language: '', mode: 'hidden' },
          ],
        })
      );
      const state = core.getState();

      expect(state.availability).toBe('available');
      expect(state.disabled).toBe(false);
      expect(state.hidden).toBe(false);
    });

    it('marks disabled and hidden when no caption tracks are present', () => {
      const core = new CaptionsButtonCore();
      core.setMedia(
        createMediaState({ textTrackList: [{ kind: 'metadata', label: 'thumbnails', language: '', mode: 'hidden' }] })
      );
      const state = core.getState();

      expect(state.availability).toBe('unavailable');
      expect(state.disabled).toBe(true);
      expect(state.hidden).toBe(true);
    });

    it('marks disabled when the disabled prop is set', () => {
      const core = new CaptionsButtonCore({ disabled: true });
      core.setMedia(
        createMediaState({
          textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
        })
      );
      const state = core.getState();

      expect(state.disabled).toBe(true);
      expect(state.hidden).toBe(false);
    });
  });

  describe('getLabel', () => {
    it('returns Enable captions when captions are disabled', () => {
      const core = new CaptionsButtonCore();
      expect(core.getLabel(createState({ subtitlesShowing: false }))).toBe('Enable captions');
    });

    it('returns Disable captions when captions are enabled', () => {
      const core = new CaptionsButtonCore();
      expect(core.getLabel(createState({ subtitlesShowing: true }))).toBe('Disable captions');
    });

    it('returns custom string label', () => {
      const core = new CaptionsButtonCore({ label: 'Captions' });
      expect(core.getLabel(createState())).toBe('Captions');
    });

    it('returns custom function label', () => {
      const core = new CaptionsButtonCore({
        label: (state) => (state.subtitlesShowing ? 'Hide subtitles' : 'Show subtitles'),
      });
      expect(core.getLabel(createState({ subtitlesShowing: true }))).toBe('Hide subtitles');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new CaptionsButtonCore();
      const attrs = core.getAttrs(createState({ subtitlesShowing: false }));
      expect(attrs['aria-label']).toBe('Enable captions');
    });

    it('sets aria-disabled when state.disabled is true', () => {
      const core = new CaptionsButtonCore();
      const attrs = core.getAttrs(createState({ disabled: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('sets the hidden attribute when state.hidden is true', () => {
      const core = new CaptionsButtonCore();
      const attrs = core.getAttrs(createState({ hidden: true }));
      expect(attrs.hidden).toBe('');
    });
  });

  describe('toggle', () => {
    it('calls toggleSubtitles when caption tracks are present', () => {
      const core = new CaptionsButtonCore();
      const media = createMediaState({
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
      });
      core.toggle(media);
      expect(media.toggleSubtitles).toHaveBeenCalled();
    });

    it('does nothing when no caption tracks are present', () => {
      const core = new CaptionsButtonCore();
      const media = createMediaState();
      core.toggle(media);
      expect(media.toggleSubtitles).not.toHaveBeenCalled();
    });

    it('does nothing when the disabled prop is set', () => {
      const core = new CaptionsButtonCore({ disabled: true });
      const media = createMediaState({
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
      });
      core.toggle(media);
      expect(media.toggleSubtitles).not.toHaveBeenCalled();
    });
  });
});
