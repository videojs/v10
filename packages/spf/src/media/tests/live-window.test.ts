import { describe, expect, it } from 'vitest';
import { liveWindowFor } from '../live-window';
import { type AudioTrack, MEDIA_PLAYLIST_METADATA_KEY, type Presentation, type VideoTrack } from '../types';

/** 5-segment, 2s window starting at 100: [100, 110]; targetDuration 2. */
function makePresentation(overrides?: Partial<VideoTrack>): Presentation {
  const video: VideoTrack = {
    type: 'video',
    id: 'v-1',
    url: 'https://example.com/video.m3u8',
    mimeType: 'video/mp4',
    codecs: ['avc1.640020'],
    bandwidth: 1_000_000,
    initialization: { url: 'https://example.com/init.mp4' },
    duration: Number.POSITIVE_INFINITY,
    startTime: 100,
    startDate: 1000,
    segments: [100, 102, 104, 106, 108].map((startTime, i) => ({
      id: `segment-${50 + i}`,
      url: `${50 + i}.m4s`,
      duration: 2,
      startTime,
    })),
    metadata: { [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence: 50, targetDuration: 2, endList: false } },
    ...overrides,
  };
  return {
    id: 'pres-1',
    url: 'https://example.com/master.m3u8',
    startTime: 0,
    selectionSets: [{ id: 'video-set', type: 'video', switchingSets: [{ id: 'vs', type: 'video', tracks: [video] }] }],
  };
}

describe('liveWindowFor', () => {
  it('returns the window bounds for a live track', () => {
    expect(liveWindowFor(makePresentation(), 'v-1')).toEqual({ start: 100, end: 110 });
  });

  it('returns null for a complete (finite-duration) playlist — VoD / ended live', () => {
    expect(liveWindowFor(makePresentation({ duration: 110 }), 'v-1')).toBeNull();
  });

  it('returns null without a resolved presentation', () => {
    expect(liveWindowFor(undefined, 'v-1')).toBeNull();
    expect(liveWindowFor({ id: 'p', url: 'https://example.com/x.m3u8' }, 'v-1')).toBeNull();
  });

  it('returns null without a selected video track id', () => {
    expect(liveWindowFor(makePresentation(), undefined)).toBeNull();
  });

  it('returns null when the track id does not resolve', () => {
    expect(liveWindowFor(makePresentation(), 'missing')).toBeNull();
  });

  it('returns null for a track with no segments', () => {
    expect(liveWindowFor(makePresentation({ segments: [] }), 'v-1')).toBeNull();
  });

  it('resolves a track by id regardless of type — audio-only', () => {
    const audio: AudioTrack = {
      type: 'audio',
      id: 'a-1',
      groupId: 'audio-hi',
      name: 'Default',
      sampleRate: 48_000,
      channels: 2,
      url: 'https://example.com/audio.m3u8',
      mimeType: 'audio/mp4',
      codecs: ['mp4a.40.2'],
      bandwidth: 128_000,
      initialization: { url: 'https://example.com/a-init.mp4' },
      duration: Number.POSITIVE_INFINITY,
      startTime: 200,
      startDate: 1000,
      segments: [0, 2, 4, 6, 8].map((o, i) => ({ id: `a-${i}`, url: `a${i}.m4s`, duration: 2, startTime: 200 + o })),
      metadata: { [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence: 0, targetDuration: 2, endList: false } },
    };
    const presentation: Presentation = {
      id: 'pres-1',
      url: 'https://example.com/master.m3u8',
      startTime: 0,
      selectionSets: [
        { id: 'audio-set', type: 'audio', switchingSets: [{ id: 'as', type: 'audio', tracks: [audio] }] },
      ],
    };
    expect(liveWindowFor(presentation, 'a-1')).toEqual({ start: 200, end: 210 });
  });
});
