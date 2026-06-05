import { describe, expect, it } from 'vitest';
import { MediaTracksMixin } from '../mixin';

class TestMedia extends EventTarget {}
const TestMediaWithTracks = MediaTracksMixin(TestMedia);

describe('MediaTracksMixin', () => {
  it('backs audioTracks with track-list authoring methods', () => {
    const media = new TestMediaWithTracks();

    const track = media.addAudioTrack('main', 'English', 'en');

    expect(media.audioTracks.length).toBe(1);
    expect(media.audioTracks[0]).toBe(track);
    expect([...media.audioTracks]).toEqual([track]);
    expect(track.label).toBe('English');
    expect(track.language).toBe('en');
  });

  it('removes audio tracks', () => {
    const media = new TestMediaWithTracks();

    const track = media.addAudioTrack('main');
    expect(media.audioTracks.length).toBe(1);

    media.removeAudioTrack(track);
    expect(media.audioTracks.length).toBe(0);
  });

  it('exposes renditions of the selected video track only', () => {
    const media = new TestMediaWithTracks();

    const selected = media.addVideoTrack('main');
    selected.selected = true;
    selected.addRendition('high.m3u8', 1920, 1080);
    selected.addRendition('low.m3u8', 640, 360);

    const hidden = media.addVideoTrack('alternative');
    hidden.addRendition('alt.m3u8', 1280, 720);

    expect(media.videoTracks.length).toBe(2);
    expect(media.videoRenditions.length).toBe(2);
    expect([...media.videoRenditions].map((rendition) => rendition.width)).toEqual([1920, 640]);
  });

  it('makes video track selection exclusive', () => {
    const media = new TestMediaWithTracks();

    const first = media.addVideoTrack('main');
    const second = media.addVideoTrack('alternative');

    first.selected = true;
    second.selected = true;

    expect(first.selected).toBe(false);
    expect(second.selected).toBe(true);
    expect(media.videoTracks.selectedIndex).toBe(1);
  });
});
