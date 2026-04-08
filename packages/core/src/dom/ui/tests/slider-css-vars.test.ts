import { describe, expect, it } from 'vitest';

import { createSliderState, createTimeSliderState } from '../../tests/test-helpers';
import { getSliderCSSVars, getSliderPreviewStyle, getTimeSliderCSSVars } from '../slider-css-vars';

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
  it('includes fill, pointer, buffer, and preview CSS vars', () => {
    const vars = getTimeSliderCSSVars(
      createTimeSliderState({ fillPercent: 50, pointerPercent: 30, bufferPercent: 75, previewPercent: 60 })
    );

    expect(vars['--media-slider-fill']).toBe('50.000%');
    expect(vars['--media-slider-pointer']).toBe('30.000%');
    expect(vars['--media-slider-buffer']).toBe('75.000%');
    expect(vars['--media-slider-preview']).toBe('60.000%');
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

describe('getSliderPreviewStyle', () => {
  it('returns structural positioning properties', () => {
    const style = getSliderPreviewStyle(100, 'clamp');

    expect(style.position).toBe('absolute');
    expect(style.width).toBe('max-content');
    expect(style.pointerEvents).toBe('none');
  });

  it('clamps left within slider bounds by default', () => {
    const style = getSliderPreviewStyle(100, 'clamp');

    expect(style.left).toContain('min(');
    expect(style.left).toContain('max(');
    expect(style.left).toContain('var(--media-slider-pointer)');
    expect(style.left).toContain('50px');
    expect(style.left).toContain('100px');
  });

  it('uses unclamped calc when overflow is visible', () => {
    const style = getSliderPreviewStyle(100, 'visible');

    expect(style.left).toBe('calc(var(--media-slider-pointer) - 50px)');
    expect(style.left).not.toContain('min(');
  });

  it('handles zero width', () => {
    const style = getSliderPreviewStyle(0, 'clamp');

    expect(style.left).toContain('0px');
  });
});
