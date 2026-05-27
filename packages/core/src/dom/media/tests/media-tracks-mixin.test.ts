import { describe, expect, it } from 'vitest';
import { MediaTracksMixin } from '../../../core/media/media-tracks';
import { HTMLVideoElementHost } from '../html-video-element-host';

describe('MediaTracksMixin', () => {
  it('overrides inherited layer authoring methods with track-list backed methods', () => {
    const MixedHost = MediaTracksMixin(HTMLVideoElementHost);
    const media = new MixedHost();

    const track = media.addAudioTrack('main', 'English', 'en');

    expect(media.audioTracks.length).toBe(1);
    expect(media.audioTracks[0]).toBe(track);
    expect([...media.audioTracks]).toEqual([track]);
  });
});
