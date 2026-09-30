import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { Slider } from '..';
import { measureSlider, pointer } from './support';

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

    const image = getByTestId('image');

    expect(image.getAttribute('src')).toBe('thumb-0.jpg');
    const root = image.closest('[data-orientation]') as HTMLElement;

    measureSlider(root);
    pointer(root, 'pointermove', 100, 0);
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
