/**
 * Investigation: Do manually added TextTrack cues persist after async operations?
 *
 * This test file investigates whether cues added via TextTrack.addCue() persist
 * after async boundaries (setTimeout, Promise.resolve, etc.) in the vitest
 * browser test environment.
 */

import { describe, expect, it } from 'vitest';

describe('TextTrack Cue Persistence Investigation', () => {
  describe('Baseline: Synchronous cue addition', () => {
    it('cues exist immediately after addCue (no async)', () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));

      expect(track.track.cues).not.toBeNull();
      expect(track.track.cues!.length).toBe(1);
      expect((track.track.cues![0] as VTTCue).text).toBe('Test cue');
    });
  });

  describe('After setTimeout (minimal delay)', () => {
    it('cues persist after setTimeout(0)', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[setTimeout(0)] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 0));
      console.log('[setTimeout(0)] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });

    it('cues persist after setTimeout(1)', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[setTimeout(1)] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 1));
      console.log('[setTimeout(1)] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });

    it('cues persist after setTimeout(10)', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[setTimeout(10)] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 10));
      console.log('[setTimeout(10)] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });

    it('cues persist after setTimeout(50)', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[setTimeout(50)] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[setTimeout(50)] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });
  });

  describe('After Promise.resolve', () => {
    it('cues persist after Promise.resolve', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[Promise.resolve] Before await:', track.track.cues?.length);

      await Promise.resolve();
      console.log('[Promise.resolve] After await:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });
  });

  describe('After queueMicrotask', () => {
    it('cues persist after queueMicrotask', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[queueMicrotask] Before microtask:', track.track.cues?.length);

      await new Promise<void>((resolve) => queueMicrotask(resolve));
      console.log('[queueMicrotask] After microtask:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });
  });

  describe('Multiple cues', () => {
    it('multiple cues persist after setTimeout', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Cue 1'));
      track.track.addCue(new VTTCue(1, 2, 'Cue 2'));
      track.track.addCue(new VTTCue(2, 3, 'Cue 3'));
      console.log('[Multiple cues] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[Multiple cues] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(3);
    });
  });

  describe('Track element variations', () => {
    it('cues persist with track appended before setting mode', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';

      // Append BEFORE setting mode
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[Append before mode] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[Append before mode] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });

    it('cues persist with track appended after setting mode', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';

      // Set mode BEFORE appending
      track.track.mode = 'hidden';
      video.appendChild(track);

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[Append after mode] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[Append after mode] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });

    it('cues persist with track in document body', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';

      // Add to actual document
      document.body.appendChild(video);
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[In document] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[In document] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);

      // Cleanup
      document.body.removeChild(video);
    });

    it('cues persist when track.src is not set', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      // Explicitly verify src is not set
      expect(track.src).toBe('');

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[No src] Before timeout:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[No src] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });
  });

  describe('Mode changes', () => {
    it('cues persist when mode changes after adding', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[Mode change] After addCue:', track.track.cues?.length);

      // Change mode
      track.track.mode = 'showing';
      console.log('[Mode change] After mode=showing:', track.track.cues?.length);

      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[Mode change] After timeout:', track.track.cues?.length);

      expect(track.track.cues?.length).toBe(1);
    });

    it('cues are cleared when mode set to disabled', async () => {
      const video = document.createElement('video');
      const track = document.createElement('track');
      track.kind = 'subtitles';
      video.appendChild(track);
      track.track.mode = 'hidden';

      track.track.addCue(new VTTCue(0, 1, 'Test cue'));
      console.log('[Mode disabled] After addCue:', track.track.cues?.length);

      // Set to disabled - this SHOULD make cues null
      track.track.mode = 'disabled';
      console.log('[Mode disabled] After mode=disabled:', track.track.cues);

      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[Mode disabled] After timeout:', track.track.cues);

      expect(track.track.cues).toBeNull();
    });
  });
});
