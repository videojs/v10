import { describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import {
  type CurrentTimeOwners,
  type CurrentTimeState,
  canTrackCurrentTime,
  trackCurrentTime,
} from '../track-current-time';

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

      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners>({ mediaElement });

      const cleanup = trackCurrentTime({ state, owners });

      await vi.waitFor(() => {
        expect(state.current.currentTime).toBe(5.5);
      });

      cleanup();
    });

    it('updates currentTime on timeupdate events', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 0, writable: true });

      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners>({ mediaElement });

      const cleanup = trackCurrentTime({ state, owners });

      // Simulate playback progress
      (mediaElement as any).currentTime = 10.0;
      mediaElement.dispatchEvent(new Event('timeupdate'));

      await vi.waitFor(() => {
        expect(state.current.currentTime).toBe(10.0);
      });

      cleanup();
    });

    it('continues tracking on subsequent timeupdate events', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 0, writable: true });

      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners>({ mediaElement });

      const cleanup = trackCurrentTime({ state, owners });

      (mediaElement as any).currentTime = 3.0;
      mediaElement.dispatchEvent(new Event('timeupdate'));
      await vi.waitFor(() => expect(state.current.currentTime).toBe(3.0));

      (mediaElement as any).currentTime = 7.5;
      mediaElement.dispatchEvent(new Event('timeupdate'));
      await vi.waitFor(() => expect(state.current.currentTime).toBe(7.5));

      cleanup();
    });

    it('does not re-setup when owners updates but mediaElement is unchanged', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 5, writable: true });

      const addEventListenerSpy = vi.spyOn(mediaElement, 'addEventListener');

      // Use an owners shape that has an extra field to simulate the playback engine
      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners & { videoBuffer?: unknown }>({ mediaElement });

      const cleanup = trackCurrentTime({ state, owners });

      await vi.waitFor(() => expect(state.current.currentTime).toBe(5));

      const callsBefore = addEventListenerSpy.mock.calls.length;

      // Patch an unrelated owner — mediaElement is the same object
      owners.patch({ videoBuffer: {} });
      await new Promise((resolve) => setTimeout(resolve, 30));

      // No new listeners should have been added
      expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);

      cleanup();
    });

    it('does nothing when no mediaElement', async () => {
      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners>({});

      const cleanup = trackCurrentTime({ state, owners });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(state.current.currentTime).toBeUndefined();

      cleanup();
    });

    it('starts tracking when mediaElement is added later', async () => {
      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners>({});

      const cleanup = trackCurrentTime({ state, owners });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(state.current.currentTime).toBeUndefined();

      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 2.0, writable: true });
      owners.patch({ mediaElement });

      await vi.waitFor(() => {
        expect(state.current.currentTime).toBe(2.0);
      });

      cleanup();
    });

    it('stops listening to old mediaElement when replaced', async () => {
      const element1 = document.createElement('video');
      Object.defineProperty(element1, 'currentTime', { value: 1.0, writable: true });
      const element2 = document.createElement('video');
      Object.defineProperty(element2, 'currentTime', { value: 20.0, writable: true });

      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners>({ mediaElement: element1 });

      const cleanup = trackCurrentTime({ state, owners });

      await vi.waitFor(() => expect(state.current.currentTime).toBe(1.0));

      // Replace with new element
      owners.patch({ mediaElement: element2 });
      await vi.waitFor(() => expect(state.current.currentTime).toBe(20.0));

      // Old element timeupdate should no longer affect state
      (element1 as any).currentTime = 99.0;
      element1.dispatchEvent(new Event('timeupdate'));
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(state.current.currentTime).toBe(20.0);

      cleanup();
    });

    it('updates currentTime on seeking events (seek while paused)', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 0, writable: true });

      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners>({ mediaElement });

      const cleanup = trackCurrentTime({ state, owners });

      // Simulate a seek while paused — timeupdate does not fire, only seeking does
      (mediaElement as any).currentTime = 60.0;
      mediaElement.dispatchEvent(new Event('seeking'));

      await vi.waitFor(() => {
        expect(state.current.currentTime).toBe(60.0);
      });

      cleanup();
    });

    it('removes all listeners on cleanup', async () => {
      const mediaElement = document.createElement('video');
      Object.defineProperty(mediaElement, 'currentTime', { value: 0, writable: true });

      const state = createState<CurrentTimeState>({});
      const owners = createState<CurrentTimeOwners>({ mediaElement });

      const cleanup = trackCurrentTime({ state, owners });

      await vi.waitFor(() => expect(state.current.currentTime).toBe(0));

      cleanup();

      (mediaElement as any).currentTime = 50.0;
      mediaElement.dispatchEvent(new Event('timeupdate'));
      mediaElement.dispatchEvent(new Event('seeking'));
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(state.current.currentTime).toBe(0);
    });
  });
});
