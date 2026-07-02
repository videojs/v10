import { afterEach, describe, expect, it, vi } from 'vitest';
import { canPlayTrack } from '../capabilities';

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
});
