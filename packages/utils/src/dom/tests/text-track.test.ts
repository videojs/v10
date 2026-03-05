import { describe, expect, it } from 'vitest';

import { findTrackElement } from '../text-track';

/**
 * jsdom does not create unique TextTrack objects per <track> element,
 * so we mock the `.track` property to simulate real browser behavior.
 */
function mockTrackProperty(el: HTMLTrackElement): TextTrack {
  const track = {} as TextTrack;
  Object.defineProperty(el, 'track', { value: track, configurable: true });
  return track;
}

describe('findTrackElement', () => {
  it('returns the track element that owns the given TextTrack', () => {
    const video = document.createElement('video');
    const el = document.createElement('track');
    const track = mockTrackProperty(el);
    video.appendChild(el);

    expect(findTrackElement(video, track)).toBe(el);
  });

  it('returns null when no track element matches', () => {
    const video = document.createElement('video');
    const el = document.createElement('track');
    mockTrackProperty(el);
    video.appendChild(el);

    const unmatchedTrack = {} as TextTrack;

    expect(findTrackElement(video, unmatchedTrack)).toBeNull();
  });

  it('returns null when there are no track elements', () => {
    const video = document.createElement('video');
    const unmatchedTrack = {} as TextTrack;

    expect(findTrackElement(video, unmatchedTrack)).toBeNull();
  });

  it('finds the correct track among multiple track elements', () => {
    const video = document.createElement('video');

    const captionsEl = document.createElement('track');
    const captionsTrack = mockTrackProperty(captionsEl);
    video.appendChild(captionsEl);

    const thumbnailsEl = document.createElement('track');
    const thumbnailsTrack = mockTrackProperty(thumbnailsEl);
    video.appendChild(thumbnailsEl);

    const chaptersEl = document.createElement('track');
    const chaptersTrack = mockTrackProperty(chaptersEl);
    video.appendChild(chaptersEl);

    expect(findTrackElement(video, thumbnailsTrack)).toBe(thumbnailsEl);
    expect(findTrackElement(video, captionsTrack)).toBe(captionsEl);
    expect(findTrackElement(video, chaptersTrack)).toBe(chaptersEl);
  });
});
