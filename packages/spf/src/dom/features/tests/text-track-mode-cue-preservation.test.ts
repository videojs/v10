import { describe, expect, it } from 'vitest';

/**
 * Empirical tests for TextTrack cue preservation across mode transitions.
 *
 * Key question: does setting mode="disabled" permanently discard cues added
 * via addCue(), or are they preserved and accessible again after re-enabling?
 *
 * Tests run in real Chromium via @vitest/browser-playwright.
 */
describe('TextTrack cue preservation across mode transitions', () => {
  function makeTrack(): { video: HTMLVideoElement; trackEl: HTMLTrackElement; track: TextTrack } {
    const video = document.createElement('video');
    const trackEl = document.createElement('track');
    trackEl.kind = 'subtitles';
    // No src — SPF manages cues via addCue() only
    video.appendChild(trackEl);
    return { video, trackEl, track: trackEl.track };
  }

  it('track.cues is null when mode="disabled"', () => {
    const { track } = makeTrack();
    track.mode = 'disabled';
    expect(track.cues).toBeNull();
  });

  it('track.cues is a list when mode="showing"', () => {
    const { track } = makeTrack();
    track.mode = 'showing';
    expect(track.cues).not.toBeNull();
  });

  it('track.cues is a list when mode="hidden"', () => {
    const { track } = makeTrack();
    track.mode = 'hidden';
    expect(track.cues).not.toBeNull();
  });

  it('cues added via addCue() survive disabled → showing transition (no src)', () => {
    const { track } = makeTrack();

    track.mode = 'showing';
    track.addCue(new VTTCue(0, 5, 'Hello'));
    expect(track.cues?.length).toBe(1);

    track.mode = 'disabled';
    expect(track.cues).toBeNull();

    track.mode = 'showing';
    expect(track.cues?.length).toBe(1);
  });

  it('cues added via addCue() survive disabled → hidden transition (no src)', () => {
    const { track } = makeTrack();

    track.mode = 'showing';
    track.addCue(new VTTCue(0, 5, 'Hello'));

    track.mode = 'disabled';
    track.mode = 'hidden';
    expect(track.cues?.length).toBe(1);
  });

  it('cues added via addCue() survive hidden → disabled → showing transition (no src)', () => {
    const { track } = makeTrack();

    track.mode = 'hidden';
    track.addCue(new VTTCue(0, 5, 'Hello'));

    track.mode = 'disabled';
    track.mode = 'showing';
    expect(track.cues?.length).toBe(1);
  });

  it('multiple cues survive disabled → showing transition (no src)', () => {
    const { track } = makeTrack();

    track.mode = 'showing';
    track.addCue(new VTTCue(0, 2, 'First'));
    track.addCue(new VTTCue(2, 4, 'Second'));
    track.addCue(new VTTCue(4, 6, 'Third'));
    expect(track.cues?.length).toBe(3);

    track.mode = 'disabled';
    track.mode = 'showing';
    expect(track.cues?.length).toBe(3);
  });
});
