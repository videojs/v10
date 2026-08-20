import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MEDIA_PLAYLIST_METADATA_KEY } from '../../types';
import { canPlayTrack, makeCanPlayTrackWithDrm } from '../capabilities';

describe('canPlayTrack', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the isTypeSupported verdict for the track built MIME', () => {
    const spy = vi.spyOn(MediaSource, 'isTypeSupported');

    spy.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(canPlayTrack({ mimeType: 'video/mp4', codecs: ['supported.1'] })).toBe(true);
    expect(canPlayTrack({ mimeType: 'video/mp4', codecs: ['unsupported.1'] })).toBe(false);

    expect(spy).toHaveBeenNthCalledWith(1, 'video/mp4; codecs="supported.1"');
    expect(spy).toHaveBeenNthCalledWith(2, 'video/mp4; codecs="unsupported.1"');
  });

  it('memoizes by built MIME string — probes each unique MIME once', () => {
    const spy = vi.spyOn(MediaSource, 'isTypeSupported').mockReturnValue(true);
    const codecs = ['memo.unique.codec'];

    canPlayTrack({ mimeType: 'video/mp4', codecs });
    canPlayTrack({ mimeType: 'video/mp4', codecs });
    canPlayTrack({ mimeType: 'video/mp4', codecs: [...codecs] });

    const calls = spy.mock.calls.filter(([mime]) => mime === 'video/mp4; codecs="memo.unique.codec"');

    expect(calls).toHaveLength(1);
  });

  it('passes through (true) for an unprobeable track with no mimeType', () => {
    const spy = vi.spyOn(MediaSource, 'isTypeSupported');

    expect(canPlayTrack({ codecs: ['avc1.42E01E'] })).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('passes through (true) when codecs is empty or absent (unprobeable, CODECS optional)', () => {
    const spy = vi.spyOn(MediaSource, 'isTypeSupported');

    expect(canPlayTrack({ mimeType: 'video/mp4', codecs: [] })).toBe(true);
    expect(canPlayTrack({ mimeType: 'video/mp4' })).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('asserts non-fMP4 containers (video/mp2t, audio/aac) unsupported without consulting isTypeSupported', () => {
    // TS: the probe false-positives on Chromium + no transmux. Raw AAC: a
    // temporary limitation (the browser supports it, but our pipeline assumes an
    // init segment) — both are pruned before selection rather than stalling.
    const spy = vi.spyOn(MediaSource, 'isTypeSupported').mockReturnValue(true);

    expect(canPlayTrack({ mimeType: 'video/mp2t', codecs: ['avc1.640028'] })).toBe(false);
    expect(canPlayTrack({ mimeType: 'audio/aac', codecs: ['mp4a.40.2'] })).toBe(false);
    // Even without codecs (the usual pass-through case), they're still dropped.
    expect(canPlayTrack({ mimeType: 'video/mp2t' })).toBe(false);
    expect(canPlayTrack({ mimeType: 'audio/aac' })).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('asserts an encrypted rendition unplayable, whatever its codecs probe as', () => {
    // No EME / license pipeline, so an encrypted rendition would append and fail
    // to decode with nothing to explain it. Pruned before selection instead.
    const spy = vi.spyOn(MediaSource, 'isTypeSupported').mockReturnValue(true);
    const encrypted = {
      mimeType: 'video/mp4',
      codecs: ['avc1.640028'],
      metadata: { [MEDIA_PLAYLIST_METADATA_KEY]: { encrypted: true } },
    };

    expect(canPlayTrack(encrypted)).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('leaves a clear rendition to the codec probe', () => {
    // The other half of what makes a partially-encrypted source still play: only
    // the encrypted renditions drop out.
    const spy = vi.spyOn(MediaSource, 'isTypeSupported').mockReturnValue(true);
    const clear = {
      mimeType: 'video/mp4',
      codecs: ['avc1.640029'],
      metadata: { [MEDIA_PLAYLIST_METADATA_KEY]: { encrypted: false } },
    };

    expect(canPlayTrack(clear)).toBe(true);
    expect(spy).toHaveBeenCalled();
  });
});

describe('makeCanPlayTrackWithDrm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
  const drm = { 'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' } };
  const probe = makeCanPlayTrackWithDrm(drm);

  const encryptedTrack = (keys: object[], codecs: string[]) => ({
    mimeType: 'video/mp4',
    codecs,
    metadata: { [MEDIA_PLAYLIST_METADATA_KEY]: { encrypted: true, keys } },
  });

  it('plays an encrypted rendition whose declared keys reach a configured system', () => {
    vi.spyOn(MediaSource, 'isTypeSupported').mockReturnValue(true);
    expect(probe(encryptedTrack([WIDEVINE_KEY], ['drm.codec.1']))).toBe(true);
  });

  it('still refuses an encrypted rendition no configured system serves', () => {
    const spy = vi.spyOn(MediaSource, 'isTypeSupported').mockReturnValue(true);
    expect(probe(encryptedTrack([FAIRPLAY_KEY], ['drm.codec.2']))).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('still probes codecs for a servable encrypted rendition', () => {
    vi.spyOn(MediaSource, 'isTypeSupported').mockReturnValue(false);
    expect(probe(encryptedTrack([WIDEVINE_KEY], ['drm.codec.3']))).toBe(false);
  });

  it('matches the standard refusals for clear tracks', () => {
    expect(probe({ mimeType: 'video/mp2t', codecs: ['avc1.640028'] })).toBe(false);
    expect(probe({ mimeType: 'video/mp4' })).toBe(true);
  });
});
