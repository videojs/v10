import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeAll, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { SliderBuffer } from '../slider-buffer';
import { SliderFill } from '../slider-fill';
import { SliderRoot } from '../slider-root';
import { SliderThumb } from '../slider-thumb';
import { SliderTrack } from '../slider-track';
import { SliderValue } from '../slider-value';

const resizeObservers: { callback: ResizeObserverCallback }[] = [];

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      resizeObservers.push(this);
    }

    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});

const { mockSliderApi, mockSliderInput, sliderInputListeners, sliderOptionsRef } = vi.hoisted(() => {
  const sliderOptionsRef: {
    current:
      | {
          onDragStart?: () => void;
          onDragEnd?: () => void;
        }
      | undefined;
  } = { current: undefined };
  const sliderInputListeners = new Set<() => void>();
  const mockSliderInput = {
    pointerPercent: 0,
    dragPercent: 0,
    dragging: false,
    pointing: false,
    focused: false,
  };

  return {
    mockSliderInput,
    sliderInputListeners,
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
          current: mockSliderInput,
          subscribe: vi.fn((callback: () => void) => {
            sliderInputListeners.add(callback);
            return () => sliderInputListeners.delete(callback);
          }),
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

afterEach(() => {
  cleanup();
  resizeObservers.length = 0;
  sliderInputListeners.clear();
  Object.assign(mockSliderInput, {
    pointerPercent: 0,
    dragPercent: 0,
    dragging: false,
    pointing: false,
    focused: false,
  });
});

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

  it('exposes semantic render state without pointer motion', () => {
    const renderState = vi.fn();
    render(
      <SliderRoot
        value={50}
        className={(state) => {
          expectTypeOf(state).toEqualTypeOf<SliderRoot.State>();
          // @ts-expect-error Pointer motion requires useSliderMotion().
          state.pointerPercent;
          renderState(state);
          return undefined;
        }}
      />
    );

    expect(renderState).toHaveBeenCalledWith(expect.objectContaining({ value: 50, fillPercent: 50, dragging: false }));
    expect(renderState.mock.calls[0]?.[0]).not.toHaveProperty('pointerPercent');
    expect(renderState.mock.calls[0]?.[0]).not.toHaveProperty('dragPercent');
  });

  it('imperatively binds pointer motion without rewriting React-owned fill', () => {
    const { container } = render(<SliderRoot value={50} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('50.000%');
    expect(root.style.getPropertyValue('--media-slider-pointer')).toBe('0.000%');

    act(() => {
      mockSliderInput.pointerPercent = 75;
      for (const listener of sliderInputListeners) listener();
    });

    expect(root.style.getPropertyValue('--media-slider-pointer')).toBe('75.000%');
    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('50.000%');
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
    const { container } = render(
      <SliderRoot value={0} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );

    const root = container.firstElementChild as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;

    // Mock DOM measurements (jsdom reports 0 for all dimensions).
    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(thumb, 'offsetWidth', { value: 20, configurable: true });

    act(() => {
      const observer = resizeObservers.at(-1)!;
      observer.callback([], observer as unknown as ResizeObserver);
    });

    // thumbHalf = (20/200 * 100) / 2 = 5%.  Adjusted 0% → 5%.
    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('5.000%');
  });

  it('adjusts CSS vars at max value for edge alignment', () => {
    const { container } = render(
      <SliderRoot value={100} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );

    const root = container.firstElementChild as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;

    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(thumb, 'offsetWidth', { value: 20, configurable: true });

    act(() => {
      const observer = resizeObservers.at(-1)!;
      observer.callback([], observer as unknown as ResizeObserver);
    });

    // thumbHalf = 5%.  Adjusted 100% → 95%.
    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('95.000%');
  });

  it('updates edge alignment when the root or thumb resizes', () => {
    const { container } = render(
      <SliderRoot value={0} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );
    const root = container.firstElementChild as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;

    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(thumb, 'offsetWidth', { value: 20, configurable: true });

    act(() => {
      const observer = resizeObservers.at(-1)!;
      observer.callback([], observer as unknown as ResizeObserver);
    });
    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('5.000%');

    Object.defineProperty(root, 'offsetWidth', { value: 100, configurable: true });
    act(() => {
      const observer = resizeObservers.at(-1)!;
      observer.callback([], observer as unknown as ResizeObserver);
    });
    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('10.000%');
  });

  it('updates pointer alignment when alignment props change', () => {
    const { container, rerender } = render(
      <SliderRoot value={0} thumbAlignment="center">
        <SliderThumb />
      </SliderRoot>
    );
    const root = container.firstElementChild as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;

    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(thumb, 'offsetWidth', { value: 20, configurable: true });
    expect(resizeObservers).toHaveLength(0);
    expect(root.style.getPropertyValue('--media-slider-pointer')).toBe('0.000%');

    rerender(
      <SliderRoot value={0} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );
    expect(resizeObservers).toHaveLength(1);
    expect(root.style.getPropertyValue('--media-slider-pointer')).toBe('5.000%');
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
