import { act, cleanup, render } from '@testing-library/react';
import { SliderCSSVars, type SliderState } from '@videojs/core';
import { getSliderCSSVars } from '@videojs/core/dom';
import { createState, flush, type WritableState } from '@videojs/store';
import type { CSSProperties } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type SliderMotionState, type SliderRenderState, useSlider } from '../../hooks/use-slider';
import { SliderProvider, useSliderMotion } from '../context';
import { SliderThumb } from '../slider-thumb';

const renderState: SliderRenderState = {
  value: 10,
  fillPercent: 10,
  dragging: true,
  pointing: true,
  interactive: true,
  orientation: 'horizontal',
  disabled: false,
  thumbAlignment: 'center',
};

afterEach(cleanup);

describe('useSlider', () => {
  it('does not re-render semantic state when only pointer motion changes', () => {
    const renderState = vi.fn();
    let motion: WritableState<SliderMotionState> | undefined;

    function SliderHarness() {
      const slider = useSlider({
        computeState: ({ dragging, pointing, focused }): SliderState => ({
          value: 40,
          fillPercent: 40,
          pointerPercent: 0,
          dragging,
          pointing,
          interactive: dragging || pointing || focused,
          orientation: 'horizontal',
          disabled: false,
          thumbAlignment: 'center',
        }),
        getPercent: () => 40,
        getStepPercent: () => 1,
        getLargeStepPercent: () => 10,
        getCSSVars: getSliderCSSVars,
      });
      motion = slider.motion as WritableState<SliderMotionState>;
      renderState(slider.state);

      return (
        <div ref={slider.rootRef} style={slider.cssVars as CSSProperties}>
          <div ref={slider.thumbRef} />
        </div>
      );
    }

    const { container } = render(<SliderHarness />);
    const root = container.firstElementChild as HTMLElement;
    const renderCount = renderState.mock.calls.length;

    expect(renderState.mock.calls.at(-1)?.[0]).not.toHaveProperty('pointerPercent');
    expect(root.style.getPropertyValue(SliderCSSVars.fill)).toBe('40.000%');

    act(() => {
      motion!.patch({ pointerPercent: 55 });
      flush();
    });

    expect(renderState).toHaveBeenCalledTimes(renderCount);
    expect(root.style.getPropertyValue(SliderCSSVars.pointer)).toBe('55.000%');
    expect(root.style.getPropertyValue(SliderCSSVars.fill)).toBe('40.000%');
  });
});

describe('useSliderMotion', () => {
  it('subscribes explicitly to percent motion and derives the pointer value', () => {
    const motion = createState({ pointerPercent: 10, dragPercent: 5 });
    const subscribe = vi.spyOn(motion, 'subscribe');

    function MotionReader() {
      const value = useSliderMotion();
      return <output>{`${value.pointerPercent}:${value.dragPercent}:${value.pointerValue}`}</output>;
    }

    const { container } = render(
      <SliderProvider
        value={{
          state: renderState,
          motion,
          getPointerValue: (percent) => percent * 2,
          thumbRef: vi.fn(),
          thumbProps: { onKeyDown: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() },
          stateAttrMap: {},
          getAttrs: () => ({}),
        }}
      >
        <MotionReader />
      </SliderProvider>
    );

    expect(container.querySelector('output')?.textContent).toBe('10:5:20');
    expect(subscribe).toHaveBeenCalledOnce();

    act(() => {
      motion.replace({ pointerPercent: 30, dragPercent: 25 });
      flush();
    });

    expect(container.querySelector('output')?.textContent).toBe('30:25:60');
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it('keeps thumb ARIA synchronized with live drag motion', () => {
    const motion = createState({ pointerPercent: 10, dragPercent: 10 });
    const { container } = render(
      <SliderProvider
        value={{
          state: renderState,
          motion,
          getPointerValue: (percent) => percent,
          thumbRef: vi.fn(),
          thumbProps: { onKeyDown: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() },
          stateAttrMap: {},
          getAttrs: (state, value) => ({ 'aria-valuenow': state.dragging ? value.pointerValue : state.value }),
        }}
      >
        <SliderThumb />
      </SliderProvider>
    );
    const thumb = container.querySelector('[role="slider"], div') as HTMLElement;

    expect(thumb.getAttribute('aria-valuenow')).toBe('10');

    act(() => {
      motion.patch({ pointerPercent: 65, dragPercent: 65 });
      flush();
    });

    expect(thumb.getAttribute('aria-valuenow')).toBe('65');
  });
});
