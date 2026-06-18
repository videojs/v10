import { describe, expect, it } from 'vitest';
import { parseCodecs } from '../parse-attributes';

describe('parseCodecs', () => {
  it('splits a muxed video + audio CODECS string', () => {
    expect(parseCodecs('avc1.640028,mp4a.40.2')).toEqual({ video: 'avc1.640028', audio: 'mp4a.40.2' });
  });

  it('recognizes HEVC video codecs', () => {
    expect(parseCodecs('hvc1.1.6.L120.B0')).toEqual({ video: 'hvc1.1.6.L120.B0' });
    expect(parseCodecs('hev1.2.4.L120.B0')).toEqual({ video: 'hev1.2.4.L120.B0' });
  });

  it('recognizes Dolby audio codecs (ac-3 / ec-3 / ac-4), including muxed with video', () => {
    expect(parseCodecs('ac-3')).toEqual({ audio: 'ac-3' });
    expect(parseCodecs('ec-3')).toEqual({ audio: 'ec-3' });
    // The 5.1-surround Mux manifest shape: video + AC-3 audio on one STREAM-INF.
    expect(parseCodecs('avc1.640020,ac-3')).toEqual({ video: 'avc1.640020', audio: 'ac-3' });
    expect(parseCodecs('avc1.640020,ac-4')).toEqual({ video: 'avc1.640020', audio: 'ac-4' });
  });

  it('recognizes Opus / FLAC / DTS / ALAC / Vorbis audio (case-insensitive)', () => {
    expect(parseCodecs('opus').audio).toBe('opus');
    expect(parseCodecs('fLaC').audio).toBe('fLaC');
    expect(parseCodecs('dtsc').audio).toBe('dtsc');
    expect(parseCodecs('alac').audio).toBe('alac');
    expect(parseCodecs('vorbis').audio).toBe('vorbis');
  });

  it('leaves both undefined for an unrecognized codec', () => {
    expect(parseCodecs('wxyz.1')).toEqual({});
  });
});
