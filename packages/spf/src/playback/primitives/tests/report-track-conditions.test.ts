import { describe, expect, it } from 'vite-plus/test';

import type { KeySystemModule } from '../../../media/drm';
import {
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  SVTA_UNSUPPORTED_VIDEO_FORMAT,
} from '../../../media/errors';
import { MEDIA_PLAYLIST_METADATA_KEY, type ResolvedTrack, type TrackType } from '../../../media/types';
import {
  makeReportUnsupportedTrackConditionsWithDrm,
  reportUnsupportedTrackConditions,
} from '../report-track-conditions';

const track = (
  type: TrackType,
  opts: { mimeType?: string; encrypted?: boolean; keys?: object[] } = {}
): ResolvedTrack =>
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
        ...(opts.keys && { keys: opts.keys }),
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

  it('reports no DRM cause for text either, which nothing prunes', () => {
    // Text skips the `excludeUnplayableTracks` pre-pass (an MSE probe is the wrong
    // question for WebVTT), so a cause here would have no matching exclusion and
    // no verdict could follow it. It would still count toward the adapter's
    // sequence-wide unsupported-feature check, recoding an unrelated verdict.
    expect(reportUnsupportedTrackConditions(track('text', { encrypted: true }))).toEqual([]);
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

  it('carries the container as data, not as prose', () => {
    // The mimeType exists here and nowhere downstream. Keeping it structured is
    // what lets a consumer name the container in its own words and its own
    // language; composing an English sentence here would spend the fact.
    const [condition] = reportUnsupportedTrackConditions(track('video', { mimeType: 'video/mp2t' }));

    expect(condition?.data).toMatchObject({ mimeType: 'video/mp2t' });
  });

  it('reports no viewer-facing copy at all', () => {
    const conditions = [
      ...reportUnsupportedTrackConditions(track('video', { mimeType: 'video/mp2t' })),
      ...reportUnsupportedTrackConditions(track('audio', { mimeType: 'audio/aac' })),
      ...reportUnsupportedTrackConditions(track('video', { encrypted: true })),
    ];

    expect(conditions).not.toHaveLength(0);

    for (const condition of conditions) expect(condition.message).toBeUndefined();
  });
});

describe('makeReportUnsupportedTrackConditionsWithDrm', () => {
  const WIDEVINE_KEY = {
    method: 'SAMPLE-AES',
    uri: 'data:text/plain;base64,cGluZw==',
    keyFormat: 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
  };
  const FAIRPLAY_KEY = {
    method: 'SAMPLE-AES',
    uri: 'skd://mux?keyId=abc',
    keyFormat: 'com.apple.streamingkeydelivery',
  };
  // Stand-in modules rather than the real ones: this reporter is DOM-free, and
  // so is its project — importing `media/dom` here would be the placement bug.
  const keySystems: KeySystemModule[] = [
    { keySystem: 'com.widevine.alpha', keyFormats: ['urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed'] },
    { keySystem: 'com.apple.fps', keyFormats: ['com.apple.streamingkeydelivery'] },
  ];
  const report = makeReportUnsupportedTrackConditionsWithDrm(
    { 'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' } },
    keySystems
  );

  it('reports no DRM cause when the declared keys reach a configured system', () => {
    expect(report(track('video', { encrypted: true, keys: [WIDEVINE_KEY] }))).toEqual([]);
  });

  it('keeps the DRM cause when no configured system serves the declared keys', () => {
    expect(report(track('video', { encrypted: true, keys: [FAIRPLAY_KEY] })).map((error) => error.code)).toEqual([
      SVTA_UNSUPPORTED_DRM_SYSTEM,
    ]);
  });

  it('keeps the format causes independent of key servability', () => {
    expect(
      report(track('video', { mimeType: 'video/mp2t', encrypted: true, keys: [WIDEVINE_KEY] })).map(
        (error) => error.code
      )
    ).toEqual([SVTA_UNSUPPORTED_VIDEO_FORMAT]);
  });
});
