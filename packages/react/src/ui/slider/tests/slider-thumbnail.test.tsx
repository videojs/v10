import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { Slider } from '..';

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
      onKeyDownCapture: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    },
    adjustForAlignment: <S,>(state: S): S => state,
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
    disconnectImg: vi.fn(),
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

describe('Slider.Thumbnail', () => {
  it('renders a root and image inside slider context', () => {
    const { getByTestId } = render(
      <Slider.Root>
        <Slider.Thumbnail.Root data-testid="thumbnail">
          <Slider.Thumbnail.Image data-testid="image" />
        </Slider.Thumbnail.Root>
      </Slider.Root>
    );

    expect(getByTestId('thumbnail').tagName).toBe('DIV');
    expect(getByTestId('image').tagName).toBe('IMG');
  });

  it('requires the root to be inside Slider.Root', () => {
    expect(() =>
      render(
        <Slider.Thumbnail.Root>
          <Slider.Thumbnail.Image />
        </Slider.Thumbnail.Root>
      )
    ).toThrow('Slider compound components must be used within a Slider.Root');
  });

  it('requires the image to be inside Slider.Thumbnail.Root', () => {
    expect(() =>
      render(
        <Slider.Root>
          <Slider.Thumbnail.Image />
        </Slider.Root>
      )
    ).toThrow('Thumbnail compound components must be used within a Thumbnail.Root');
  });

  it('forwards root and image refs', () => {
    const ref = createRef<HTMLDivElement>();
    const imgRef = createRef<HTMLImageElement>();

    render(
      <Slider.Root>
        <Slider.Thumbnail.Root ref={ref}>
          <Slider.Thumbnail.Image ref={imgRef} />
        </Slider.Thumbnail.Root>
      </Slider.Root>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(imgRef.current).toBeInstanceOf(HTMLImageElement);
  });

  it('renders a div with thumbnail ARIA attributes', () => {
    const { getByTestId } = render(
      <Slider.Root>
        <Slider.Thumbnail.Root data-testid="thumbnail">
          <Slider.Thumbnail.Image />
        </Slider.Thumbnail.Root>
      </Slider.Root>
    );

    const el = getByTestId('thumbnail');

    expect(el.tagName).toBe('DIV');
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies data-hidden when no thumbnails are available', () => {
    const { getByTestId } = render(
      <Slider.Root>
        <Slider.Thumbnail.Root data-testid="thumbnail">
          <Slider.Thumbnail.Image data-testid="image" />
        </Slider.Thumbnail.Root>
      </Slider.Root>
    );

    expect(getByTestId('thumbnail').hasAttribute('data-hidden')).toBe(true);
    expect(getByTestId('image').hasAttribute('data-hidden')).toBe(false);
    expect(getByTestId('image').getAttribute('aria-hidden')).toBe('true');
    expect(getByTestId('image').getAttribute('decoding')).toBe('async');
  });

  it('selects the thumbnail at the slider pointer', () => {
    const thumbnails = [
      { url: 'thumb-0.jpg', startTime: 0 },
      { url: 'thumb-5.jpg', startTime: 5 },
    ];

    const { getByTestId } = render(
      <Slider.Root>
        <Slider.Thumbnail.Root thumbnails={thumbnails}>
          <Slider.Thumbnail.Image data-testid="image" />
        </Slider.Thumbnail.Root>
      </Slider.Root>
    );

    // pointerPercent is 50 → pointerValue = 50 (generic slider, min=0, max=100).
    // findActiveThumbnail(thumbnails, 50) → 'thumb-5.jpg' (startTime 5 ≤ 50).
    expect(getByTestId('image').getAttribute('src')).toBe('thumb-5.jpg');
  });

  it('keeps image props on Slider.Thumbnail.Image', () => {
    const { getByTestId } = render(
      <Slider.Root>
        <Slider.Thumbnail.Root thumbnails={[{ url: 'thumb.jpg', startTime: 0 }]}>
          <Slider.Thumbnail.Image data-testid="image" crossOrigin="anonymous" loading="eager" />
        </Slider.Thumbnail.Root>
      </Slider.Root>
    );

    expect(getByTestId('image').getAttribute('crossorigin')).toBe('anonymous');
    expect(getByTestId('image').getAttribute('loading')).toBe('eager');
  });
});
