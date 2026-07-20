import { describe, expect, it, vi } from 'vitest';

import type { MediaAudioTrackState } from '../../../media/state';
import type { AudioTrackRadioGroupState } from '../audio-track-radio-group-core';
import { AudioTrackRadioGroupCore } from '../audio-track-radio-group-core';

function createMediaState(overrides: Partial<MediaAudioTrackState> = {}): MediaAudioTrackState {
  return {
    audioTrackList: [
      { id: '0', kind: 'main', label: 'English', language: 'en', enabled: true },
      { id: '1', kind: 'alternative', label: 'Spanish', language: 'es', enabled: false },
    ],
    selectAudioTrack: vi.fn(),
    ...overrides,
  };
}

function createState(overrides: Partial<AudioTrackRadioGroupState> = {}): AudioTrackRadioGroupState {
  return {
    tracks: [
      { value: '0', label: 'English' },
      { value: '1', label: 'Spanish' },
    ],
    value: '0',
    disabled: false,
    availability: 'available',
    label: '',
    ...overrides,
  };
}

describe('AudioTrackRadioGroupCore', () => {
  describe('getState', () => {
    it('projects audio tracks', () => {
      const core = new AudioTrackRadioGroupCore();
      const media = createMediaState();
      core.setMedia(media);

      const state = core.getState();

      expect(state.tracks).toEqual([
        { value: '0', label: 'English' },
        { value: '1', label: 'Spanish' },
      ]);
      expect(state.value).toBe('0');
    });

    it('falls back to language, kind, then Audio labels', () => {
      const core = new AudioTrackRadioGroupCore();
      const media = createMediaState({
        audioTrackList: [
          { id: '0', kind: 'main', label: '', language: 'en', enabled: true },
          { id: '1', kind: 'commentary', label: '', language: '', enabled: false },
          { id: '2', label: '', language: '', enabled: false },
        ],
      });
      core.setMedia(media);

      expect(core.getState().tracks).toEqual([
        { value: '0', label: 'en' },
        { value: '1', label: 'commentary' },
        { value: '2', label: 'Audio' },
      ]);
    });

    it('uses index values when ids are missing', () => {
      const core = new AudioTrackRadioGroupCore();
      const media = createMediaState({
        audioTrackList: [
          { label: 'English', language: 'en', enabled: false },
          { label: 'Spanish', language: 'es', enabled: true },
        ],
      });
      core.setMedia(media);

      expect(core.getState().tracks.map((track) => track.value)).toEqual(['0', '1']);
      expect(core.getState().value).toBe('1');
    });

    it('marks availability unavailable with one track', () => {
      const core = new AudioTrackRadioGroupCore();
      core.setMedia(
        createMediaState({ audioTrackList: [{ id: '0', label: 'English', language: 'en', enabled: true }] })
      );

      expect(core.getState().availability).toBe('unavailable');
      expect(core.getState().disabled).toBe(true);
    });
  });

  describe('getLabel', () => {
    it('returns the default label', () => {
      const core = new AudioTrackRadioGroupCore();
      expect(core.getLabel(createState())).toBe('Audio');
    });

    it('returns a custom string label', () => {
      const core = new AudioTrackRadioGroupCore({ label: 'Audio tracks' });
      expect(core.getLabel(createState())).toBe('Audio tracks');
    });
  });

  describe('getTrackLabel', () => {
    it('uses a custom formatter', () => {
      const core = new AudioTrackRadioGroupCore({
        formatTrack: (track) => `${track.language}: ${track.label}`,
      });

      expect(core.getTrackLabel({ label: 'English', language: 'en', enabled: false })).toBe('en: English');
    });
  });

  describe('selectValue', () => {
    it('selects a known track', () => {
      const core = new AudioTrackRadioGroupCore();
      const media = createMediaState();

      core.selectValue(media, '1');

      expect(media.selectAudioTrack).toHaveBeenCalledWith('1');
    });

    it('does nothing for an unknown track', () => {
      const core = new AudioTrackRadioGroupCore();
      const media = createMediaState();

      core.selectValue(media, '3');

      expect(media.selectAudioTrack).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
      const core = new AudioTrackRadioGroupCore({ disabled: true });
      const media = createMediaState();

      core.selectValue(media, '1');

      expect(media.selectAudioTrack).not.toHaveBeenCalled();
    });
  });
});
