import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SliderPreview } from '../slider-preview';
import { SliderRoot } from '../slider-root';

// jsdom doesn't provide ResizeObserver.
beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});

const { mockSliderApi } = vi.hoisted(() => ({
  mockSliderApi: () => ({
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
    destroy: vi.fn(),
  }),
}));

vi.mock('@videojs/core/dom', async (importOriginal) => {
  const orig: Record<string, unknown> = await importOriginal();
  return { ...orig, createSlider: vi.fn(mockSliderApi) };
});

vi.mock('@videojs/store/react', () => ({
  useSnapshot: vi.fn((state: { current: unknown }) => state.current),
  useStore: vi.fn(),
}));

afterEach(cleanup);

describe('SliderPreview', () => {
  it('renders a div element inside SliderRoot context', () => {
    const { container } = render(
      <SliderRoot>
        <SliderPreview data-testid="preview" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="preview"]');
    expect(el).toBeTruthy();
    expect(el?.tagName).toBe('DIV');
  });

  it('throws outside of SliderRoot', () => {
    expect(() => render(<SliderPreview />)).toThrow('Slider compound components must be used within a Slider.Root');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SliderRoot>
        <SliderPreview ref={ref} />
      </SliderRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('sets structural positioning styles', () => {
    const { container } = render(
      <SliderRoot>
        <SliderPreview data-testid="preview" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="preview"]') as HTMLElement;
    expect(el.style.position).toBe('absolute');
    expect(el.style.pointerEvents).toBe('none');
    expect(el.style.width).toBe('max-content');
  });

  it('applies clamped left style by default', () => {
    const { container } = render(
      <SliderRoot>
        <SliderPreview data-testid="preview" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="preview"]') as HTMLElement;
    // Before ResizeObserver fires, width is 0 so halfWidth is 0
    expect(el.style.left).toContain('min(');
    expect(el.style.left).toContain('max(');
  });

  it('applies unclamped left style when overflow is visible', () => {
    const { container } = render(
      <SliderRoot>
        <SliderPreview data-testid="preview" overflow="visible" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="preview"]') as HTMLElement;
    expect(el.style.left).toContain('calc(var(--media-slider-pointer)');
    expect(el.style.left).not.toContain('min(');
  });

  it('propagates data attributes from slider state', () => {
    const { container } = render(
      <SliderRoot orientation="horizontal">
        <SliderPreview data-testid="preview" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="preview"]');
    expect(el?.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('spreads additional props onto the element', () => {
    const { container } = render(
      <SliderRoot>
        <SliderPreview aria-label="Preview" />
      </SliderRoot>
    );

    const el = container.querySelector('[aria-label="Preview"]');
    expect(el).toBeTruthy();
  });

  it('renders children', () => {
    const { container } = render(
      <SliderRoot>
        <SliderPreview>
          <span data-testid="child">Preview content</span>
        </SliderPreview>
      </SliderRoot>
    );

    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  it('accepts className as a function of state', () => {
    const { container } = render(
      <SliderRoot>
        <SliderPreview data-testid="preview" className={(state) => (state.interactive ? 'active' : 'idle')} />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="preview"]');
    expect(el?.className).toContain('idle');
  });

  it('accepts style as a function of state', () => {
    const { container } = render(
      <SliderRoot>
        <SliderPreview data-testid="preview" style={() => ({ opacity: 0.5 })} />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="preview"]') as HTMLElement;
    expect(el.style.opacity).toBe('0.5');
  });

  it('renders within compound slider with all parts', () => {
    const { container } = render(
      <SliderRoot data-testid="root">
        <SliderPreview data-testid="preview">
          <span>Time value</span>
        </SliderPreview>
      </SliderRoot>
    );

    expect(container.querySelector('[data-testid="root"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="preview"]')).toBeTruthy();
  });
});
