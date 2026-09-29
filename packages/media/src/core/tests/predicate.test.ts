import { describe, expect, it } from 'vite-plus/test';

import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../constants';
import {
  getTimeRangeEnd,
  hasTimeRange,
  isBrandedMedia,
  isMediaBufferCapable,
  isMediaContentDataCapable,
  isMediaRemotePlaybackCapable,
  isMediaTextTrackCapable,
  MEDIA_BRANDS,
} from '../predicate';

describe('getTimeRangeEnd', () => {
  it('prefers a finite duration', () => {
    expect(getTimeRangeEnd({ duration: 120, seekable: [[10, 100]] })).toBe(120);
  });

  it('falls back to the last seekable end', () => {
    expect(
      getTimeRangeEnd({
        duration: 0,
        seekable: [
          [10, 20],
          [30, 90],
        ],
      })
    ).toBe(90);
  });

  it('returns zero when the time range is unknown', () => {
    expect(getTimeRangeEnd({ duration: 0, seekable: [] })).toBe(0);
  });
});

describe('hasTimeRange', () => {
  it('accepts either a duration or seekable range', () => {
    expect(hasTimeRange({ duration: 120, seekable: [] })).toBe(true);
    expect(hasTimeRange({ duration: 0, seekable: [[10, 90]] })).toBe(true);
  });

  it('rejects an unknown time range', () => {
    expect(hasTimeRange({ duration: 0, seekable: [] })).toBe(false);
  });
});

describe('isMediaContentDataCapable', () => {
  it('uses undefined as the unsupported sentinel', () => {
    expect(isMediaContentDataCapable({})).toBe(false);
    expect(isMediaContentDataCapable({ contentData: undefined })).toBe(false);
    expect(isMediaContentDataCapable({ contentData: {} })).toBe(true);
    expect(isMediaContentDataCapable({ contentData: { poster: 'poster.jpg' } })).toBe(true);
    expect(isMediaContentDataCapable({ contentData: { title: undefined } })).toBe(true);
    expect(isMediaContentDataCapable({ contentData: { title: null } })).toBe(true);
    expect(isMediaContentDataCapable({ contentData: { title: '' } })).toBe(true);
  });
});

describe('isMediaBufferCapable', () => {
  it('rejects empty time range stubs', () => {
    expect(isMediaBufferCapable({ buffered: EMPTY_TIME_RANGES, seekable: EMPTY_TIME_RANGES })).toBe(false);
  });

  it('accepts defined non-stub time ranges', () => {
    const range = { length: 1, start: () => 0, end: () => 10 };

    expect(isMediaBufferCapable({ buffered: range, seekable: range })).toBe(true);
  });
});

describe('isMediaTextTrackCapable', () => {
  it('rejects the empty text tracks stub', () => {
    expect(isMediaTextTrackCapable({ textTracks: EMPTY_TEXT_TRACKS })).toBe(false);
  });

  it('accepts defined non-stub text tracks', () => {
    expect(isMediaTextTrackCapable({ textTracks: Object.assign(new EventTarget(), { length: 0 }) })).toBe(true);
  });
});

describe('isMediaRemotePlaybackCapable', () => {
  it('rejects the empty remote playback stub', () => {
    expect(isMediaRemotePlaybackCapable({ remote: EMPTY_REMOTE })).toBe(false);
  });

  it('accepts defined non-stub remote playback', () => {
    expect(isMediaRemotePlaybackCapable({ remote: new EventTarget() })).toBe(true);
  });
});

describe('isBrandedMedia', () => {
  class HlsMedia {
    static readonly [MEDIA_BRANDS]: readonly string[] = ['hls'];
  }

  class MuxMedia extends HlsMedia {
    static override readonly [MEDIA_BRANDS] = [...HlsMedia[MEDIA_BRANDS], 'mux'];
  }

  class AudioOnlyMedia extends MuxMedia {
    static override readonly [MEDIA_BRANDS] = MuxMedia[MEDIA_BRANDS].filter((brand) => brand !== 'mux');
  }

  it('matches the brands the class lists', () => {
    expect(isBrandedMedia(new HlsMedia(), 'hls')).toBe(true);
    expect(isBrandedMedia(new HlsMedia(), 'mux')).toBe(false);
  });

  it('matches brands a subclass keeps or adds, and not ones it drops', () => {
    expect(isBrandedMedia(new MuxMedia(), 'hls')).toBe(true);
    expect(isBrandedMedia(new MuxMedia(), 'mux')).toBe(true);
    expect(isBrandedMedia(new AudioOnlyMedia(), 'hls')).toBe(true);
    expect(isBrandedMedia(new AudioOnlyMedia(), 'mux')).toBe(false);
  });

  it('looks through a custom media element to its adapter', () => {
    expect(isBrandedMedia({ adapter: new MuxMedia() }, 'mux')).toBe(true);
    expect(isBrandedMedia({ adapter: {} }, 'mux')).toBe(false);
  });

  it('matches a class branded by another copy of the package', () => {
    const OTHER_COPY_BRANDS = Symbol.for('@videojs/media/brands');

    class OtherCopyMedia {
      static readonly [OTHER_COPY_BRANDS] = ['hls'];
    }

    expect(isBrandedMedia(new OtherCopyMedia(), 'hls')).toBe(true);
  });

  it('rejects unbranded values', () => {
    expect(isBrandedMedia({}, 'hls')).toBe(false);
    expect(isBrandedMedia(null, 'hls')).toBe(false);
    expect(isBrandedMedia('hls', 'hls')).toBe(false);
  });
});
