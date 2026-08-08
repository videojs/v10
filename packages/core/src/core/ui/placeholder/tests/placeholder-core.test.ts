import { describe, expect, it } from 'vitest';
import { PlaceholderCore } from '../placeholder-core';

describe('PlaceholderCore', () => {
  describe('getState', () => {
    it('is visible before playback starts and hidden after', () => {
      const core = new PlaceholderCore();

      core.setMedia({ started: false, placeholder: 'tiny.jpg' });
      expect(core.getState().visible).toBe(true);

      core.setMedia({ started: true, placeholder: 'tiny.jpg' });
      expect(core.getState().visible).toBe(false);
    });

    it('passes the resolved URL through untouched', () => {
      const core = new PlaceholderCore();

      core.setMedia({ started: false, placeholder: 'tiny.jpg' });

      expect(core.getState()).toEqual({ visible: true, src: 'tiny.jpg' });
    });

    it('reports an empty src when nothing supplied a placeholder', () => {
      const core = new PlaceholderCore();

      core.setMedia({ started: false, placeholder: '' });

      expect(core.getState().src).toBe('');
    });

    it('stays visible without a src, mirroring the poster it sits behind', () => {
      const core = new PlaceholderCore();

      core.setMedia({ started: false, placeholder: '' });

      // Nothing is painted either way, so visibility tracks playback alone and
      // both components read the same `data-visible` rules.
      expect(core.getState().visible).toBe(true);
    });
  });
});
