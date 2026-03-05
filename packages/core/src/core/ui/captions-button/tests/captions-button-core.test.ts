import { describe, expect, it, vi } from 'vitest';

import type { MediaTextTrackState } from '../../../media/state';
import type { CaptionsButtonState } from '../captions-button-core';
import { CaptionsButtonCore } from '../captions-button-core';

function createMediaState(overrides: Partial<MediaTextTrackState> = {}): MediaTextTrackState {
  return {
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    subtitlesList: [],
    subtitlesShowing: false,
    toggleSubtitles: vi.fn(() => true),
    ...overrides,
  };
}

function createState(overrides: Partial<CaptionsButtonState> = {}): CaptionsButtonState {
  return {
    subtitlesShowing: false,
    availability: 'available',
    ...overrides,
  };
}

describe('CaptionsButtonCore', () => {
  describe('getState', () => {
    it('projects captions', () => {
      const core = new CaptionsButtonCore();
      const media = createMediaState({
        subtitlesShowing: true,
        subtitlesList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' }],
      });
      core.setMedia(media);
      const state = core.getState();

      expect(state.subtitlesShowing).toBe(true);
    });

    it('returns available when subtitles exist', () => {
      const core = new CaptionsButtonCore();
      core.setMedia(
        createMediaState({
          subtitlesList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
        })
      );

      expect(core.getState().availability).toBe('available');
    });

    it('returns unavailable when no subtitles', () => {
      const core = new CaptionsButtonCore();
      core.setMedia(createMediaState({ subtitlesList: [] }));

      expect(core.getState().availability).toBe('unavailable');
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

    it('sets aria-disabled when disabled', () => {
      const core = new CaptionsButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('toggle', () => {
    it('calls toggleSubtitles when available', () => {
      const core = new CaptionsButtonCore();
      const media = createMediaState();
      core.toggle(media);
      expect(media.toggleSubtitles).toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
      const core = new CaptionsButtonCore({ disabled: true });
      const media = createMediaState();
      core.toggle(media);
      expect(media.toggleSubtitles).not.toHaveBeenCalled();
    });
  });
});
