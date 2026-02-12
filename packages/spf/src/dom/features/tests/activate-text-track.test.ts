import { describe, expect, it } from 'vitest';
import { createState } from '../../../core/state/create-state';
import {
  activateTextTrack,
  canActivateTextTrack,
  type TextTrackActivationOwners,
  type TextTrackActivationState,
} from '../activate-text-track';

describe('activateTextTrack', () => {
  describe('canActivateTextTrack', () => {
    it('returns false when no textTracks map', () => {
      const owners: TextTrackActivationOwners = {};

      expect(canActivateTextTrack(owners)).toBe(false);
    });

    it('returns false when textTracks map is empty', () => {
      const owners: TextTrackActivationOwners = {
        textTracks: new Map(),
      };

      expect(canActivateTextTrack(owners)).toBe(false);
    });

    it('returns true when textTracks map has entries', () => {
      const trackElement = document.createElement('track');
      const owners: TextTrackActivationOwners = {
        textTracks: new Map([['track-1', trackElement]]),
      };

      expect(canActivateTextTrack(owners)).toBe(true);
    });
  });

  describe('activateTextTrack orchestration', () => {
    it('sets selected track mode to "showing"', async () => {
      const mediaElement = document.createElement('video');

      // Create track elements
      const track1 = document.createElement('track');
      track1.kind = 'subtitles';
      track1.label = 'English';
      track1.src = 'data:text/vtt,'; // Use data URL to avoid network request
      mediaElement.appendChild(track1);

      const track2 = document.createElement('track');
      track2.kind = 'subtitles';
      track2.label = 'Spanish';
      track2.src = 'data:text/vtt,';
      mediaElement.appendChild(track2);

      // Wait for tracks to be ready
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = createState<TextTrackActivationState>({});
      const owners = createState<TextTrackActivationOwners>({
        textTracks: new Map([
          ['track-en', track1],
          ['track-es', track2],
        ]),
      });

      const cleanup = activateTextTrack({ state, owners });

      // Select first track
      state.patch({ selectedTextTrackId: 'track-en' });

      // Wait for orchestration to run
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify track modes
      expect(track1.track.mode).toBe('showing');
      expect(track2.track.mode).toBe('hidden');

      cleanup();
    });

    it('switches active track when selection changes', async () => {
      const mediaElement = document.createElement('video');

      const track1 = document.createElement('track');
      track1.kind = 'subtitles';
      track1.src = 'data:text/vtt,';
      mediaElement.appendChild(track1);

      const track2 = document.createElement('track');
      track2.kind = 'subtitles';
      track2.src = 'data:text/vtt,';
      mediaElement.appendChild(track2);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = createState<TextTrackActivationState>({});
      const owners = createState<TextTrackActivationOwners>({
        textTracks: new Map([
          ['track-en', track1],
          ['track-es', track2],
        ]),
      });

      const cleanup = activateTextTrack({ state, owners });

      // Select first track
      state.patch({ selectedTextTrackId: 'track-en' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(track1.track.mode).toBe('showing');
      expect(track2.track.mode).toBe('hidden');

      // Switch to second track
      state.patch({ selectedTextTrackId: 'track-es' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(track1.track.mode).toBe('hidden');
      expect(track2.track.mode).toBe('showing');

      cleanup();
    });

    it('hides all tracks when no selection', async () => {
      const mediaElement = document.createElement('video');

      const track1 = document.createElement('track');
      track1.kind = 'subtitles';
      track1.src = 'data:text/vtt,';
      mediaElement.appendChild(track1);

      const track2 = document.createElement('track');
      track2.kind = 'subtitles';
      track2.src = 'data:text/vtt,';
      mediaElement.appendChild(track2);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = createState<TextTrackActivationState>({});
      const owners = createState<TextTrackActivationOwners>({
        textTracks: new Map([
          ['track-en', track1],
          ['track-es', track2],
        ]),
      });

      const cleanup = activateTextTrack({ state, owners });

      // First select a track
      state.patch({ selectedTextTrackId: 'track-en' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(track1.track.mode).toBe('showing');

      // Deselect (set to undefined)
      state.patch({ selectedTextTrackId: undefined });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Both should be hidden
      expect(track1.track.mode).toBe('hidden');
      expect(track2.track.mode).toBe('hidden');

      cleanup();
    });

    it('does nothing when textTracks not available', async () => {
      const state = createState<TextTrackActivationState>({ selectedTextTrackId: 'track-en' });
      const owners = createState<TextTrackActivationOwners>({});

      // Should not throw
      const cleanup = activateTextTrack({ state, owners });

      await new Promise((resolve) => setTimeout(resolve, 50));

      cleanup();
    });

    it('handles track selection before track elements created', async () => {
      const mediaElement = document.createElement('video');

      const track1 = document.createElement('track');
      track1.kind = 'subtitles';
      track1.src = 'data:text/vtt,';
      mediaElement.appendChild(track1);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Select track BEFORE creating owners with textTracks
      const state = createState<TextTrackActivationState>({ selectedTextTrackId: 'track-en' });
      const owners = createState<TextTrackActivationOwners>({});

      const cleanup = activateTextTrack({ state, owners });

      // Later, add textTracks
      owners.patch({
        textTracks: new Map([['track-en', track1]]),
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should activate the track
      expect(track1.track.mode).toBe('showing');

      cleanup();
    });
  });
});
