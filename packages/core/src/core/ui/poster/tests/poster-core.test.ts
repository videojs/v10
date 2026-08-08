import { describe, expect, it } from 'vitest';
import { PosterCore } from '../poster-core';

describe('PosterCore', () => {
  describe('getState', () => {
    it('is visible before playback starts and hidden after', () => {
      const core = new PosterCore();

      core.setMedia({ started: false, poster: 'poster.jpg' });
      expect(core.getState().visible).toBe(true);

      core.setMedia({ started: true, poster: 'poster.jpg' });
      expect(core.getState().visible).toBe(false);
    });

    it('passes the resolved URL through untouched', () => {
      const core = new PosterCore();

      core.setMedia({ started: false, poster: 'poster.jpg' });

      expect(core.getState()).toEqual({ visible: true, src: 'poster.jpg' });
    });

    it('reports an empty src when nothing supplied a poster', () => {
      const core = new PosterCore();

      core.setMedia({ started: false, poster: '' });

      expect(core.getState().src).toBe('');
    });
  });
});
