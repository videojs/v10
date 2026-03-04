import { describe, expect, it, vi } from 'vitest';

import type { MediaVolumeState } from '../../../media/state';
import type { SliderInput } from '../../slider/slider-core';
import { VolumeSliderCore } from '../volume-slider-core';

function createInput(overrides: Partial<SliderInput> = {}): SliderInput {
  return {
    pointerPercent: 0,
    dragPercent: 0,
    dragging: false,
    pointing: false,
    focused: false,
    ...overrides,
  };
}

function createMediaState(overrides: Partial<MediaVolumeState> = {}): MediaVolumeState {
  return {
    volume: 1,
    muted: false,
    volumeAvailability: 'available',
    changeVolume: vi.fn((v: number) => v),
    toggleMute: vi.fn(() => false),
    ...overrides,
  };
}

describe('VolumeSliderCore', () => {
  describe('defaultProps', () => {
    it('has expected defaults', () => {
      expect(VolumeSliderCore.defaultProps).toEqual({
        label: 'Volume',
        step: 1,
        largeStep: 10,
        orientation: 'horizontal',
        disabled: false,
        thumbAlignment: 'center',
        value: 0,
        min: 0,
        max: 100,
      });
    });
  });

  describe('getState', () => {
    it('maps volume 0-1 to 0-100 percent', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0.75 }));

      expect(state.value).toBe(75);
      expect(state.fillPercent).toBe(75);
      expect(state.volume).toBe(0.75);
    });

    it('returns 0 when volume is 0', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0 }));

      expect(state.value).toBe(0);
      expect(state.fillPercent).toBe(0);
    });

    it('returns 100 when volume is 1', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 1 }));

      expect(state.value).toBe(100);
      expect(state.fillPercent).toBe(100);
    });

    it('sets fillPercent to 0 when muted', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0.75, muted: true }));

      expect(state.value).toBe(75);
      expect(state.fillPercent).toBe(0);
      expect(state.muted).toBe(true);
    });

    it('uses drag percent for value when dragging', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput({ dragging: true, dragPercent: 40 }));
      const state = core.getState(createMediaState({ volume: 0.75 }));

      expect(state.value).toBe(40);
      expect(state.dragging).toBe(true);
      expect(state.volume).toBe(0.75); // unchanged
    });

    it('preserves muted state', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0.5, muted: false }));

      expect(state.muted).toBe(false);
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label and aria-valuetext', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0.75 }));
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Volume');
      expect(attrs['aria-valuetext']).toBe('75 percent');
      expect(attrs.role).toBe('slider');
    });

    it('includes muted in valuetext when muted', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0.5, muted: true }));
      const attrs = core.getAttrs(state);

      expect(attrs['aria-valuetext']).toBe('50 percent, muted');
    });

    it('rounds value in valuetext', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0.333 }));
      const attrs = core.getAttrs(state);

      expect(attrs['aria-valuetext']).toBe('33 percent');
    });

    it('uses custom label', () => {
      const core = new VolumeSliderCore({ label: 'Audio' });
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 1 }));
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Audio');
    });

    it('shows 0 percent when volume is 0', () => {
      const core = new VolumeSliderCore();
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0 }));
      const attrs = core.getAttrs(state);

      expect(attrs['aria-valuetext']).toBe('0 percent');
    });
  });

  describe('setProps', () => {
    it('updates label', () => {
      const core = new VolumeSliderCore();
      core.setProps({ label: 'Sound' });

      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0.5 }));
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Sound');
    });

    it('respects disabled prop', () => {
      const core = new VolumeSliderCore({ disabled: true });
      core.setInput(createInput());
      const state = core.getState(createMediaState({ volume: 0.5 }));

      expect(state.disabled).toBe(true);

      const attrs = core.getAttrs(state);
      expect(attrs['aria-disabled']).toBe('true');
      expect(attrs.tabindex).toBe(-1);
    });
  });
});
