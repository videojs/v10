import { cleanup, fireEvent, render } from '@testing-library/react';
import { createRef, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createPlayerWrapper, MockErrorBoundary } from '../../../testing/mocks';
import { SliderBuffer } from '../slider-buffer';
import { SliderFill } from '../slider-fill';
import { SliderRoot } from '../slider-root';
import { SliderThumb } from '../slider-thumb';
import { SliderTrack } from '../slider-track';
import { SliderValue } from '../slider-value';

const { mockSliderApi, sliderOptionsRef, sliderInputRef } = vi.hoisted(() => {
  interface MockSliderOptions {
    getElement?: () => HTMLElement;
    getThumbElement?: () => HTMLElement | null;
    isDisabled?: () => boolean;
    getPercent?: () => number;
    adjustPercent?: (raw: number, thumb: number, track: number) => number;
    onValueChange?: (percent: number) => void;
    onValueCommit?: (percent: number) => void;
    onPressStart?: () => void;
    onPressEnd?: () => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
  }

  interface MockSliderInput {
    pointerPercent: number;
    dragPercent: number;
    dragging: boolean;
    pointing: boolean;
    focused: boolean;
  }

  const sliderOptionsRef: { current: MockSliderOptions | undefined } = { current: undefined };
  const sliderInputRef: { current: MockSliderInput | undefined } = { current: undefined };

  return {
    sliderOptionsRef,
    sliderInputRef,
    mockSliderApi: (options?: MockSliderOptions) => {
      const input: MockSliderInput = {
        pointerPercent: 0,
        dragPercent: 0,
        dragging: false,
        pointing: false,
        focused: false,
      };

      sliderOptionsRef.current = options;
      sliderInputRef.current = input;

      return {
        input: {
          current: input,
          subscribe: vi.fn(() => vi.fn()),
        },
        rootProps: {
          onPointerDown: vi.fn(),
          onPointerMove: vi.fn(),
          onPointerLeave: vi.fn(),
        },
        thumbProps: {
          onKeyDownCapture: (event: { preventDefault(): void }) => event.preventDefault(),
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

function Throw(): null {
  throw new Error('abandon render');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

  it('holds a controls visibility lock for the duration of a press', () => {
    const releaseControlsLock = vi.fn();
    const requestControlsLock = vi.fn(() => releaseControlsLock);
    const { Wrapper } = createPlayerWrapper({
      userActive: true,
      controlsVisible: true,
      requestControlsLock,
      toggleControls: vi.fn(),
    });

    render(<SliderRoot />, { wrapper: Wrapper });

    sliderOptionsRef.current?.onPressStart?.();
    expect(requestControlsLock).toHaveBeenCalledTimes(1);
    expect(releaseControlsLock).not.toHaveBeenCalled();

    sliderOptionsRef.current?.onPressEnd?.();
    expect(releaseControlsLock).toHaveBeenCalledTimes(1);
  });

  it('keeps holding the controls lock across re-renders during a press', () => {
    const releaseControlsLock = vi.fn();
    const requestControlsLock = vi.fn(() => releaseControlsLock);
    const { Wrapper } = createPlayerWrapper({
      userActive: true,
      controlsVisible: true,
      requestControlsLock,
      toggleControls: vi.fn(),
    });

    const { rerender } = render(<SliderRoot value={10} />, { wrapper: Wrapper });

    sliderOptionsRef.current?.onPressStart?.();
    rerender(<SliderRoot value={20} />);

    expect(requestControlsLock).toHaveBeenCalledTimes(1);
    expect(releaseControlsLock).not.toHaveBeenCalled();

    sliderOptionsRef.current?.onPressEnd?.();
    expect(releaseControlsLock).toHaveBeenCalledTimes(1);
  });

  it('maps value callbacks and thumb ARIA through the latest committed props while dragging', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container, rerender } = render(
      <SliderRoot value={50} max={100} onValueChange={onValueChange} onValueCommit={onValueCommit}>
        <SliderThumb data-testid="thumb" />
      </SliderRoot>
    );

    Object.assign(sliderInputRef.current!, { dragging: true, pointerPercent: 75, dragPercent: 75 });
    rerender(
      <SliderRoot value={150} max={200} onValueChange={onValueChange} onValueCommit={onValueCommit}>
        <SliderThumb data-testid="thumb" />
      </SliderRoot>
    );

    const root = container.firstElementChild as HTMLElement;
    const thumb = container.querySelector('[data-testid="thumb"]');

    expect(root.hasAttribute('data-dragging')).toBe(true);
    expect(thumb?.getAttribute('aria-valuenow')).toBe('150');
    expect(thumb?.getAttribute('aria-valuemax')).toBe('200');

    sliderOptionsRef.current?.onValueChange?.(75);
    sliderOptionsRef.current?.onValueCommit?.(75);

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(150);
    expect(onValueCommit).toHaveBeenCalledExactlyOnceWith(150);
  });

  it('keeps the committed projection when a re-render is abandoned', () => {
    const committed = vi.fn();
    const abandoned = vi.fn();

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <MockErrorBoundary>
        <SliderRoot value={50} max={100} onValueChange={committed} />
      </MockErrorBoundary>
    );

    rerender(
      <MockErrorBoundary>
        <SliderRoot value={50} max={200} disabled onValueChange={abandoned} />
        <Throw />
      </MockErrorBoundary>
    );

    // The retained slider outlives the abandoned render and must still project the committed props.
    expect(sliderOptionsRef.current?.getPercent?.()).toBe(50);
    expect(sliderOptionsRef.current?.isDisabled?.()).toBe(false);

    sliderOptionsRef.current?.onValueChange?.(50);

    expect(committed).toHaveBeenCalledExactlyOnceWith(50);
    expect(abandoned).not.toHaveBeenCalled();
  });

  it('projects the latest committed props under StrictMode', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { container, rerender } = render(
      <StrictMode>
        <SliderRoot value={50} max={100} onValueChange={first}>
          <SliderThumb data-testid="thumb" />
        </SliderRoot>
      </StrictMode>
    );

    rerender(
      <StrictMode>
        <SliderRoot value={50} max={200} onValueChange={second}>
          <SliderThumb data-testid="thumb" />
        </SliderRoot>
      </StrictMode>
    );

    const root = container.firstElementChild as HTMLElement;
    const thumb = container.querySelector('[data-testid="thumb"]');

    expect(thumb?.getAttribute('aria-valuemax')).toBe('200');
    expect(root.style.getPropertyValue('--media-slider-fill')).toBe('25.000%');
    expect(sliderOptionsRef.current?.getPercent?.()).toBe(25);

    sliderOptionsRef.current?.onValueChange?.(50);

    expect(second).toHaveBeenCalledExactlyOnceWith(100);
    expect(first).not.toHaveBeenCalled();
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

  it('handles keydown before native ancestor listeners', () => {
    const { container } = render(
      <SliderRoot>
        <SliderThumb data-testid="thumb" />
      </SliderRoot>
    );
    const root = container.firstElementChild!;
    const thumb = container.querySelector('[data-testid="thumb"]')!;
    const onKeyDown = vi.fn((event: Event) => event.defaultPrevented);

    root.addEventListener('keydown', onKeyDown);
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });

    expect(onKeyDown).toHaveReturnedWith(true);
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

  it('applies edge alignment in the same commit that switches alignment on', () => {
    const { container, rerender } = render(
      <SliderRoot value={0}>
        <SliderThumb />
      </SliderRoot>
    );

    const root = container.firstElementChild as HTMLElement;
    const thumb = root.querySelector('[role="slider"]') as HTMLElement;

    Object.defineProperty(root, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(thumb, 'offsetWidth', { value: 20, configurable: true });

    rerender(
      <SliderRoot value={0} thumbAlignment="edge">
        <SliderThumb />
      </SliderRoot>
    );

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
