import { describe, expect, it } from 'vitest';

import { createSliderState, createTimeSliderState } from '../../tests/test-helpers';
import { getSliderCSSVars, getTimeSliderCSSVars } from '../slider-css-vars';

describe('getSliderCSSVars', () => {
  it('returns fill and pointer CSS vars with 3-decimal precision', () => {
    const vars = getSliderCSSVars(createSliderState({ fillPercent: 45.1234, pointerPercent: 67.8 }));

    expect(vars['--media-slider-fill']).toBe('45.123%');
    expect(vars['--media-slider-pointer']).toBe('67.800%');
  });

  it('formats zero values correctly', () => {
    const vars = getSliderCSSVars(createSliderState({ fillPercent: 0, pointerPercent: 0 }));

    expect(vars['--media-slider-fill']).toBe('0.000%');
    expect(vars['--media-slider-pointer']).toBe('0.000%');
  });

  it('formats 100% values correctly', () => {
    const vars = getSliderCSSVars(createSliderState({ fillPercent: 100, pointerPercent: 100 }));

    expect(vars['--media-slider-fill']).toBe('100.000%');
    expect(vars['--media-slider-pointer']).toBe('100.000%');
  });

  it('does not include buffer', () => {
    const vars = getSliderCSSVars(createSliderState());

    expect(vars['--media-slider-buffer']).toBeUndefined();
  });
});

describe('getTimeSliderCSSVars', () => {
  it('includes fill, pointer, and buffer CSS vars', () => {
    const vars = getTimeSliderCSSVars(
      createTimeSliderState({ fillPercent: 50, pointerPercent: 30, bufferPercent: 75 })
    );

    expect(vars['--media-slider-fill']).toBe('50.000%');
    expect(vars['--media-slider-pointer']).toBe('30.000%');
    expect(vars['--media-slider-buffer']).toBe('75.000%');
  });

  it('formats buffer zero correctly', () => {
    const vars = getTimeSliderCSSVars(createTimeSliderState({ bufferPercent: 0 }));

    expect(vars['--media-slider-buffer']).toBe('0.000%');
  });

  it('formats high-precision buffer correctly', () => {
    const vars = getTimeSliderCSSVars(createTimeSliderState({ bufferPercent: 33.33333 }));

    expect(vars['--media-slider-buffer']).toBe('33.333%');
  });
});
