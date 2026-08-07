import { describe, expect, it } from 'vitest';
import { SliderSegmentsCore } from '../slider-segments-core';

describe('SliderSegmentsCore', () => {
  it('converts domain ranges to percentage geometry', () => {
    const core = new SliderSegmentsCore({
      segments: [
        { start: 20, end: 40 },
        { start: 40, end: 100 },
      ],
    });

    expect(core.getState('horizontal', 20, 100, 30)).toEqual({
      orientation: 'horizontal',
      hasSegments: true,
      segments: [
        { offset: 0, size: 25, highlighted: true },
        { offset: 25, size: 75, highlighted: false },
      ],
    });
  });

  it('preserves vertical orientation', () => {
    const core = new SliderSegmentsCore({ segments: [{ start: 0, end: 25 }] });

    expect(core.getState('vertical', 0, 100, 0).orientation).toBe('vertical');
  });

  it('skips invalid and non-positive ranges', () => {
    const core = new SliderSegmentsCore({
      segments: [
        { start: 0, end: 0 },
        { start: 20, end: 10 },
        { start: Number.NaN, end: 20 },
        { start: 25, end: 50 },
      ],
    });

    expect(core.getState('horizontal', 0, 100, 30).segments).toEqual([{ offset: 25, size: 25, highlighted: true }]);
  });

  it('marks only the range under the pointer as highlighted', () => {
    const core = new SliderSegmentsCore({
      segments: [
        { start: 0, end: 25 },
        { start: 25, end: 100 },
      ],
    });

    expect(core.getState('horizontal', 0, 100, 25).segments.map(({ highlighted }) => highlighted)).toEqual([
      false,
      true,
    ]);
    expect(core.getState('horizontal', 0, 100, 100).segments.map(({ highlighted }) => highlighted)).toEqual([
      false,
      true,
    ]);
  });

  it('does not highlight a range when the pointer is absent', () => {
    const core = new SliderSegmentsCore({ segments: [{ start: 0, end: 100 }] });

    expect(core.getState('horizontal', 0, 100).segments[0]?.highlighted).toBe(false);
  });

  it('returns no segments for an invalid slider range', () => {
    const core = new SliderSegmentsCore({ segments: [{ start: 0, end: 25 }] });

    expect(core.getState('horizontal', 0, 0, 0)).toEqual({
      orientation: 'horizontal',
      hasSegments: false,
      segments: [],
    });
    expect(core.getState('horizontal', 0, Number.POSITIVE_INFINITY, 0)).toEqual({
      orientation: 'horizontal',
      hasSegments: false,
      segments: [],
    });
  });
});
