import type { MediaMetadataState } from '@videojs/media';
import { describe, expect, it } from 'vite-plus/test';

import { TitleCore } from '../core';

function createMediaState(overrides: Partial<MediaMetadataState> = {}): MediaMetadataState {
  return {
    title: 'Big Buck Bunny',
    poster: '',
    ...overrides,
  };
}

describe('TitleCore', () => {
  describe('getState', () => {
    it('returns the resolved content title', () => {
      const core = new TitleCore();

      const state = core.getState(createMediaState({ title: 'Sintel' }));

      expect(state.title).toBe('Sintel');
      expect(state.hidden).toBe(false);
    });

    it('is hidden for the empty resolved title', () => {
      const core = new TitleCore();

      const state = core.getState(createMediaState({ title: '' }));

      expect(state).toEqual({ title: '', hidden: true });
    });

    it('treats a whitespace-only title as a title', () => {
      const core = new TitleCore();

      const state = core.getState(createMediaState({ title: '   ' }));

      expect(state).toEqual({ title: '   ', hidden: false });
    });
  });
});
