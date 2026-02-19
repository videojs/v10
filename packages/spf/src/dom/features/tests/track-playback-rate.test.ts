import { describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import {
  canTrackPlaybackRate,
  type PlaybackRateOwners,
  type PlaybackRateState,
  trackPlaybackRate,
} from '../track-playback-rate';

describe('trackPlaybackRate', () => {
  describe('canTrackPlaybackRate', () => {
    it('returns false when no mediaElement', () => {
      expect(canTrackPlaybackRate({})).toBe(false);
    });

    it('returns true when mediaElement exists', () => {
      const owners: PlaybackRateOwners = {
        mediaElement: document.createElement('video'),
      };

      expect(canTrackPlaybackRate(owners)).toBe(true);
    });
  });

  describe('trackPlaybackRate orchestration', () => {
    it('syncs playbackRate immediately when mediaElement is provided', async () => {
      const mediaElement = document.createElement('video');

      const state = createState<PlaybackRateState>({});
      const owners = createState<PlaybackRateOwners>({ mediaElement });

      const cleanup = trackPlaybackRate({ state, owners });

      await vi.waitFor(() => {
        expect(state.current.playbackRate).toBe(1);
      });

      cleanup();
    });

    it('updates playbackRate on ratechange events', async () => {
      const mediaElement = document.createElement('video');

      const state = createState<PlaybackRateState>({});
      const owners = createState<PlaybackRateOwners>({ mediaElement });

      const cleanup = trackPlaybackRate({ state, owners });

      mediaElement.playbackRate = 2;
      mediaElement.dispatchEvent(new Event('ratechange'));

      await vi.waitFor(() => {
        expect(state.current.playbackRate).toBe(2);
      });

      cleanup();
    });

    it('continues tracking on subsequent ratechange events', async () => {
      const mediaElement = document.createElement('video');

      const state = createState<PlaybackRateState>({});
      const owners = createState<PlaybackRateOwners>({ mediaElement });

      const cleanup = trackPlaybackRate({ state, owners });

      mediaElement.playbackRate = 0.5;
      mediaElement.dispatchEvent(new Event('ratechange'));
      await vi.waitFor(() => expect(state.current.playbackRate).toBe(0.5));

      mediaElement.playbackRate = 1.5;
      mediaElement.dispatchEvent(new Event('ratechange'));
      await vi.waitFor(() => expect(state.current.playbackRate).toBe(1.5));

      cleanup();
    });

    it('does nothing when no mediaElement', async () => {
      const state = createState<PlaybackRateState>({});
      const owners = createState<PlaybackRateOwners>({});

      const cleanup = trackPlaybackRate({ state, owners });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(state.current.playbackRate).toBeUndefined();

      cleanup();
    });

    it('does not re-setup when owners updates but mediaElement is unchanged', async () => {
      const mediaElement = document.createElement('video');
      const addEventListenerSpy = vi.spyOn(mediaElement, 'addEventListener');

      const state = createState<PlaybackRateState>({});
      const owners = createState<PlaybackRateOwners & { videoBuffer?: unknown }>({ mediaElement });

      const cleanup = trackPlaybackRate({ state, owners });

      await vi.waitFor(() => expect(state.current.playbackRate).toBe(1));

      const callsBefore = addEventListenerSpy.mock.calls.length;

      // Patch an unrelated owner — mediaElement is the same object
      owners.patch({ videoBuffer: {} });
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);

      cleanup();
    });

    it('starts tracking when mediaElement is added later', async () => {
      const state = createState<PlaybackRateState>({});
      const owners = createState<PlaybackRateOwners>({});

      const cleanup = trackPlaybackRate({ state, owners });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(state.current.playbackRate).toBeUndefined();

      const mediaElement = document.createElement('video');
      owners.patch({ mediaElement });

      await vi.waitFor(() => {
        expect(state.current.playbackRate).toBe(1);
      });

      cleanup();
    });

    it('stops listening to old mediaElement when replaced', async () => {
      const element1 = document.createElement('video');
      const element2 = document.createElement('video');

      const state = createState<PlaybackRateState>({});
      const owners = createState<PlaybackRateOwners>({ mediaElement: element1 });

      const cleanup = trackPlaybackRate({ state, owners });

      await vi.waitFor(() => expect(state.current.playbackRate).toBe(1));

      owners.patch({ mediaElement: element2 });
      await vi.waitFor(() => expect(state.current.playbackRate).toBe(1));

      // Old element ratechange should no longer affect state
      element1.playbackRate = 3;
      element1.dispatchEvent(new Event('ratechange'));
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(state.current.playbackRate).toBe(1);

      cleanup();
    });

    it('removes ratechange listener on cleanup', async () => {
      const mediaElement = document.createElement('video');

      const state = createState<PlaybackRateState>({});
      const owners = createState<PlaybackRateOwners>({ mediaElement });

      const cleanup = trackPlaybackRate({ state, owners });

      await vi.waitFor(() => expect(state.current.playbackRate).toBe(1));

      cleanup();

      mediaElement.playbackRate = 2;
      mediaElement.dispatchEvent(new Event('ratechange'));
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(state.current.playbackRate).toBe(1);
    });
  });
});
