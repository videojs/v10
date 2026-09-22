import { describe, expect, it } from 'vite-plus/test';

import type { Presentation } from '../../types';
import { applyContainerMimeType, getAllTracks } from '../tracks';

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
