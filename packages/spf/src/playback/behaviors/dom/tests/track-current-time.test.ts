import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import {
  type CurrentTimeOwners,
  type CurrentTimeState,
  canTrackCurrentTime,
  trackCurrentTime,
} from '../track-current-time';

function setupTrackCurrentTime(initialState: CurrentTimeState, initialOwners: CurrentTimeOwners) {
  const state = signal<CurrentTimeState>(initialState);
  const owners = signal<CurrentTimeOwners>(initialOwners);
  const cleanup = trackCurrentTime({ state, owners });
  return { state, owners, cleanup };
}

describe('trackCurrentTime', () => {
  describe('canTrackCurrentTime', () => {
    it('returns false when no mediaElement', () => {
      const owners: CurrentTimeOwners = {};

      expect(canTrackCurrentTime(owners)).toBe(false);
    });

    it('returns true when mediaElement exists', () => {
      const owners: CurrentTimeOwners = {
        mediaElement: document.createElement('video'),
      };

      expect(canTrackCurrentTime(owners)).toBe(true);
    });
  });

  describe('trackCurrentTime orchestration', () => {
    it('syncs currentTime immediately when mediaElement is provided', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 5.5, writable: true });

      const { state, cleanup } = setupTrackCurrentTime({}, { mediaElement });

      await vi.waitFor(() => {
        expect(state.get().currentTime).toBe(5.5);
      });

      cleanup();
    });

    it('updates currentTime on timeupdate events', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 0, writable: true });

      const { state, cleanup } = setupTrackCurrentTime({}, { mediaElement });

      // Simulate playback progress
      (mediaElement as any).currentTime = 10.0;
      mediaElement.dispatchEvent(new Event('timeupdate'));

      await vi.waitFor(() => {
        expect(state.get().currentTime).toBe(10.0);
      });

      cleanup();
    });

    it('continues tracking on subsequent timeupdate events', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 0, writable: true });

      const { state, cleanup } = setupTrackCurrentTime({}, { mediaElement });

      (mediaElement as any).currentTime = 3.0;
      mediaElement.dispatchEvent(new Event('timeupdate'));
      await vi.waitFor(() => expect(state.get().currentTime).toBe(3.0));

      (mediaElement as any).currentTime = 7.5;
      mediaElement.dispatchEvent(new Event('timeupdate'));
      await vi.waitFor(() => expect(state.get().currentTime).toBe(7.5));

      cleanup();
    });

    it('does not re-setup when owners updates but mediaElement is unchanged', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 5, writable: true });

      const addEventListenerSpy = vi.spyOn(mediaElement, 'addEventListener');

      const state = signal<CurrentTimeState>({});
      const owners = signal<CurrentTimeOwners & { videoBuffer?: unknown }>({ mediaElement });
      const cleanup = trackCurrentTime({ state, owners });

      await vi.waitFor(() => expect(state.get().currentTime).toBe(5));

      const callsBefore = addEventListenerSpy.mock.calls.length;

      // Set an unrelated owner field — mediaElement is the same object
      owners.set({ ...owners.get(), videoBuffer: {} });
      await new Promise((resolve) => setTimeout(resolve, 30));

      // No new listeners should have been added
      expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);

      cleanup();
    });

    it('does nothing when no mediaElement', async () => {
      const { state, cleanup } = setupTrackCurrentTime({}, {});

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(state.get().currentTime).toBeUndefined();

      cleanup();
    });

    it('starts tracking when mediaElement is added later', async () => {
      const { state, owners, cleanup } = setupTrackCurrentTime({}, {});

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(state.get().currentTime).toBeUndefined();

      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 2.0, writable: true });
      owners.set({ ...owners.get(), mediaElement });

      await vi.waitFor(() => {
        expect(state.get().currentTime).toBe(2.0);
      });

      cleanup();
    });

    it('stops listening to old mediaElement when replaced', async () => {
      const element1 = document.createElement('video');
      Object.defineProperty(element1, 'currentTime', { value: 1.0, writable: true });
      const element2 = document.createElement('video');
      Object.defineProperty(element2, 'currentTime', { value: 20.0, writable: true });

      const { state, owners, cleanup } = setupTrackCurrentTime({}, { mediaElement: element1 });

      await vi.waitFor(() => expect(state.get().currentTime).toBe(1.0));

      // Replace with new element
      owners.set({ ...owners.get(), mediaElement: element2 });
      await vi.waitFor(() => expect(state.get().currentTime).toBe(20.0));

      // Old element timeupdate should no longer affect state
      (element1 as any).currentTime = 99.0;
      element1.dispatchEvent(new Event('timeupdate'));
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(state.get().currentTime).toBe(20.0);

      cleanup();
    });

    it('updates currentTime on seeking events (seek while paused)', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 0, writable: true });

      const { state, cleanup } = setupTrackCurrentTime({}, { mediaElement });

      // Simulate a seek while paused — timeupdate does not fire, only seeking does
      (mediaElement as any).currentTime = 60.0;
      mediaElement.dispatchEvent(new Event('seeking'));

      await vi.waitFor(() => {
        expect(state.get().currentTime).toBe(60.0);
      });

      cleanup();
    });

    it('removes all listeners on cleanup', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 0, writable: true });

      const { state, cleanup } = setupTrackCurrentTime({}, { mediaElement });

      await vi.waitFor(() => expect(state.get().currentTime).toBe(0));

      cleanup();

      (mediaElement as any).currentTime = 50.0;
      mediaElement.dispatchEvent(new Event('timeupdate'));
      mediaElement.dispatchEvent(new Event('seeking'));
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(state.get().currentTime).toBe(0);
    });
  });
});
