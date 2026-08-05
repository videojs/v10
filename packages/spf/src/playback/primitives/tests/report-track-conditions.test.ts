import { describe, expect, it } from 'vitest';

import {
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  SVTA_UNSUPPORTED_VIDEO_FORMAT,
} from '../../../media/errors';
import { MEDIA_PLAYLIST_METADATA_KEY, type ResolvedTrack, type TrackType } from '../../../media/types';
import { reportUnsupportedTrackConditions } from '../report-track-conditions';

const track = (type: TrackType, opts: { mimeType?: string; encrypted?: boolean } = {}): ResolvedTrack =>
  ({
    id: `${type}-1`,
    type,
    url: `https://example.com/${type}.m3u8`,
    bandwidth: 1000,
    mimeType: opts.mimeType ?? (type === 'video' ? 'video/mp4' : 'audio/mp4'),
    startTime: 0,
    duration: 10,
    segments: [],
    metadata: {
      [MEDIA_PLAYLIST_METADATA_KEY]: {
        targetDuration: 4,
        mediaSequence: 0,
        endList: true,
        encrypted: opts.encrypted ?? false,
      },
    },
  }) as unknown as ResolvedTrack;

const codes = (t: ResolvedTrack) => reportUnsupportedTrackConditions(t).map((error) => error.code);

describe('reportUnsupportedTrackConditions', () => {
  it('reports nothing for a playable fMP4 rendition', () => {
    expect(reportUnsupportedTrackConditions(track('video'))).toEqual([]);
  });

  it('reports an unsupported video format for an MPEG-TS rendition', () => {
    expect(codes(track('video', { mimeType: 'video/mp2t' }))).toEqual([SVTA_UNSUPPORTED_VIDEO_FORMAT]);
  });

  it('reports the audio counterpart for a raw-AAC rendition', () => {
    expect(codes(track('audio', { mimeType: 'audio/aac' }))).toEqual([SVTA_UNSUPPORTED_AUDIO_FORMAT]);
  });

  it('reports unsupported DRM for an encrypted rendition', () => {
    expect(codes(track('video', { encrypted: true }))).toEqual([SVTA_UNSUPPORTED_DRM_SYSTEM]);
  });

  it('reports both causes when a rendition is encrypted MPEG-TS', () => {
    expect(codes(track('video', { mimeType: 'video/mp2t', encrypted: true }))).toEqual([
      SVTA_UNSUPPORTED_VIDEO_FORMAT,
      SVTA_UNSUPPORTED_DRM_SYSTEM,
    ]);
  });

  it('reports no format code for text — an unavailable subtitle track is not a failure', () => {
    expect(reportUnsupportedTrackConditions(track('text', { mimeType: 'video/mp2t' }))).toEqual([]);
  });

  it('carries the rendition id as context so a cause can be traced to a track', () => {
    const [condition] = reportUnsupportedTrackConditions(track('video', { encrypted: true }));
    expect(condition?.data).toEqual({ trackType: 'video', trackId: 'video-1' });
  });

  it('tags the track type, which the DRM code cannot carry on its own', () => {
    // 4008 is one code for both types, so a consumer attributing causes to a
    // per-type verdict has only this tag to go on.
    const [condition] = reportUnsupportedTrackConditions(track('audio', { encrypted: true }));
    expect(condition?.data).toMatchObject({ trackType: 'audio' });
  });

  describe('viewer-facing copy', () => {
    const message = (t: ResolvedTrack, name?: string) =>
      reportUnsupportedTrackConditions(t, { playerSoftwareName: name }).map((error) => error.message);

    it('names the actual container, which only this reporter can', () => {
      // The mimeType exists here and nowhere downstream, so this is the only
      // place "MPEG-TS" can be said instead of "some format".
      expect(message(track('video', { mimeType: 'video/mp2t' }))).toEqual(['This player can’t play MPEG-TS video.']);
    });

    it('distinguishes raw AAC from MPEG-TS under the same code', () => {
      // 1004/1005 covers every non-fMP4 container. Calling this one plain "AAC"
      // would also be wrong — AAC in fMP4 plays fine.
      expect(message(track('audio', { mimeType: 'audio/aac' }))).toEqual(['This player can’t play raw AAC audio.']);
    });

    it('says protected, per track type, for an encrypted rendition', () => {
      expect(message(track('video', { encrypted: true }))).toEqual(['This player can’t play DRM-protected video.']);
      expect(message(track('audio', { encrypted: true }))).toEqual(['This player can’t play DRM-protected audio.']);
    });

    it('names a caller-supplied player software as the subject', () => {
      expect(message(track('video', { mimeType: 'video/mp2t' }), 'Mux Player')).toEqual([
        'Mux Player can’t play MPEG-TS video.',
      ]);
    });

    it('never blames the browser — the engine is what can’t play these', () => {
      // Browsers play MPEG-TS (Safari, natively) and DRM (EME). Saying "this
      // browser can't" is false and sends a viewer to an identical browser.
      const all = [
        ...message(track('video', { mimeType: 'video/mp2t' })),
        ...message(track('audio', { mimeType: 'audio/aac' })),
        ...message(track('video', { encrypted: true })),
        ...message(track('audio', { encrypted: true })),
      ];

      expect(all).not.toHaveLength(0);
      for (const text of all) expect(text).not.toMatch(/browser/i);
    });
  });
});
