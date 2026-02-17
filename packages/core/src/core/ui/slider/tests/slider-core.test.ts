import { describe, expect, it } from 'vitest';

import { SliderCore, type SliderInteraction } from '../slider-core';

function createInteraction(overrides: Partial<SliderInteraction> = {}): SliderInteraction {
  return {
    pointerPercent: 0,
    dragPercent: 0,
    dragging: false,
    pointing: false,
    focused: false,
    ...overrides,
  };
}

describe('SliderCore', () => {
  describe('defaultProps', () => {
    it('has expected defaults', () => {
      expect(SliderCore.defaultProps).toEqual({
        min: 0,
        max: 100,
        step: 1,
        largeStep: 10,
        orientation: 'horizontal',
        disabled: false,
        thumbAlignment: 'center',
      });
    });
  });

  describe('getState', () => {
    it('returns state with defaults', () => {
      const core = new SliderCore();
      const state = core.getState(createInteraction(), 50);

      expect(state.value).toBe(50);
      expect(state.fillPercent).toBe(50);
      expect(state.pointerPercent).toBe(0);
      expect(state.dragging).toBe(false);
      expect(state.pointing).toBe(false);
      expect(state.interactive).toBe(false);
      expect(state.orientation).toBe('horizontal');
      expect(state.disabled).toBe(false);
      expect(state.thumbAlignment).toBe('center');
    });

    it('computes fillPercent from value', () => {
      const core = new SliderCore({ min: 0, max: 200 });
      const state = core.getState(createInteraction(), 100);
      expect(state.fillPercent).toBe(50);
    });

    it('passes through interaction state', () => {
      const core = new SliderCore();
      const state = core.getState(createInteraction({ dragging: true, pointing: true, pointerPercent: 75 }), 30);

      expect(state.dragging).toBe(true);
      expect(state.pointing).toBe(true);
      expect(state.pointerPercent).toBe(75);
      expect(state.interactive).toBe(true);
    });

    it('interactive is true when only dragging', () => {
      const core = new SliderCore();
      const state = core.getState(createInteraction({ dragging: true }), 0);
      expect(state.interactive).toBe(true);
    });

    it('interactive is true when only pointing', () => {
      const core = new SliderCore();
      const state = core.getState(createInteraction({ pointing: true }), 0);
      expect(state.interactive).toBe(true);
    });

    it('interactive is true when only focused', () => {
      const core = new SliderCore();
      const state = core.getState(createInteraction({ focused: true }), 0);
      expect(state.interactive).toBe(true);
    });

    it('uses custom orientation and disabled', () => {
      const core = new SliderCore({ orientation: 'vertical', disabled: true });
      const state = core.getState(createInteraction(), 0);

      expect(state.orientation).toBe('vertical');
      expect(state.disabled).toBe(true);
    });
  });

  describe('getAttrs', () => {
    it('returns aria attributes', () => {
      const core = new SliderCore();
      const state = core.getState(createInteraction(), 50);
      const attrs = core.getAttrs(state);

      expect(attrs.role).toBe('slider');
      expect(attrs.tabindex).toBe(0);
      expect(attrs.autocomplete).toBe('off');
      expect(attrs['aria-valuemin']).toBe(0);
      expect(attrs['aria-valuemax']).toBe(100);
      expect(attrs['aria-valuenow']).toBe(50);
      expect(attrs['aria-orientation']).toBe('horizontal');
      expect(attrs['aria-disabled']).toBeUndefined();
    });

    it('sets tabindex -1 and aria-disabled when disabled', () => {
      const core = new SliderCore({ disabled: true });
      const state = core.getState(createInteraction(), 0);
      const attrs = core.getAttrs(state);

      expect(attrs.tabindex).toBe(-1);
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('uses custom min and max', () => {
      const core = new SliderCore({ min: 10, max: 50 });
      const state = core.getState(createInteraction(), 30);
      const attrs = core.getAttrs(state);

      expect(attrs['aria-valuemin']).toBe(10);
      expect(attrs['aria-valuemax']).toBe(50);
      expect(attrs['aria-valuenow']).toBe(30);
    });
  });

  describe('valueFromPercent', () => {
    it('converts 0% to min', () => {
      const core = new SliderCore();
      expect(core.valueFromPercent(0)).toBe(0);
    });

    it('converts 100% to max', () => {
      const core = new SliderCore();
      expect(core.valueFromPercent(100)).toBe(100);
    });

    it('converts 50% to midpoint', () => {
      const core = new SliderCore();
      expect(core.valueFromPercent(50)).toBe(50);
    });

    it('respects custom min/max', () => {
      const core = new SliderCore({ min: 10, max: 20 });
      expect(core.valueFromPercent(50)).toBe(15);
    });

    it('rounds to step', () => {
      const core = new SliderCore({ step: 5 });
      expect(core.valueFromPercent(53)).toBe(55);
      expect(core.valueFromPercent(47)).toBe(45);
    });

    it('clamps to range', () => {
      const core = new SliderCore();
      expect(core.valueFromPercent(-10)).toBe(0);
      expect(core.valueFromPercent(110)).toBe(100);
    });
  });

  describe('percentFromValue', () => {
    it('returns 0 at min', () => {
      const core = new SliderCore();
      expect(core.percentFromValue(0)).toBe(0);
    });

    it('returns 100 at max', () => {
      const core = new SliderCore();
      expect(core.percentFromValue(100)).toBe(100);
    });

    it('returns 50 at midpoint', () => {
      const core = new SliderCore();
      expect(core.percentFromValue(50)).toBe(50);
    });

    it('handles custom min/max', () => {
      const core = new SliderCore({ min: 50, max: 150 });
      expect(core.percentFromValue(100)).toBe(50);
    });

    it('returns 0 when min equals max', () => {
      const core = new SliderCore({ min: 50, max: 50 });
      expect(core.percentFromValue(50)).toBe(0);
    });
  });

  describe('adjustPercentForAlignment', () => {
    it('returns raw percent for center alignment', () => {
      const core = new SliderCore({ thumbAlignment: 'center' });
      expect(core.adjustPercentForAlignment(50, 20, 200)).toBe(50);
    });

    it('returns raw percent when track size is 0', () => {
      const core = new SliderCore({ thumbAlignment: 'edge' });
      expect(core.adjustPercentForAlignment(50, 20, 0)).toBe(50);
    });

    it('adjusts percent for edge alignment', () => {
      const core = new SliderCore({ thumbAlignment: 'edge' });
      // thumbSize=20, trackSize=200 → thumbHalf = (20/200)*100/2 = 5%
      // minPercent=5, maxPercent=95
      // result = 5 + (50/100) * (95-5) = 5 + 45 = 50
      expect(core.adjustPercentForAlignment(50, 20, 200)).toBe(50);

      // 0% → minPercent = 5
      expect(core.adjustPercentForAlignment(0, 20, 200)).toBe(5);

      // 100% → maxPercent = 95
      expect(core.adjustPercentForAlignment(100, 20, 200)).toBe(95);
    });
  });

  describe('setProps', () => {
    it('updates props after construction', () => {
      const core = new SliderCore();
      core.setProps({ min: 10, max: 50 });

      const state = core.getState(createInteraction(), 30);
      const attrs = core.getAttrs(state);

      expect(attrs['aria-valuemin']).toBe(10);
      expect(attrs['aria-valuemax']).toBe(50);
      expect(state.fillPercent).toBe(50); // (30-10)/(50-10) * 100
    });
  });
});
