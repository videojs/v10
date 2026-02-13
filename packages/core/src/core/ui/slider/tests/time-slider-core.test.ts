import { describe, expect, it, vi } from 'vitest';

import type { MediaBufferState, MediaTimeState } from '../../../media/state';
import type { SliderInteraction } from '../slider-core';
import { TimeSliderCore } from '../time-slider-core';

type TimeSliderMedia = MediaTimeState & MediaBufferState;

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

function createMediaState(overrides: Partial<TimeSliderMedia> = {}): TimeSliderMedia {
  return {
    currentTime: 0,
    duration: 300,
    seeking: false,
    seek: vi.fn(async (t: number) => t),
    buffered: [],
    seekable: [],
    ...overrides,
  };
}

describe('TimeSliderCore', () => {
  describe('defaultProps', () => {
    it('extends SliderCore defaults with label', () => {
      expect(TimeSliderCore.defaultProps.label).toBe('Seek');
      expect(TimeSliderCore.defaultProps.min).toBe(0);
      expect(TimeSliderCore.defaultProps.max).toBe(100);
    });
  });

  describe('getTimeState', () => {
    it('uses currentTime as value when not dragging', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ currentTime: 90, duration: 300 }), createInteraction());

      expect(state.value).toBe(90);
      expect(state.currentTime).toBe(90);
      expect(state.duration).toBe(300);
      expect(state.fillPercent).toBe(30); // 90/300 * 100
    });

    it('uses drag percent for value when dragging', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(
        createMediaState({ currentTime: 90, duration: 300 }),
        createInteraction({ dragging: true, dragPercent: 50 })
      );

      expect(state.value).toBe(150); // 50% of 300
      expect(state.dragging).toBe(true);
      expect(state.currentTime).toBe(90); // unchanged
    });

    it('computes buffer percent from buffered ranges', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ duration: 200, buffered: [[0, 100]] }), createInteraction());

      expect(state.bufferPercent).toBe(50); // 100/200 * 100
    });

    it('uses end of the furthest buffered range', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(
        createMediaState({
          duration: 200,
          buffered: [
            [0, 50],
            [60, 150],
          ],
        }),
        createInteraction()
      );

      expect(state.bufferPercent).toBe(75); // 150/200 * 100
    });

    it('returns 0 buffer percent when no buffered ranges', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ duration: 200, buffered: [] }), createInteraction());

      expect(state.bufferPercent).toBe(0);
    });

    it('returns 0 buffer percent when duration is 0', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ duration: 0, buffered: [] }), createInteraction());

      expect(state.bufferPercent).toBe(0);
    });

    it('passes through seeking state', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ seeking: true }), createInteraction());

      expect(state.seeking).toBe(true);
    });

    it('sets min to 0 and max to duration', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ duration: 600 }), createInteraction());

      const attrs = core.getAttrs(state);
      expect(attrs['aria-valuemin']).toBe(0);
      expect(attrs['aria-valuemax']).toBe(600);
    });

    it('handles zero duration', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ currentTime: 0, duration: 0 }), createInteraction());

      expect(state.fillPercent).toBe(0);
      expect(state.value).toBe(0);
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label and aria-valuetext', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ currentTime: 90, duration: 300 }), createInteraction());
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Seek');
      expect(attrs['aria-valuetext']).toBe('1 minute, 30 seconds of 5 minutes');
      expect(attrs.role).toBe('slider');
    });

    it('uses custom label', () => {
      const core = new TimeSliderCore({ label: 'Scrub' });
      const state = core.getTimeState(createMediaState({ currentTime: 0, duration: 300 }), createInteraction());
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Scrub');
    });

    it('shows both times when duration is 0', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(createMediaState({ currentTime: 0, duration: 0 }), createInteraction());
      const attrs = core.getAttrs(state);

      expect(attrs['aria-valuetext']).toBe('0 seconds of 0 seconds');
    });

    it('includes dragged value in valuetext', () => {
      const core = new TimeSliderCore();
      const state = core.getTimeState(
        createMediaState({ currentTime: 0, duration: 300 }),
        createInteraction({ dragging: true, dragPercent: 50 })
      );
      const attrs = core.getAttrs(state);

      // value is 150 (50% of 300) → "2 minutes, 30 seconds of 5 minutes"
      expect(attrs['aria-valuetext']).toBe('2 minutes, 30 seconds of 5 minutes');
    });
  });

  describe('setProps', () => {
    it('updates label', () => {
      const core = new TimeSliderCore();
      core.setProps({ label: 'Progress' });

      const state = core.getTimeState(createMediaState({ currentTime: 0, duration: 100 }), createInteraction());
      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Progress');
    });
  });
});
