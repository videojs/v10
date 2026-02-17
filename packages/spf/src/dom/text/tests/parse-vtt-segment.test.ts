import { beforeEach, describe, expect, it } from 'vitest';
import { destroyVttParser, parseVttSegment } from '../parse-vtt-segment';

describe('parseVttSegment', () => {
  beforeEach(() => {
    destroyVttParser();
  });

  it('parses valid VTT segment with single cue', async () => {
    const vttDataUrl =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:00.000 --> 00:00:05.000
First subtitle
`);

    const cues = await parseVttSegment(vttDataUrl);

    expect(cues).toHaveLength(1);
    expect(cues[0]).toBeInstanceOf(VTTCue);
    expect(cues[0]!.startTime).toBe(0);
    expect(cues[0]!.endTime).toBe(5);
    expect(cues[0]!.text).toBe('First subtitle');
  });

  it('parses VTT segment with multiple cues', async () => {
    const vttDataUrl =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:00.000 --> 00:00:05.000
First subtitle

00:00:05.000 --> 00:00:10.000
Second subtitle

00:00:10.000 --> 00:00:15.000
Third subtitle
`);

    const cues = await parseVttSegment(vttDataUrl);

    expect(cues).toHaveLength(3);
    expect(cues[0]!.text).toBe('First subtitle');
    expect(cues[1]!.text).toBe('Second subtitle');
    expect(cues[2]!.text).toBe('Third subtitle');
  });

  it('extracts correct startTime, endTime, text from cues', async () => {
    const vttDataUrl =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:01.500 --> 00:00:03.750
Test subtitle with precise timing
`);

    const cues = await parseVttSegment(vttDataUrl);

    expect(cues).toHaveLength(1);
    expect(cues[0]!.startTime).toBe(1.5);
    expect(cues[0]!.endTime).toBe(3.75);
    expect(cues[0]!.text).toBe('Test subtitle with precise timing');
  });

  it('handles VTT with positioning and styling', async () => {
    const vttDataUrl =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:00.000 --> 00:00:05.000 align:start position:10%
<v Speaker>Positioned subtitle</v>
`);

    const cues = await parseVttSegment(vttDataUrl);

    expect(cues).toHaveLength(1);
    expect(cues[0]!.startTime).toBe(0);
    expect(cues[0]!.endTime).toBe(5);
    expect(cues[0]!.text).toContain('Positioned subtitle');
    expect(cues[0]!.align).toBe('start');
    expect(cues[0]!.position).toBe(10);
  });

  it('handles VTT with multiline text', async () => {
    const vttDataUrl =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:00.000 --> 00:00:05.000
First line
Second line
Third line
`);

    const cues = await parseVttSegment(vttDataUrl);

    expect(cues).toHaveLength(1);
    expect(cues[0]!.text).toContain('First line');
    expect(cues[0]!.text).toContain('Second line');
    expect(cues[0]!.text).toContain('Third line');
  });

  it('rejects on invalid URL', async () => {
    await expect(parseVttSegment('https://invalid.example.com/missing.vtt')).rejects.toThrow(
      'Failed to load VTT segment'
    );
  });

  it('rejects on malformed VTT', async () => {
    const invalidVtt = `data:text/vtt,${encodeURIComponent('NOT VALID VTT CONTENT')}`;

    await expect(parseVttSegment(invalidVtt)).rejects.toThrow('Failed to load VTT segment');
  });

  it('returns empty array for VTT with no cues', async () => {
    const vttDataUrl = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n')}`;

    const cues = await parseVttSegment(vttDataUrl);

    expect(cues).toHaveLength(0);
  });

  it('reuses dummy elements across multiple calls', async () => {
    const vtt1 =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:00.000 --> 00:00:01.000
First
`);

    const vtt2 =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:00.000 --> 00:00:01.000
Second
`);

    const cues1 = await parseVttSegment(vtt1);
    expect(cues1).toHaveLength(1);
    expect(cues1[0]!.text).toBe('First');

    const cues2 = await parseVttSegment(vtt2);
    expect(cues2).toHaveLength(1);
    expect(cues2[0]!.text).toBe('Second');
  });

  it('cleans up dummy elements on destroy', async () => {
    const vttDataUrl =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:00.000 --> 00:00:01.000
Test
`);

    await parseVttSegment(vttDataUrl);

    destroyVttParser();

    const cues = await parseVttSegment(vttDataUrl);
    expect(cues).toHaveLength(1);
    expect(cues[0]!.text).toBe('Test');
  });
});

describe('destroyVttParser', () => {
  it('can be called multiple times safely', () => {
    expect(() => {
      destroyVttParser();
      destroyVttParser();
      destroyVttParser();
    }).not.toThrow();
  });

  it('allows parsing after destroy', async () => {
    destroyVttParser();

    const vttDataUrl =
      'data:text/vtt,' +
      encodeURIComponent(`WEBVTT

00:00:00.000 --> 00:00:01.000
Test
`);

    const cues = await parseVttSegment(vttDataUrl);
    expect(cues).toHaveLength(1);
  });
});
