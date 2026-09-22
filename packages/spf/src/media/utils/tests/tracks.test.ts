import { describe, expect, it } from 'vite-plus/test';

import type { Presentation } from '../../types';
import { applyContainerMimeType, buildMimeCodec, getAllTracks, mimeCodecsByType } from '../tracks';

const presentation = (): Presentation =>
  ({
    id: 'pres-1',
    url: 'https://example.com/master.m3u8',
    selectionSets: [
      {
        id: 'v',
        type: 'video',
        switchingSets: [
          {
            id: 'vs',
            type: 'video',
            tracks: [
              { id: 'v1', mimeType: 'video/mp4' },
              { id: 'v2', mimeType: 'video/mp4' },
            ],
          },
        ],
      },
      {
        id: 'a',
        type: 'audio',
        switchingSets: [{ id: 'as', type: 'audio', tracks: [{ id: 'a1', mimeType: 'audio/mp4' }] }],
      },
    ],
  }) as unknown as Presentation;

const mimeOf = (p: Presentation, type: string) =>
  p.selectionSets.find((s) => s.type === type)?.switchingSets[0]?.tracks.map((t) => t.mimeType);

describe('applyContainerMimeType', () => {
  it('sets the MIME on every track of the given type', () => {
    const result = applyContainerMimeType(presentation(), 'video', 'video/mp2t');

    expect(mimeOf(result, 'video')).toEqual(['video/mp2t', 'video/mp2t']);
  });

  it('leaves other types untouched (never crosses audio↔video)', () => {
    const result = applyContainerMimeType(presentation(), 'video', 'video/mp2t');

    expect(mimeOf(result, 'audio')).toEqual(['audio/mp4']);
  });

  it('is idempotent — re-applying the same MIME is a no-op', () => {
    const once = applyContainerMimeType(presentation(), 'video', 'video/mp2t');
    const twice = applyContainerMimeType(once, 'video', 'video/mp2t');

    expect(twice).toEqual(once);
  });
});

describe('getAllTracks', () => {
  it('walks every switching set of every selection set, in order', () => {
    const p = presentation() as unknown as Presentation;

    // A second video switching set, which `getTracksByType` would never see.
    p.selectionSets[0]!.switchingSets.push({
      id: 'vs2',
      type: 'video',
      tracks: [{ id: 'v3', mimeType: 'video/mp4' }],
    } as never);

    expect(getAllTracks(p.selectionSets).map(({ id }) => id)).toEqual(['v1', 'v2', 'v3', 'a1']);
  });

  it('returns an empty list for no selection sets', () => {
    expect(getAllTracks([])).toEqual([]);
  });
});

describe('buildMimeCodec', () => {
  it('joins the mime type with one codec', () => {
    expect(buildMimeCodec({ mimeType: 'video/mp4', codecs: ['avc1.42E01E'] })).toBe('video/mp4; codecs="avc1.42E01E"');
  });

  it('joins several codecs with commas', () => {
    expect(buildMimeCodec({ mimeType: 'video/mp4', codecs: ['avc1.42E01E', 'mp4a.40.2'] })).toBe(
      'video/mp4; codecs="avc1.42E01E,mp4a.40.2"'
    );
  });

  it('leaves the codecs parameter empty when there are none', () => {
    expect(buildMimeCodec({ mimeType: 'video/mp4', codecs: [] })).toBe('video/mp4; codecs=""');
    expect(buildMimeCodec({ mimeType: 'video/mp4' })).toBe('video/mp4; codecs=""');
  });
});

const VIDEO_TYPE = 'video/mp4; codecs="avc1.4d401f"';
const AUDIO_TYPE = 'audio/mp4; codecs="mp4a.40.2"';

function avTrack(type: 'video' | 'audio', overrides: object = {}) {
  return {
    type,
    id: `${type}-1`,
    url: `https://example.com/${type}.m3u8`,
    bandwidth: 1000,
    mimeType: `${type}/mp4`,
    codecs: [type === 'video' ? 'avc1.4d401f' : 'mp4a.40.2'],
    ...overrides,
  };
}

function avPresentation(tracks: object[]): Presentation {
  return {
    id: 'p1',
    url: 'https://example.com/multivariant.m3u8',
    selectionSets: [
      { id: 'ss1', type: 'video' as const, switchingSets: [{ id: 'sw1', type: 'video' as const, tracks }] },
    ],
  } as Presentation;
}

describe('mimeCodecsByType', () => {
  it('collects the distinct audio and video mime codecs', () => {
    expect(mimeCodecsByType(avPresentation([avTrack('video'), avTrack('audio')]))).toEqual({
      video: [VIDEO_TYPE],
      audio: [AUDIO_TYPE],
    });
  });

  it('collapses renditions sharing a mime codec — one ladder is one entry', () => {
    const presentation = avPresentation([avTrack('video'), avTrack('video', { id: 'v-2', bandwidth: 2000 })]);

    expect(mimeCodecsByType(presentation).video).toEqual([VIDEO_TYPE]);
  });

  it('skips tracks with nothing to build from, and non-a/v types', () => {
    const presentation = avPresentation([
      avTrack('video', { codecs: undefined }),
      avTrack('audio', { mimeType: undefined }),
      avTrack('video', { id: 'text-1', type: 'text' }),
    ]);

    expect(mimeCodecsByType(presentation)).toEqual({ video: [], audio: [] });
  });

  it('is empty for an absent or unresolved presentation', () => {
    expect(mimeCodecsByType(undefined)).toEqual({ video: [], audio: [] });
    expect(mimeCodecsByType({ url: 'https://example.com/m.m3u8' })).toEqual({ video: [], audio: [] });
  });
});
