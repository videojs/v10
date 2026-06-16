import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';

import type { VideoRenditionLike } from '../../../../core/media/types';
import type { PlayerTarget } from '../../../media/types';
import { qualityFeature } from '../quality';

class TestRenditionList extends EventTarget {
  renditions: VideoRenditionLike[];

  constructor(renditions: VideoRenditionLike[]) {
    super();
    this.renditions = renditions;
  }

  [Symbol.iterator](): Iterator<VideoRenditionLike> {
    return this.renditions.values();
  }

  get length(): number {
    return this.renditions.length;
  }

  get selectedIndex(): number {
    return this.renditions.findIndex((rendition) => rendition.selected);
  }

  set selectedIndex(index: number) {
    for (const [renditionIndex, rendition] of this.renditions.entries()) {
      rendition.selected = renditionIndex === index;
    }
  }
}

class TestTrackList extends EventTarget {
  [Symbol.iterator](): Iterator<unknown> {
    return [][Symbol.iterator]();
  }
}

class TestMedia extends EventTarget {
  videoRenditions: TestRenditionList | undefined = undefined;
  videoTracks = new TestTrackList();

  async play() {}
}

function createRendition(overrides: Partial<VideoRenditionLike>): VideoRenditionLike {
  return {
    id: undefined,
    width: undefined,
    height: undefined,
    bitrate: undefined,
    frameRate: undefined,
    codec: undefined,
    selected: false,
    ...overrides,
  };
}

function createMedia(renditions: VideoRenditionLike[]): PlayerTarget['media'] {
  return {
    play: async () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    videoRenditions: new TestRenditionList(renditions),
    videoTracks: new TestTrackList(),
  } as unknown as PlayerTarget['media'];
}

describe('qualityFeature', () => {
  it('syncs video renditions on attach', () => {
    const media = createMedia([
      createRendition({ id: '0', height: 1080, bitrate: 6_000_000 }),
      createRendition({ id: '1', height: 720, bitrate: 3_000_000 }),
    ]);
    const store = createStore<PlayerTarget>()(qualityFeature);

    store.attach({ media, container: null });

    expect(store.state.videoRenditionList).toEqual([
      { id: '0', height: 1080, bitrate: 6_000_000, selected: false },
      { id: '1', height: 720, bitrate: 3_000_000, selected: false },
    ]);
  });

  it('syncs video renditions after loadstart', () => {
    const media = new TestMedia() as unknown as PlayerTarget['media'];
    const store = createStore<PlayerTarget>()(qualityFeature);

    store.attach({ media, container: null });

    expect(store.state.videoRenditionList).toEqual([]);

    const list = new TestRenditionList([createRendition({ id: '0', height: 1080 })]);
    (media as unknown as TestMedia).videoRenditions = list;
    media.dispatchEvent(new Event('loadstart'));

    expect(store.state.videoRenditionList).toEqual([{ id: '0', height: 1080, selected: false }]);

    list.renditions.push(createRendition({ id: '1', height: 720 }));
    list.dispatchEvent(new Event('addrendition'));

    expect(store.state.videoRenditionList).toEqual([
      { id: '0', height: 1080, selected: false },
      { id: '1', height: 720, selected: false },
    ]);
  });

  it('selects automatic quality', () => {
    const media = createMedia([
      createRendition({ id: '0', height: 1080, selected: true }),
      createRendition({ id: '1', height: 720 }),
    ]);
    const store = createStore<PlayerTarget>()(qualityFeature);
    store.attach({ media, container: null });

    store.state.selectVideoRendition('auto');

    expect((media as any).videoRenditions.selectedIndex).toBe(-1);
  });

  it('selects a rendition by value', () => {
    const media = createMedia([createRendition({ id: '0', height: 1080 }), createRendition({ id: '1', height: 720 })]);
    const store = createStore<PlayerTarget>()(qualityFeature);
    store.attach({ media, container: null });

    store.state.selectVideoRendition('1');

    expect((media as any).videoRenditions.selectedIndex).toBe(1);
  });

  it('resyncs on rendition change', () => {
    const media = createMedia([createRendition({ id: '0', height: 1080 }), createRendition({ id: '1', height: 720 })]);
    const store = createStore<PlayerTarget>()(qualityFeature);
    store.attach({ media, container: null });

    (media as any).videoRenditions.renditions[1].selected = true;
    (media as any).videoRenditions.dispatchEvent(new Event('change'));

    expect(store.state.videoRenditionList[1]?.selected).toBe(true);
  });
});
