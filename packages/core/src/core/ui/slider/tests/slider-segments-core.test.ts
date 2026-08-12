import { describe, expect, it } from 'vitest';

import type { SliderState } from '../slider-core';
import { SliderSegmentsCore } from '../slider-segments-core';

function state(overrides: Partial<SliderState> = {}): SliderState {
  return {
    value: 25,
    fillPercent: 25,
    pointerPercent: 0,
    dragging: false,
    pointing: false,
    interactive: false,
    orientation: 'horizontal',
    disabled: false,
    thumbAlignment: 'center',
    ...overrides,
  };
}

describe('SliderSegmentsCore', () => {
  it('creates segment geometry', () => {
    const core = new SliderSegmentsCore();
    const segments = core.getGeometry({
      ranges: [
        { key: 'a', start: 0, end: 25 },
        { key: 'b', start: 25, end: 100 },
      ],
      min: 0,
      max: 100,
      orientation: 'horizontal',
    });

    expect(segments).toMatchObject([
      { key: 'a', last: false, width: '25%', startPercent: '0%', endPercent: '25%' },
      {
        key: 'b',
        last: true,
        width: '75%',
        startPercent: '25%',
        endPercent: '100%',
      },
    ]);
  });

  it('maps geometry to the vertical axis', () => {
    const [segment] = new SliderSegmentsCore().getGeometry({
      ranges: [{ key: 'a', start: 0, end: 25 }],
      min: 0,
      max: 100,
      orientation: 'vertical',
    });

    expect(segment).toMatchObject({ width: undefined, height: '25%', startPercent: '0%', endPercent: '25%' });
  });

  it('localizes fill and interaction state', () => {
    const core = new SliderSegmentsCore();
    const [, segment] = core.getGeometry({
      ranges: [
        { key: 'a', start: 0, end: 25 },
        { key: 'b', start: 25, end: 100 },
      ],
      min: 0,
      max: 100,
      orientation: 'horizontal',
    });
    const result = core.getState(segment!, state({ value: 50, pointing: true }), 75);

    expect(result.fillPercent).toBeCloseTo(100 / 3);
    expect(result).toMatchObject({
      active: true,
      pointing: true,
      dragging: false,
      highlighted: true,
      interactive: true,
    });
  });

  it('does not highlight a non-highlightable range', () => {
    const core = new SliderSegmentsCore();
    const [segment] = core.getGeometry({
      ranges: [{ key: 'gap', start: 0, end: 100, highlight: false }],
      min: 0,
      max: 100,
      orientation: 'horizontal',
    });

    expect(core.getState(segment!, state({ pointing: true }), 25).highlighted).toBe(false);
  });

  it('assigns a boundary to the following segment and includes the final maximum', () => {
    const core = new SliderSegmentsCore();
    const segments = core.getGeometry({
      ranges: [
        { key: 'a', start: 0, end: 50 },
        { key: 'b', start: 50, end: 100 },
      ],
      min: 0,
      max: 100,
      orientation: 'horizontal',
    });

    expect(core.getState(segments[0]!, state({ value: 50 }), 50).active).toBe(false);
    expect(core.getState(segments[1]!, state({ value: 50 }), 50).active).toBe(true);
    expect(core.getState(segments[1]!, state({ value: 100 }), 100).active).toBe(true);
  });
});
