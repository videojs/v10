import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SliderRoot } from '../slider-root';
import { SliderThumbnail } from '../slider-thumbnail';

const { mockSliderApi, mockThumbnailApi } = vi.hoisted(() => ({
  mockSliderApi: () => ({
    input: {
      current: {
        pointerPercent: 50,
        dragPercent: 0,
        dragging: false,
        pointing: true,
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
  mockThumbnailApi: () => ({
    loading: false,
    error: false,
    naturalWidth: 0,
    naturalHeight: 0,
    readConstraints: vi.fn(() => ({
      minWidth: 0,
      maxWidth: Infinity,
      minHeight: 0,
      maxHeight: Infinity,
    })),
    updateSrc: vi.fn(),
    connect: vi.fn(),
    destroy: vi.fn(),
  }),
}));

vi.mock('@videojs/core/dom', async (importOriginal) => {
  const orig: Record<string, unknown> = await importOriginal();
  return {
    ...orig,
    createSlider: vi.fn(mockSliderApi),
    createThumbnail: vi.fn(mockThumbnailApi),
  };
});

vi.mock('@videojs/store/react', () => ({
  useSnapshot: vi.fn((state: { current: unknown }) => state.current),
  useStore: vi.fn(),
}));

afterEach(cleanup);

describe('SliderThumbnail', () => {
  it('renders inside SliderRoot context', () => {
    const { container } = render(
      <SliderRoot>
        <SliderThumbnail data-testid="thumbnail" />
      </SliderRoot>
    );

    expect(container.querySelector('[data-testid="thumbnail"]')).toBeTruthy();
  });

  it('throws outside of SliderRoot', () => {
    expect(() => render(<SliderThumbnail />)).toThrow('Slider compound components must be used within a Slider.Root');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SliderRoot>
        <SliderThumbnail ref={ref} />
      </SliderRoot>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('renders a div with thumbnail ARIA attributes', () => {
    const { container } = render(
      <SliderRoot>
        <SliderThumbnail data-testid="thumbnail" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="thumbnail"]');
    expect(el?.tagName).toBe('DIV');
    expect(el?.getAttribute('role')).toBe('img');
    expect(el?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies data-hidden when no thumbnails are available', () => {
    const { container } = render(
      <SliderRoot>
        <SliderThumbnail data-testid="thumbnail" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="thumbnail"]');
    expect(el?.hasAttribute('data-hidden')).toBe(true);
  });

  it('renders an img child element', () => {
    const { container } = render(
      <SliderRoot>
        <SliderThumbnail data-testid="thumbnail" />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="thumbnail"]');
    const img = el?.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('aria-hidden')).toBe('true');
    expect(img?.getAttribute('decoding')).toBe('async');
  });

  it('accepts thumbnails prop', () => {
    const thumbnails = [
      { url: 'thumb-0.jpg', startTime: 0 },
      { url: 'thumb-5.jpg', startTime: 5 },
    ];

    const { container } = render(
      <SliderRoot>
        <SliderThumbnail data-testid="thumbnail" thumbnails={thumbnails} />
      </SliderRoot>
    );

    const el = container.querySelector('[data-testid="thumbnail"]');
    const img = el?.querySelector('img');

    // pointerPercent is 50 → pointerValue = 50 (generic slider, min=0, max=100).
    // findActiveThumbnail(thumbnails, 50) → 'thumb-5.jpg' (startTime 5 ≤ 50).
    expect(img?.getAttribute('src')).toBe('thumb-5.jpg');
  });

  it('forwards crossOrigin to inner img', () => {
    const { container } = render(
      <SliderRoot>
        <SliderThumbnail
          data-testid="thumbnail"
          crossOrigin="anonymous"
          thumbnails={[{ url: 'thumb.jpg', startTime: 0 }]}
        />
      </SliderRoot>
    );

    const img = container.querySelector('[data-testid="thumbnail"] img');
    expect(img?.getAttribute('crossorigin')).toBe('anonymous');
  });
});
