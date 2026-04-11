import { createStore, flush } from '@videojs/store';
import { describe, expect, it } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { controlsFeature } from '../controls';

describe('controlsFeature', () => {
  describe('initial state', () => {
    it('starts with userActive: true and controlsVisible: true', () => {
      const { store } = createPlayerStore();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('setControls', () => {
    it('updates userActive and controlsVisible', () => {
      const { store } = createPlayerStore();

      store.state.setControls(false, false);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('allows independent values', () => {
      const { store } = createPlayerStore();

      store.state.setControls(false, true);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('toggleControls', () => {
    it('hides controls when visible', () => {
      const { store } = createPlayerStore();

      const result = store.state.toggleControls();
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
      expect(result).toBe(false);
    });

    it('shows controls when hidden', () => {
      const { store } = createPlayerStore();

      store.state.toggleControls();
      flush();

      const result = store.state.toggleControls();
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
      expect(result).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPlayerStore() {
  const store = createStore<PlayerTarget>()(controlsFeature);

  const media = createMockVideo({ paused: true });
  const container = document.createElement('div');

  store.attach({ media, container });
  flush();

  return { store, media, container };
}
