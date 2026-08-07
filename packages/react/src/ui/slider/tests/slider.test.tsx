import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { SliderBuffer } from '../slider-buffer';
import { SliderFill } from '../slider-fill';
import { SliderRoot } from '../slider-root';
import { SliderSegments } from '../slider-segments';
import { SliderThumb } from '../slider-thumb';
import { SliderTrack } from '../slider-track';
import { SliderValue } from '../slider-value';

const { mockSliderApi, sliderOptionsRef } = vi.hoisted(() => {
  const sliderOptionsRef: {
    current:
      | {
          onDragStart?: () => void;
          onDragEnd?: () => void;
        }
      | undefined;
  } = { current: undefined };

  return {
    sliderOptionsRef,
    mockSliderApi: (options?: {
      getElement?: () => HTMLElement;
      getThumbElement?: () => HTMLElement | null;
      adjustPercent?: (raw: number, thumb: number, track: number) => number;
      onDragStart?: () => void;
      onDragEnd?: () => void;
    }) => {
      sliderOptionsRef.current = options;

      return {
        input: {
          current: {
            pointerPercent: 0,
            dragPercent: 0,
            dragging: false,
            pointing: false,
            focused: false,
          },
          subscribe: vi.fn(() => vi.fn()),
        },
        rootProps: {
          onPointerDown: vi.fn(),
          onPointerMove: vi.fn(),
          onPointerLeave: vi.fn(),
        },
        thumbProps: {
          onKeyDown: vi.fn(),
          onFocus: vi.fn(),
          onBlur: vi.fn(),
        },
        adjustForAlignment<
          S extends { thumbAlignment?: string; orientation?: string; fillPercent: number; pointerPercent: number },
        >(state: S): S {
          if (!options?.adjustPercent || state.thumbAlignment !== 'edge') return state;
          const thumbEl = options.getThumbElement?.();
          if (!thumbEl) return state;
          const rootEl = options.getElement!();
          const isHorizontal = state.orientation === 'horizontal';
          const thumbSize = isHorizontal ? thumbEl.offsetWidth : thumbEl.offsetHeight;
          const trackSize = isHorizontal ? rootEl.offsetWidth : rootEl.offsetHeight;
          return {
            ...state,
            fillPercent: options.adjustPercent(state.fillPercent, thumbSize, trackSize),
            pointerPercent: options.adjustPercent(state.pointerPercent, thumbSize, trackSize),
          };
        },
        destroy: vi.fn(),
      };
    },
  };
});

vi.mock('@videojs/core/dom', async (importOriginal) => {
  const orig: Record<string, unknown> = await importOriginal();
  return { ...orig, createSlider: vi.fn(mockSliderApi) };
});

vi.mock('@videojs/store/react', () => ({
  useSnapshot: vi.fn((state: { current: unknown }) => state.current),
  useStore: vi.fn((store: { state: object }, selector?: (state: object) => unknown) =>
    selector ? selector(store.state) : store
  ),
}));

afterEach(cleanup);

describe('SliderRoot', () => {
  it('renders a div element', () => {
    const { container } = render(<SliderRoot />);
    const el = container.firstElementChild;

    expect(el).toBeTruthy();
    expect(el?.tagName).toBe('DIV');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<SliderRoot ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('spreads additional props onto the root element', () => {
    const { container } = render(<SliderRoot data-testid="slider" />);
    const el = container.firstElementChild;

    expect(el?.getAttribute('data-testid')).toBe('slider');
  });

  it('sets data-orientation attribute', () => {
    const { container } = render(<SliderRoot orientation="horizontal" />);
    const el = container.firstElementChild;

    expect(el?.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('sets CSS custom properties as inline styles', () => {
    const { container } = render(<SliderRoot value={50} />);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.getPropertyValue('--media-slider-fill')).toBeTruthy();
    expect(el.style.getPropertyValue('--media-slider-pointer')).toBeTruthy();
  });

  it('holds a controls visibility lock for the duration of a drag', () => {
    const releaseControlsLock = vi.fn();
    const requestControlsLock = vi.fn(() => releaseControlsLock);
    const { Wrapper } = createPlayerWrapper({
      userActive: true,
      controlsVisible: true,
      requestControlsLock,
      toggleControls: vi.fn(),
    });

    render(<SliderRoot />, { wrapper: Wrapper });

    sliderOptionsRef.current?.onDragStart?.();
    expect(requestControlsLock).toHaveBeenCalledTimes(1);
    expect(releaseControlsLock).not.toHaveBeenCalled();

    sliderOptionsRef.current?.onDragEnd?.();
    expect(releaseControlsLock).toHaveBeenCalledTimes(1);
  });
});

describe('SliderTrack', () => {
  it('renders inside SliderRoot context', () => {
    const { container } = render(
      <SliderRoot>
        <SliderTrack data-testid="track" />
      </SliderRoot>
    );

    expect(container.querySelector('[data-testid="track"]')).toBeTruthy();
  });

  it('throws outside of SliderRoot', () => {
    expect(() => render(<SliderTrack />)).toThrow('Slider compound components must be used within a Slider.Root');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SliderRoot>
        <SliderTrack ref={ref} />
      </SliderRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('SliderSegments', () => {
  it('renders ranges from the slider value domain', () => {
    const { container } = render(
      <SliderRoot min={20} max={100}>
        <SliderSegments
          data-testid="segments"
          data-segments="custom"
          segments={[
            { start: 20, end: 40 },
            { start: 40, end: 100 },
          ]}
        />
      </SliderRoot>
    );

    const element = container.querySelector('[data-testid="segments"]');
    const clipPath = element?.querySelector('[data-slot="slider-segments-clip-path"]');
    const rects = element?.querySelectorAll('[data-slot="slider-segment"]') ?? [];
    expect(element?.getAttribute('data-segments')).toBe('custom');
    expect(clipPath).toBeTruthy();
    expect(rects).toHaveLength(2);
    expect(rects[0]?.getAttribute('style')).toContain('--media-slider-segment-size: 25%');
    expect(rects[0]?.getAttribute('style')).toContain('--media-slider-segment-offset: 0%');
    expect(rects[1]?.getAttribute('style')).toContain('--media-slider-segment-size: 75%');
    expect(rects[1]?.getAttribute('style')).toContain('--media-slider-segment-offset: 25%');
    expect(rects[0]?.hasAttribute('data-highlighted')).toBe(false);
    expect(rects[1]?.hasAttribute('data-highlighted')).toBe(false);
  });

  it('uses the slider orientation and clip path ID', () => {
    const { container } = render(
      <SliderRoot orientation="vertical" data-testid="root">
        <SliderSegments data-testid="segments" segments={[{ start: 0, end: 25 }]} />
      </SliderRoot>
    );

    const root = container.querySelector('[data-testid="root"]') as HTMLElement;
    const segments = container.querySelector('[data-testid="segments"]');
    const clipPath = segments?.querySelector('clipPath');

    expect(segments?.getAttribute('data-orientation')).toBe('vertical');
    expect(root.style.getPropertyValue('--media-slider-clip-path')).toBe(`url("#${clipPath?.id}")`);
  });

  it('only sets the track clip path while rendering ranges', () => {
    const { container, rerender } = render(<SliderRoot data-testid="root" />);
    const root = container.querySelector('[data-testid="root"]') as HTMLElement;

    expect(root.style.getPropertyValue('--media-slider-clip-path')).toBe('');

    rerender(
      <SliderRoot data-testid="root">
        <SliderSegments segments={[{ start: 0, end: 25 }]} />
      </SliderRoot>
    );
    expect(root.style.getPropertyValue('--media-slider-clip-path')).not.toBe('');

    rerender(<SliderRoot data-testid="root" />);
    expect(root.style.getPropertyValue('--media-slider-clip-path')).toBe('');
  });
});

describe('SliderFill', () => {
  it('renders inside SliderRoot context', () => {
    const { container } = render(
      <SliderRoot>
        <SliderFill data-testid="fill" />
      </SliderRoot>
    );

    expect(container.querySelector('[data-testid="fill"]')).toBeTruthy();
  });

  it('throws outside of SliderRoot', () => {
    expect(() => render(<SliderFill />)).toThrow('Slider compound components must be used within a Slider.Root');
  });
});

describe('SliderBuffer', () => {
  it('renders inside SliderRoot context', () => {
    const { container } = render(
      <SliderRoot>
        <SliderBuffer data-testid="buffer" />
      </SliderRoot>
    );

    expect(container.querySelector('[data-testid="buffer"]')).toBeTruthy();
  });

  it('throws outside of SliderRoot', () => {
    expect(() => render(<SliderBuffer />)).toThrow('Slider compound components must be used within a Slider.Root');
  });
});

describe('SliderThumb', () => {
  it('renders inside SliderRoot context', () => {
    const { container } = render(
      <SliderRoot>
        <SliderThumb data-testid="thumb" />
      </SliderRoot>
    );

    expect(container.querySelector('[data-testid="thumb"]')).toBeTruthy();
  });

  it('throws outside of SliderRoot', () => {
    expect(() => render(<SliderThumb />)).toThrow('Slider compound components must be used within a Slider.Root');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SliderRoot>
        <SliderThumb ref={ref} />
      </SliderRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('applies ARIA attributes from core', () => {
    const { container } = render(
      <SliderRoot>
        <SliderThumb data-testid="thumb" />
      </SliderRoot>
    );

    const thumb = container.querySelector('[data-testid="thumb"]');
    expect(thumb?.getAttribute('role')).toBe('slider');
  });
});

describe('SliderValue', () => {
  it('renders an output element', () => {
    const { container } = render(
      <SliderRoot>
        <SliderValue data-testid="value" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="value"]');
    expect(el?.tagName).toBe('OUTPUT');
  });

  it('throws outside of SliderRoot', () => {
    expect(() => render(<SliderValue />)).toThrow('Slider compound components must be used within a Slider.Root');
  });

  it('displays rounded value by default', () => {
    const { container } = render(
      <SliderRoot value={42}>
        <SliderValue />
      </SliderRoot>
    );

    const output = container.querySelector('output');
    expect(output?.textContent).toBe('42');
  });

  it('accepts a custom format function', () => {
    const format = (v: number) => `${v}%`;
    const { container } = render(
      <SliderRoot value={75}>
        <SliderValue format={format} />
      </SliderRoot>
    );

    const output = container.querySelector('output');
    expect(output?.textContent).toBe('75%');
  });

  it('sets aria-live to off', () => {
    const { container } = render(
      <SliderRoot>
        <SliderValue />
      </SliderRoot>
    );

    const output = container.querySelector('output');
    expect(output?.getAttribute('aria-live')).toBe('off');
  });
});

describe('thumbAlignment', () => {
  it('does not adjust CSS vars for center alignment (default)', () => {
    const { container } = render(<SliderRoot value={0} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('0.000%');
  });

  it('adjusts CSS vars for edge alignment', () => {
    const { container, rerender } = render(
      <SliderRoot value={0} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );

    const root = container.firstElementChild as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;

    // Mock DOM measurements (jsdom reports 0 for all dimensions).
    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(thumb, 'offsetWidth', { value: 20, configurable: true });

    // Re-render so the root reads the now-available element measurements.
    rerender(
      <SliderRoot value={0} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );

    // thumbHalf = (20/200 * 100) / 2 = 5%.  Adjusted 0% → 5%.
    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('5.000%');
  });

  it('adjusts CSS vars at max value for edge alignment', () => {
    const { container, rerender } = render(
      <SliderRoot value={100} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );

    const root = container.firstElementChild as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;

    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(thumb, 'offsetWidth', { value: 20, configurable: true });

    rerender(
      <SliderRoot value={100} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );

    // thumbHalf = 5%.  Adjusted 100% → 95%.
    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('95.000%');
  });
});

describe('Slider compound', () => {
  it('renders all parts together', () => {
    const { container } = render(
      <SliderRoot data-testid="root">
        <SliderTrack data-testid="track">
          <SliderFill data-testid="fill" />
          <SliderBuffer data-testid="buffer" />
          <SliderThumb data-testid="thumb" />
        </SliderTrack>
        <SliderValue data-testid="value" />
      </SliderRoot>
    );

    expect(container.querySelector('[data-testid="root"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="track"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="fill"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="buffer"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="thumb"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="value"]')).toBeTruthy();
  });
});
