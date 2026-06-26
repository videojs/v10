import { describe, expect, it } from 'vitest';
import { parseVttTimestampMap } from '../parse-vtt-timestamp-map';

describe('parseVttTimestampMap', () => {
  it('parses an Apple-style header (MPEGTS:900000, LOCAL zero)', () => {
    const text = 'WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n1\n00:00:00.008 --> 00:00:00.992\nBip!\n';
    expect(parseVttTimestampMap(text)).toEqual({ mpegts: 900000, local: 0 });
  });

  it('parses a non-zero LOCAL value into seconds', () => {
    const text = 'WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:1351801,LOCAL:00:00:15.000\n';
    expect(parseVttTimestampMap(text)).toEqual({ mpegts: 1351801, local: 15 });
  });

  it('is tolerant of attribute order (LOCAL before MPEGTS)', () => {
    const text = 'WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000\n';
    expect(parseVttTimestampMap(text)).toEqual({ mpegts: 900000, local: 0 });
  });

  it('parses the MM:SS.mmm LOCAL form', () => {
    const text = 'WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:01:30.500\n';
    expect(parseVttTimestampMap(text)).toEqual({ mpegts: 900000, local: 90.5 });
  });

  it('returns undefined when no map is present (Mux-style absolute cues)', () => {
    const text = 'WEBVTT\n\n11\n00:00:46.320 --> 00:01:00.880\nThe robot.\n';
    expect(parseVttTimestampMap(text)).toBeUndefined();
  });

  it('tolerates spaces around attributes and CRLF newlines', () => {
    const text = 'WEBVTT\r\nX-TIMESTAMP-MAP=MPEGTS:900000, LOCAL:00:00:00.000\r\n';
    expect(parseVttTimestampMap(text)).toEqual({ mpegts: 900000, local: 0 });
  });
});
